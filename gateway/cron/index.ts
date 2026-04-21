import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'
import { WORKSPACE_DIR } from '../config.js'
import { parseNaturalLanguageCron } from './parser.js'

const CRONS_FILE = resolve(WORKSPACE_DIR, 'crons.json')

export interface CronJob {
  id: string
  expression: string
  description: string
  task: string
  channel: 'console' | 'telegram'
  createdAt: number
  lastRun?: number
  enabled: boolean
  nextRun?: number
}

interface CronStore {
  jobs: CronJob[]
}

// Active node-cron handles — keyed by job id
const activeHandles = new Map<string, { stop: () => void }>()

async function loadStore(): Promise<CronStore> {
  try {
    const raw = await readFile(CRONS_FILE, 'utf-8')
    return JSON.parse(raw) as CronStore
  } catch {
    return { jobs: [] }
  }
}

async function saveStore(store: CronStore): Promise<void> {
  await mkdir(WORKSPACE_DIR, { recursive: true })
  await writeFile(CRONS_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

function generateId(): string {
  return `cron_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

export async function addCronJob(
  naturalLanguage: string,
  channel: 'console' | 'telegram' = 'console'
): Promise<CronJob | null> {
  const parsed = await parseNaturalLanguageCron(naturalLanguage)
  if (!parsed) return null

  const job: CronJob = {
    id: generateId(),
    expression: parsed.expression,
    description: parsed.description,
    task: parsed.task,
    channel,
    createdAt: Date.now(),
    enabled: true,
  }

  const store = await loadStore()
  store.jobs.push(job)
  await saveStore(store)

  // Start the job in the current process if we're in the gateway
  scheduleJob(job)

  return job
}

export async function listCronJobs(): Promise<CronJob[]> {
  const store = await loadStore()
  return store.jobs
}

export async function removeCronJob(id: string): Promise<boolean> {
  const store = await loadStore()
  const idx = store.jobs.findIndex((j) => j.id === id)
  if (idx === -1) return false

  store.jobs.splice(idx, 1)
  await saveStore(store)

  const handle = activeHandles.get(id)
  if (handle) {
    handle.stop()
    activeHandles.delete(id)
  }

  return true
}

export async function pauseCronJob(id: string): Promise<boolean> {
  const store = await loadStore()
  const job = store.jobs.find((j) => j.id === id)
  if (!job) return false

  job.enabled = false
  await saveStore(store)

  const handle = activeHandles.get(id)
  if (handle) {
    handle.stop()
    activeHandles.delete(id)
  }

  return true
}

export async function resumeCronJob(id: string): Promise<boolean> {
  const store = await loadStore()
  const job = store.jobs.find((j) => j.id === id)
  if (!job) return false

  job.enabled = true
  await saveStore(store)
  scheduleJob(job)

  return true
}

function scheduleJob(job: CronJob): void {
  // Dynamically import node-cron to avoid breaking environments without it
  import('node-cron')
    .then((cron) => {
      if (!cron.validate(job.expression)) {
        console.warn(`[Cron] Invalid expression for job ${job.id}: ${job.expression}`)
        return
      }

      const handle = cron.schedule(job.expression, async () => {
        await runJob(job)
      })

      activeHandles.set(job.id, handle)
    })
    .catch(() => {
      console.warn('[Cron] node-cron not available — scheduled jobs will not run automatically')
    })
}

async function runJob(job: CronJob): Promise<void> {
  console.log(`[Cron] Running job "${job.description}"`)

  // Dynamically import router to avoid circular deps at module load time
  try {
    const { routeMessage } = await import('../agents/router.js')
    const response = await routeMessage('general', job.task, [])

    if (job.channel === 'console') {
      console.log(`\n[Cron] ${job.description}\n${response}\n`)
    }
    // Telegram delivery would happen here if integrated

    // Update last run
    const store = await loadStore()
    const stored = store.jobs.find((j) => j.id === job.id)
    if (stored) {
      stored.lastRun = Date.now()
      await saveStore(store)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Cron] Job "${job.description}" failed: ${message}`)
  }
}

export async function startAllCronJobs(): Promise<void> {
  const store = await loadStore()
  for (const job of store.jobs) {
    if (job.enabled) {
      scheduleJob(job)
    }
  }
  if (store.jobs.length > 0) {
    console.log(`[Cron] Started ${store.jobs.filter((j) => j.enabled).length} scheduled job(s)`)
  }
}
