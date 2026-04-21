/**
 * Autonomous research loop for OpenSeaBri.
 *
 * Reads research.md to get the research agenda.
 * Picks the first incomplete topic from the agenda.
 * Uses Tavily (if TAVILY_API_KEY is set) or Anthropic API to gather findings.
 * Synthesizes into 3-5 plain-language takeaways.
 * Saves findings to research/findings/YYYY-MM-DD.md.
 * Runs within a 30-minute time budget per cycle.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scoreFinding } from './scorer.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BUDGET_MS = 30 * 60 * 1000; // 30 minutes per cycle
const QUALITY_THRESHOLD = 6.0;
const OPENSEABRI_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Read agenda from program.md (the human-editable + agent-evolvable file)
const RESEARCH_AGENDA_PATH = join(OPENSEABRI_ROOT, 'research', 'program.md');
const FINDINGS_DIR = join(OPENSEABRI_ROOT, 'research', 'findings');
const DISCARDED_DIR = join(OPENSEABRI_ROOT, 'research', 'discarded');
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-5';
const TAVILY_API_URL = 'https://api.tavily.com/search';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  answer?: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

interface ResearchTopic {
  section: string;
  topic: string;
}

interface FindingsEntry {
  topic: string;
  section: string;
  source: 'Tavily' | 'Anthropic';
  takeaways: string[];
  userImplications: Record<string, string>;
  rawContext?: string;
}

// ---------------------------------------------------------------------------
// Agenda parsing
// ---------------------------------------------------------------------------

/**
 * Parses program.md and extracts research topics from ## and ### section headers
 * and their bullet points. Skips Strategy Notes sections.
 */
function parseAgenda(): ResearchTopic[] {
  if (!existsSync(RESEARCH_AGENDA_PATH)) {
    console.error(`[loop] program.md not found at ${RESEARCH_AGENDA_PATH}`);
    return [];
  }

  const content = readFileSync(RESEARCH_AGENDA_PATH, 'utf-8');
  const topics: ResearchTopic[] = [];
  let currentSection = '';
  let inStrategyNotes = false;

  for (const line of content.split('\n')) {
    // Skip strategy notes sections (agent-generated, not research topics)
    if (line.startsWith('## Strategy Notes')) {
      inStrategyNotes = true;
      continue;
    }
    if (line.startsWith('## ') && inStrategyNotes) {
      inStrategyNotes = false;
    }
    if (inStrategyNotes) continue;

    const sectionMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }
    const topicMatch = line.match(/^-\s+\*?\*?([^*\n]+)\*?\*?/);
    if (topicMatch && currentSection) {
      const topic = topicMatch[1].trim();
      if (topic.length > 3) {
        topics.push({ section: currentSection, topic });
      }
    }
  }

  return topics;
}

function appendStrategyNote(note: string): void {
  try {
    const existing = existsSync(RESEARCH_AGENDA_PATH)
      ? readFileSync(RESEARCH_AGENDA_PATH, 'utf-8')
      : '';
    const date = new Date().toISOString().split('T')[0];
    const noteSection = `\n\n## Strategy Notes — ${date}\n\n- ${note}\n`;
    writeFileSync(RESEARCH_AGENDA_PATH, existing + noteSection, 'utf-8');
  } catch {
    // Non-fatal
  }
}

/**
 * Reads today's findings file (if it exists) and returns the topics already covered.
 */
