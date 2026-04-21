import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { scoreFinding, type QualityScore } from './scorer.js'

const OPENSEABRI_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const RESEARCH_DIR = resolve(OPENSEABRI_ROOT, 'openseabri', 'research')
const FINDINGS_DIR = resolve(OPENSEABRI_ROOT, 'openseabri', 'research', 'findings')
const DISCARDED_DIR = resolve(OPENSEABRI_ROOT, 'openseabri', 'research', 'discarded')
const PROGRAM_FILE = resolve(RESEARCH_DIR, 'program.md')

const OVERNIGHT_BUDGET_MS = 8 * 60 * 60 * 1000   // 8 hours
const EXPERIMENT_BUDGET_MS = 15 * 60 * 1000        // 15 min per experiment
const QUALITY_THRESHOLD = 6.0

export interface Experiment {
  id: string
  topic: string
  section: string
  startedAt: number
  completedAt?: number
  finding?: string
  score?: QualityScore
  kept: boolean
}

export interface OvernightReport {
  date: string
  totalExperiments: number
  kept: number
  discarded: number
  avgQuality: number
  topFindings: Array<{ topic: string; score: number; excerpt: string }>
  strategyNotes: string[]
}

async function readProgram(): Promise<string> {
  try {
    return await readFile(PROGRAM_FILE, 'utf-8')
  } catch {
    return ''
  }
}

function extractTopics(programContent: string): Array<{ topic: string; section: string }> {
  const topics: Array<{ topic: string; section: string }> = []
  const lines = programContent.split('\n')
  let currentSection = 'General'

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim()
    } else if (line.startsWith('- **') || line.startsWith('- ')) {
      const match = line.match(/- \*?\*?([^*\n]+)\*?\*?/)
      if (match) {
        const topic = match[1].trim()
        if (topic && !topic.startsWith('**') && topic.length > 3) {
          topics.push({ topic, section: currentSection })
        }
      }
    }
  }

  return topics
}

async function runExperiment(
  topic: string,
  section: string,
  apiKey: string,
  model: string
): Promise<Experiment> {
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const experiment: Experiment = {
    id,
    topic,
    section,
    startedAt: Date.now(),
    kept: false,
  }

  try {
    const prompt = `You are a sustainability research agent. Research the following topic and provide a detailed finding.

Topic: ${topic}
Section: ${section}

Provide:
1. Key finding (2-3 sentences, factual and specific)
2. Data sources or evidence
3. Practical implications
4. Confidence level (high/medium/low) and why

Be specific with numbers, dates, and named sources where possible.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      experiment.completedAt = Date.now()
      return experiment
    }

    const data = (await response.json()) as { content: Array<{ type: string; text: string }> }
    const textBlock = data.content.find((c) => c.type === 'text')
    if (!textBlock) {
      experiment.completedAt = Date.now()
      return experiment
    }

    experiment.finding = textBlock.text
    experiment.completedAt = Date.now()

    const score = await scoreFinding(topic, [textBlock.text], section)
    experiment.score = score
    experiment.kept = score.keep
  } catch {
    experiment.completedAt = Date.now()
  }

  return experiment
}

async function saveFinding(experiment: Experiment): Promise<void> {
  const date = new Date().toISOString().split('T')[0]
  const slug = experiment.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
  const filename = `${date}-${slug}.md`

  const content = `# ${experiment.topic}

**Section**: ${experiment.section}
**Date**: ${date}
**Quality Score**: ${experiment.score?.overall.toFixed(1) ?? 'N/A'} / 10
**Kept**: ${experiment.kept ? 'Yes' : 'No'}

## Finding

${experiment.finding ?? 'No finding recorded.'}

## Scores

- Relevance: ${experiment.score?.relevance ?? 'N/A'} / 10
- Source Quality: ${experiment.score?.sourceQuality ?? 'N/A'} / 10
- Actionability: ${experiment.score?.actionability ?? 'N/A'} / 10
- Reason: ${experiment.score?.reason ?? 'N/A'}
`

  if (experiment.kept) {
    await mkdir(FINDINGS_DIR, { recursive: true })
    await writeFile(resolve(FINDINGS_DIR, filename), content, 'utf-8')
  } else {
    await mkdir(DISCARDED_DIR, { recursive: true })
    await writeFile(resolve(DISCARDED_DIR, filename), content, 'utf-8')
  }
}

async function appendStrategyNote(notes: string[]): Promise<void> {
  if (notes.length === 0) return

  try {
    const existing = await readFile(PROGRAM_FILE, 'utf-8')
    const date = new Date().toISOString().split('T')[0]
    const noteBlock = `\n\n---\n\n## Strategy Notes — ${date}\n\n${notes.map((n) => `- ${n}`).join('\n')}\n`

    await writeFile(PROGRAM_FILE, existing + noteBlock, 'utf-8')
  } catch {
    // Non-fatal
  }
}

