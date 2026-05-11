import { readFile } from 'fs/promises'
import {
  parseFrontmatter,
  validateFrontmatter,
  SkillValidationError,
  COMPLIANCE_TAGS,
  type SkillFrontmatter,
} from './schema.js'

export type Severity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: Severity
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  skillId: string
  frontmatter: SkillFrontmatter | null
  issues: ValidationIssue[]
}

const MIN_BODY_LENGTH = 100
const MIN_SECTIONS = 2
const SECTION_RE = /^##\s+/gm
const EVIDENCE_URL_RE = /https?:\/\/[^\s)]+/

export function validateSkillBody(body: string, fm: SkillFrontmatter): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (body.trim().length < MIN_BODY_LENGTH) {
    issues.push({
      severity: 'error',
      field: 'body',
      message: `Body is too short (${body.trim().length} chars, minimum ${MIN_BODY_LENGTH})`,
    })
  }

  const sections = body.match(SECTION_RE)
  if (!sections || sections.length < MIN_SECTIONS) {
    issues.push({
      severity: 'warning',
      field: 'body',
      message: `Body has ${sections?.length ?? 0} sections (## headings), recommend at least ${MIN_SECTIONS}`,
    })
  }

  const hasWhenToUse = /##\s+(When to Use|Usage|Applicability)/i.test(body)
  if (!hasWhenToUse) {
    issues.push({
      severity: 'warning',
      field: 'body',
      message: 'Missing "When to Use" section — helps agents decide when to invoke this skill',
    })
  }

  if (fm.evidenceSource) {
    if (!EVIDENCE_URL_RE.test(fm.evidenceSource) && fm.evidenceSource.length < 10) {
      issues.push({
        severity: 'warning',
        field: 'evidenceSource',
        message: 'evidenceSource should be a URL or descriptive citation',
      })
    }
  } else {
    const bodyHasUrls = EVIDENCE_URL_RE.test(body)
    if (!bodyHasUrls) {
      issues.push({
        severity: 'info',
        field: 'evidenceSource',
        message: 'No evidence source in frontmatter or body — consider adding citations',
      })
    }
  }

  if (!fm.costTier) {
    issues.push({
      severity: 'info',
      field: 'costTier',
      message: 'No costTier specified — defaults to unmetered; consider setting free/low/medium/high',
    })
  }

  const nonGeneralTags = fm.complianceTags.filter((t) => t !== 'GENERAL')
  if (nonGeneralTags.length === 0) {
    issues.push({
      severity: 'info',
      field: 'complianceTags',
      message: 'Only GENERAL tag present — consider adding specific framework tags for better routing',
    })
  }

  return issues
}

export async function validateSkillFile(filePath: string): Promise<ValidationResult> {
  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return {
      valid: false,
      skillId: 'unknown',
      frontmatter: null,
      issues: [{ severity: 'error', field: 'file', message: `Cannot read file: ${filePath}` }],
    }
  }

  return validateSkillSource(content, filePath)
}

export function validateSkillSource(content: string, sourceLabel = 'inline'): ValidationResult {
  const issues: ValidationIssue[] = []

  const parsed = parseFrontmatter(content)
  if (!parsed) {
    return {
      valid: false,
      skillId: 'unknown',
      frontmatter: null,
      issues: [{ severity: 'error', field: 'frontmatter', message: 'Missing YAML frontmatter block (--- ... ---)' }],
    }
  }

  let fm: SkillFrontmatter
  try {
    const fallbackId = sourceLabel.replace(/.*[\\/]([^\\/]+)[\\/]SKILL\.md$/, '$1')
    fm = validateFrontmatter(parsed.raw, fallbackId)
  } catch (err) {
    const msg = err instanceof SkillValidationError ? err.message : String(err)
    return {
      valid: false,
      skillId: 'unknown',
      frontmatter: null,
      issues: [{ severity: 'error', field: 'frontmatter', message: msg }],
    }
  }

  issues.push(...validateSkillBody(parsed.body, fm))

  const hasErrors = issues.some((i) => i.severity === 'error')
  return {
    valid: !hasErrors,
    skillId: fm.id,
    frontmatter: fm,
    issues,
  }
}

export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = []
  const icon = result.valid ? 'PASS' : 'FAIL'
  lines.push(`[${icon}] ${result.skillId}`)

  if (result.issues.length === 0) {
    lines.push('  No issues found.')
    return lines.join('\n')
  }

  for (const issue of result.issues) {
    const tag = issue.severity.toUpperCase().padEnd(7)
    lines.push(`  ${tag} ${issue.field}: ${issue.message}`)
  }
  return lines.join('\n')
}

export function complianceTagCoverage(results: ValidationResult[]): {
  covered: string[]
  missing: string[]
  coveragePercent: number
} {
  const allTags = new Set<string>()
  for (const r of results) {
    if (r.frontmatter) {
      for (const t of r.frontmatter.complianceTags) allTags.add(t)
    }
  }
  const covered = [...allTags].sort()
  const missing = COMPLIANCE_TAGS.filter((t) => !allTags.has(t))
  const coveragePercent = Math.round((covered.length / COMPLIANCE_TAGS.length) * 100)
  return { covered, missing, coveragePercent }
}