function getCoveredTopicsToday(dateStr: string): Set<string> {
  const filePath = join(FINDINGS_DIR, `${dateStr}.md`);
  if (!existsSync(filePath)) return new Set();

  const content = readFileSync(filePath, 'utf-8');
  const covered = new Set<string>();
  const matches = content.matchAll(/^## Topic: (.+)$/gm);
  for (const match of matches) {
    covered.add(match[1].trim());
  }
  return covered;
}

/**
 * Picks the first uncovered topic from the agenda for today's cycle.
 */
function pickNextTopic(topics: ResearchTopic[], coveredToday: Set<string>): ResearchTopic | null {
  for (const t of topics) {
    if (!coveredToday.has(t.topic)) return t;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Search and synthesis
// ---------------------------------------------------------------------------

/**
 * Searches Tavily for recent information on the topic.
 * Returns a context string with top results.
 */
async function searchTavily(query: string): Promise<string> {
  const body = JSON.stringify({
    api_key: TAVILY_API_KEY,
    query: `${query} (recent developments, 2024 2025)`,
    search_depth: 'advanced',
    max_results: 5,
    include_answer: true,
  });

  const response = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TavilyResponse;

  const sections: string[] = [];

  if (data.answer) {
    sections.push(`Summary: ${data.answer}`);
  }

  for (const result of data.results ?? []) {
    sections.push(`\nSource: ${result.title}\nURL: ${result.url}\nContent: ${result.content}`);
  }

  return sections.join('\n\n');
}

/**
 * Uses the Anthropic API to reason about the topic using Claude's knowledge.
 * Returns a context string of relevant knowledge.
 */
async function reasonWithAnthropic(topic: string, section: string): Promise<string> {
  const messages: AnthropicMessage[] = [
    {
      role: 'user',
      content: `You are OpenSeaBri, a sustainability intelligence system. Your research agenda covers: "${section}".

The specific topic to research is: "${topic}"

Please provide:
1. The current state of knowledge on this topic (what is established, what is recent, what is changing)
2. Key data points or trends with rough quantitative context where available
3. Geographic or sector specifics where relevant
4. What has changed or is changing in the last 1-2 years

Be specific, cite the basis for claims (e.g., "NOAA data shows...", "First Street Foundation finds..."), and flag what is uncertain. Write for a real person making a real decision — not for a consultant writing a report.`,
    },
  ];

  const body = JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    messages,
  });

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const textBlock = data.content.find((c) => c.type === 'text');
  return textBlock?.text ?? '';
}

/**
 * Synthesizes raw context into structured findings using the Anthropic API.
 */
async function synthesizeFindings(
  topic: string,
  section: string,
  rawContext: string,
  source: 'Tavily' | 'Anthropic'
): Promise<FindingsEntry> {
  const sourceNote =
    source === 'Tavily'
      ? 'web search results from Tavily'
      : "Claude's knowledge base (no live web data)";

  const messages: AnthropicMessage[] = [
    {
      role: 'user',
      content: `You are OpenSeaBri. Based on the following research context gathered from ${sourceNote}, synthesize findings for this topic:

Topic: "${topic}"
Research section: "${section}"

Context:
${rawContext}

Produce a JSON response with this exact structure:
{
  "takeaways": [
    "Plain-language finding #1 (one sentence, actionable)",
    "Plain-language finding #2",
    "Plain-language finding #3",
    "Plain-language finding #4 (optional)",
    "Plain-language finding #5 (optional)"
  ],
  "userImplications": {
    "homeowners": "What this means for a homeowner in one sentence",
    "farmers": "What this means for a farmer or rural landowner in one sentence",
    "businesses": "What this means for a small or medium business in one sentence",
    "investors": "What this means for an investor or lender in one sentence"
  }
}

Rules:
- Plain language only. No jargon. If you use a technical term, define it in the same sentence.
- Every takeaway must be something a real person can act on or use to make a decision.
- If data is uncertain or estimates, say so.
- 3 takeaways minimum, 5 maximum.
- Return only valid JSON, no markdown fences.`,
    },
  ];

  const body = JSON.stringify({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages,
  });

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Anthropic synthesis error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as AnthropicResponse;
  const textBlock = data.content.find((c) => c.type === 'text');
  const jsonText = textBlock?.text ?? '{}';

  let parsed: { takeaways?: string[]; userImplications?: Record<string, string> };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error('[loop] Failed to parse synthesis JSON, using fallback');
    parsed = { takeaways: [jsonText.slice(0, 200)], userImplications: {} };
  }

  return {
    topic,
    section,
    source,
    takeaways: parsed.takeaways ?? [],
    userImplications: parsed.userImplications ?? {},
    rawContext,
  };
}

// ---------------------------------------------------------------------------
// Findings file management
// ---------------------------------------------------------------------------

/**
 * Returns today's date string in YYYY-MM-DD format.
 */
function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formats a FindingsEntry as markdown to append to the daily findings file.
 */
function formatFindingsMarkdown(entry: FindingsEntry, dateStr: string): string {
  const lines: string[] = [
    `## Topic: ${entry.topic}`,
    '',
    `**Research section**: ${entry.section}`,
    `**Source**: ${entry.source}`,
    `**Date**: ${dateStr}`,
    '',
    '### Key Takeaways',
    '',
  ];

  for (let i = 0; i < entry.takeaways.length; i++) {
    lines.push(`${i + 1}. ${entry.takeaways[i]}`);
  }

  lines.push('', '### What This Means For You', '');

  for (const [audience, implication] of Object.entries(entry.userImplications)) {
    const label = audience.charAt(0).toUpperCase() + audience.slice(1);
    lines.push(`**${label}**: ${implication}`);
    lines.push('');
  }

  lines.push('---', '');
  return lines.join('\n');
}

/**
 * Appends findings to today's findings file (kept), creating it if needed.
 */
function appendToFindingsFile(entry: FindingsEntry): void {
  if (!existsSync(FINDINGS_DIR)) {
    mkdirSync(FINDINGS_DIR, { recursive: true });
  }

  const dateStr = todayString();
  const filePath = join(FINDINGS_DIR, `${dateStr}.md`);
  const isNew = !existsSync(filePath);

  const header = isNew
    ? `# OpenSeaBri Research Findings — ${dateStr}\n\nSource: ${entry.source}\nTopics covered: see sections below\n\n---\n\n`
    : '';

  const body = formatFindingsMarkdown(entry, dateStr);
  writeFileSync(filePath, header + body, { flag: 'a', encoding: 'utf-8' });
  console.log(`[loop] Findings written to ${filePath}`);
}