async function generateReport(experiments: Experiment[]): Promise<OvernightReport> {
  const date = new Date().toISOString().split('T')[0]
  const kept = experiments.filter((e) => e.kept)
  const discarded = experiments.filter((e) => !e.kept)
  const scored = experiments.filter((e) => e.score)
  const avgQuality = scored.length > 0
    ? scored.reduce((sum, e) => sum + (e.score?.overall ?? 0), 0) / scored.length
    : 0

  const topFindings = kept
    .sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0))
    .slice(0, 5)
    .map((e) => ({
      topic: e.topic,
      score: e.score?.overall ?? 0,
      excerpt: (e.finding ?? '').slice(0, 200),
    }))

  const strategyNotes: string[] = []
  if (avgQuality < 5) {
    strategyNotes.push('Average quality was low — consider more specific topic framing')
  }
  if (kept.length === 0) {
    strategyNotes.push('No findings met the quality threshold — review program.md topics for specificity')
  }
  if (kept.length > discarded.length) {
    strategyNotes.push('High keep rate — this section is yielding quality results, expand coverage')
  }

  return {
    date,
    totalExperiments: experiments.length,
    kept: kept.length,
    discarded: discarded.length,
    avgQuality,
    topFindings,
    strategyNotes,
  }
}

async function saveReport(report: OvernightReport): Promise<string> {
  const reportDir = resolve(RESEARCH_DIR, 'reports')
  await mkdir(reportDir, { recursive: true })
  const filename = `${report.date}-overnight-report.md`
  const filepath = resolve(reportDir, filename)

  const content = `# Overnight Research Report — ${report.date}

## Summary

- **Total Experiments**: ${report.totalExperiments}
- **Kept**: ${report.kept} (${report.totalExperiments > 0 ? Math.round((report.kept / report.totalExperiments) * 100) : 0}%)
- **Discarded**: ${report.discarded}
- **Average Quality**: ${report.avgQuality.toFixed(1)} / 10

## Top Findings

${report.topFindings.length === 0 ? '_No findings met the quality threshold._' : report.topFindings.map((f, i) =>
    `### ${i + 1}. ${f.topic} (score: ${f.score.toFixed(1)})\n\n${f.excerpt}...`
  ).join('\n\n')}

## Strategy Notes

${report.strategyNotes.length === 0 ? '_No notes generated._' : report.strategyNotes.map((n) => `- ${n}`).join('\n')}
`

  await writeFile(filepath, content, 'utf-8')
  return filepath
}

export async function runOvernightResearch(
  apiKey: string,
  model: string,
  onProgress?: (msg: string) => void
): Promise<OvernightReport> {
  const log = (msg: string) => {
    console.log(`[Overnight] ${msg}`)
    onProgress?.(msg)
  }

  log('Starting overnight research run')

  const programContent = await readProgram()
  if (!programContent) {
    log('No program.md found — nothing to research')
    return {
      date: new Date().toISOString().split('T')[0],
      totalExperiments: 0,
      kept: 0,
      discarded: 0,
      avgQuality: 0,
      topFindings: [],
      strategyNotes: ['program.md not found — create it to define research agenda'],
    }
  }

  const topics = extractTopics(programContent)
  if (topics.length === 0) {
    log('No topics found in program.md')
    return {
      date: new Date().toISOString().split('T')[0],
      totalExperiments: 0,
      kept: 0,
      discarded: 0,
      avgQuality: 0,
      topFindings: [],
      strategyNotes: ['No topics extracted from program.md — add bullet points under ## sections'],
    }
  }

  log(`Found ${topics.length} topics to research`)

  const budgetEnd = Date.now() + OVERNIGHT_BUDGET_MS
  const experiments: Experiment[] = []
  let topicIndex = 0

  while (Date.now() < budgetEnd && topicIndex < topics.length) {
    const { topic, section } = topics[topicIndex]
    log(`Researching: ${topic} (${section})`)

    const experimentDeadline = Date.now() + EXPERIMENT_BUDGET_MS
    const experiment = await Promise.race([
      runExperiment(topic, section, apiKey, model),
      new Promise<Experiment>((resolve) =>
        setTimeout(() => resolve({
          id: `timeout_${topicIndex}`,
          topic,
          section,
          startedAt: Date.now(),
          completedAt: Date.now(),
          kept: false,
        }), experimentDeadline - Date.now())
      ),
    ])

    experiments.push(experiment)

    if (experiment.finding) {
      await saveFinding(experiment)
      const status = experiment.kept ? 'kept' : 'discarded'
      log(`${topic}: ${status} (score: ${experiment.score?.overall.toFixed(1) ?? 'N/A'})`)
    } else {
      log(`${topic}: no finding generated`)
    }

    topicIndex++
  }

  const report = await generateReport(experiments)
  await appendStrategyNote(report.strategyNotes)
  const reportPath = await saveReport(report)

  log(`Research complete. Report saved to ${reportPath}`)
  log(`${report.kept} kept, ${report.discarded} discarded, avg quality ${report.avgQuality.toFixed(1)}`)

  return report
}

export async function getLastReport(): Promise<string | null> {
  const reportDir = resolve(RESEARCH_DIR, 'reports')
  try {
    const { readdir } = await import('fs/promises')
    const files = await readdir(reportDir)
    const reports = files.filter((f) => f.endsWith('-overnight-report.md')).sort().reverse()
    if (reports.length === 0) return null
    return await readFile(resolve(reportDir, reports[0]), 'utf-8')
  } catch {
    return null
  }
}
