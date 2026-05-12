import { readFileSync } from 'fs'
import { spawnSync } from 'child_process'

const patterns: Array<[string, RegExp]> = [
  ['openai', /(^|[^A-Za-z])sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/],
  ['slack', /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ['huggingface', /hf_[A-Za-z0-9]{20,}/],
  ['github', /gh[pousr]_[A-Za-z0-9_]{20,}/],
  ['aws', /AKIA[0-9A-Z]{16}/],
  ['twilio_sid', /AC[a-f0-9]{32}/],
  ['sendgrid', /SG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['private_key', /-----BEGIN (RSA |OPENSSH |EC |)PRIVATE KEY-----/],
]

const listed = spawnSync('git', ['ls-files'], { encoding: 'utf8' })
if (listed.status !== 0) {
  console.error('[secret-scan] failed to list git files')
  process.exit(1)
}

const skip = /^(node_modules|dist|test-results|\.gitnexus)\//
const hits: string[] = []
for (const file of listed.stdout.split(/\r?\n/).filter(Boolean)) {
  if (skip.test(file)) continue
  let text = ''
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const [name, pattern] of patterns) {
      if (pattern.test(line)) hits.push(`${file}:${index + 1}:${name}`)
    }
  })
}

if (hits.length > 0) {
  console.error('[secret-scan] high-confidence secret-like patterns found:')
  for (const hit of hits) console.error(hit)
  process.exit(1)
}

console.log('[secret-scan] PASS')