/**
 * Saves discarded findings to the discarded folder for review.
 */
function appendToDiscardedFile(entry: FindingsEntry, reason: string): void {
  if (!existsSync(DISCARDED_DIR)) {
    mkdirSync(DISCARDED_DIR, { recursive: true });
  }

  const dateStr = todayString();
  const filePath = join(DISCARDED_DIR, `${dateStr}.md`);
  const isNew = !existsSync(filePath);

  const header = isNew ? `# Discarded Findings — ${dateStr}\n\n---\n\n` : '';
  const body = `## ${entry.topic}\n\n**Discarded reason**: ${reason}\n\n${formatFindingsMarkdown(entry, dateStr)}`;

  writeFileSync(filePath, header + body, { flag: 'a', encoding: 'utf-8' });
  console.log(`[loop] Discarded finding saved to ${filePath}`);
}

// ---------------------------------------------------------------------------
// Main cycle
// ---------------------------------------------------------------------------

/**
 * Runs one research cycle:
 * 1. Reads the agenda
 * 2. Picks the first uncovered topic for today
 * 3. Gathers information (Tavily or Anthropic)
 * 4. Synthesizes findings
 * 5. Saves to findings file
 */
export async function runResearchCycle(): Promise<void> {
  const startTime = Date.now();
  console.log('[loop] Starting research cycle');

  // Validate API keys
  if (!ANTHROPIC_API_KEY) {
    console.error('[loop] ANTHROPIC_API_KEY is not set. Cannot run research cycle.');
    return;
  }

  // Parse agenda
  const topics = parseAgenda();
  if (topics.length === 0) {
    console.log('[loop] No topics found in research agenda. Exiting.');
    return;
  }

  // Pick next uncovered topic
  const dateStr = todayString();
  const coveredToday = getCoveredTopicsToday(dateStr);
  const selected = pickNextTopic(topics, coveredToday);

  if (!selected) {
    console.log('[loop] All agenda topics covered for today. Exiting.');
    return;
  }

  console.log(`[loop] Researching: "${selected.topic}" (${selected.section})`);

  // Gather raw context
  let rawContext = '';
  let source: 'Tavily' | 'Anthropic';

  try {
    if (TAVILY_API_KEY) {
      console.log('[loop] Using Tavily for web search');
      source = 'Tavily';
      rawContext = await searchTavily(selected.topic);
    } else {
      console.log('[loop] No Tavily key — using Anthropic knowledge');
      source = 'Anthropic';
      rawContext = await reasonWithAnthropic(selected.topic, selected.section);
    }
  } catch (err) {
    console.error('[loop] Error gathering context:', err);
    if (source! === 'Tavily' && ANTHROPIC_API_KEY) {
      console.log('[loop] Falling back to Anthropic after Tavily failure');
      source = 'Anthropic';
      try {
        rawContext = await reasonWithAnthropic(selected.topic, selected.section);
      } catch (fallbackErr) {
        console.error('[loop] Anthropic fallback also failed:', fallbackErr);
        return;
      }
    } else {
      return;
    }
  }

  // Check time budget before synthesis
  if (Date.now() - startTime > BUDGET_MS * 0.8) {
    console.warn('[loop] Approaching time budget limit. Skipping synthesis.');
    return;
  }

  // Synthesize findings
  let entry: FindingsEntry;
  try {
    entry = await synthesizeFindings(selected.topic, selected.section, rawContext, source);
  } catch (err) {
    console.error('[loop] Error synthesizing findings:', err);
    return;
  }

  // Score findings for quality
  let qualityScore;
  try {
    qualityScore = await scoreFinding(entry.topic, entry.takeaways, rawContext);
    console.log(`[loop] Quality score: ${qualityScore.overall.toFixed(1)} — ${qualityScore.keep ? 'keep' : 'discard'}`);
  } catch {
    // Scoring failure is non-fatal — default to keeping the finding
    qualityScore = { overall: 7, keep: true, reason: 'scoring unavailable' };
  }

  // Save or discard based on quality
  if (qualityScore.keep) {
    try {
      appendToFindingsFile(entry);
    } catch (err) {
      console.error('[loop] Error saving findings:', err);
      return;
    }
  } else {
    try {
      appendToDiscardedFile(entry, `Score ${qualityScore.overall.toFixed(1)} below threshold ${QUALITY_THRESHOLD}: ${qualityScore.reason}`);
      appendStrategyNote(`Topic "${entry.topic}" scored ${qualityScore.overall.toFixed(1)} — consider more specific framing`);
    } catch {
      // Non-fatal
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`[loop] Cycle complete in ${elapsed}s. Topic: "${selected.topic}"`);
  console.log(`[loop] Takeaways: ${entry.takeaways.length}`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  try {
    await runResearchCycle();
  } catch (err) {
    console.error('[loop] Unhandled error in research cycle:', err);
    process.exit(1);
  }
}

main();
