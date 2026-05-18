import { readFile, writeFile, mkdir } from 'fs/promises'
import { resolve } from 'path'
import { randomUUID } from 'crypto'
import { WORKSPACE_DIR } from '../config.js'
import { parseNaturalLanguageCron } from './parser.js'
import { createLogger } from '../logger.js'

const log = createLogger('gateway.cron')

// ── Redis distributed lock ─────────────────────────────────────────────────
// Prevents duplicate cron job execution across multiple gateway instances.
// Falls back gracefully when Redis is unavailable (single-instance mode).

let _cronRedisClient: {
  set(key: string, value: string, options: { NX: boolean; PX: number }): Promise<string | null>
  del(key: string): Promise<number>
} | null = null

let _cronRedisAttempted = false

async function getCronRedisClient(): Promise<typeof _cronRedisClient> {
  if (_cronRedisAttempted) return _cronRedisClient
  _cronRedisAttempted = true

  const redisUrl = process.env.REDIS_URL || process.env.OPENSEABRI_REDIS_URL
  if (!redisUrl) return null

  try {
    const loadRedis = new Function('specifier', 'return import(specifier)') as (
      specifier: string,
    ) => Promise<{
      createClient: (opts: { url: string }) => {
        connect(): Promise<void>
        set(key: string, value: string, options: { NX: boolean; PX: number }): Promise<string | null>
        del(key: string): Promise<number>
        on(event: string, cb: (err: unknown) => void): void
      }
    }>
    const { createClient } = await loadRedis('redis')
    const client = createClient({ url: redisUrl })
    client.on('error', (err: unknown) => {
      log.warn('redis cron client error — cron distributed lock disabled', {
        error: err instanceof Error ? err.message : String(err),
      })
      _cronRedisClient = null
    })
    await client.connect()
    _cronRedisClient = client
    log.info('redis connected — cron distributed lock enabled')
  } catch (err: unknown) {
    log.warn('redis unavailable — cron distributed lock disabled (single-instance mode)', {
      error: err instanceof Error ? err.message : String(err),
    })
    _cronRedisClient = null
  }
  return _cronRedisClient
}

/**
 * Acquire a distributed Redis lock.
 * Returns the lock key if acquired, or null if another instance holds it.
 *
 * @param lockKey Unique key for this cron slot (e.g. `cron:jobName:YYYY-MM-DD-HH-MM`)
 * @param ttlMs   Lock TTL in milliseconds — should exceed max expected job runtime
 */
async function acquireLock(lockKey: string, ttlMs: number): Promise<string | null> {
  const redis = await getCronRedisClient()
  if (!redis) return lockKey // no Redis — always proceed in single-instance mode

  try {
    const result = await redis.set(lockKey, '1', { NX: true, PX: ttlMs })
    return result === 'OK' ? lockKey : null
  } catch (err: unknown) {
    log.warn('cron lock acquire failed — proceeding without lock', {
      lockKey,
      error: err instanceof Error ? err.message : String(err),
    })
    return lockKey // fail-open: better to risk a duplicate than to skip the job
  }
}

/**
 * Release a distributed lock acquired by acquireLock().
 * Safe to call even when Redis is unavailable.
 */
async function releaseLock(lockKey: string): Promise<void> {
  const redis = await getCronRedisClient()
  if (!redis) return
  try {
    await redis.del(lockKey)
  } catch {
    // Non-fatal — lock will expire via TTL
  }
}

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
  return `cron_${randomUUID()}`
}

export async function addCronJob(
  naturalLanguage: string,
  channel: 'console' | 'telegram' = 'console'
): Promise<CronJob | null> {
  const parsed = await parseNaturalLanguageCron(naturalLanguage)
  if (!parsed) return null

  // Validate expression before persisting so we never store an invalid job as enabled.
  try {
    const cron = await import('node-cron')
    if (!cron.validate(parsed.expression)) {
      log.warn('parsed expression invalid — job not created', { expression: parsed.expression })
      return null
    }
  } catch {
    // node-cron not available; accept the parsed expression and let scheduleJob warn later
  }

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
        log.warn('invalid cron expression', { jobId: job.id, expression: job.expression })
        return
      }

      const existing = activeHandles.get(job.id)
      if (existing) {
        existing.stop()
        activeHandles.delete(job.id)
      }

      const handle = cron.schedule(job.expression, async () => {
        await runJob(job)
      })

      activeHandles.set(job.id, handle)
    })
    .catch(() => {
      log.warn('node-cron not available — scheduled jobs will not run automatically')
    })
}

async function runJob(job: CronJob): Promise<void> {
  // Build a lock key scoped to this job and the current minute so each
  // scheduled slot is executed at most once across all gateway instances.
  const now = new Date()
  const slot =
    `${now.getUTCFullYear()}-` +
    `${String(now.getUTCMonth() + 1).padStart(2, '0')}-` +
    `${String(now.getUTCDate()).padStart(2, '0')}-` +
    `${String(now.getUTCHours()).padStart(2, '0')}-` +
    `${String(now.getUTCMinutes()).padStart(2, '0')}`
  const lockKey = `cron:${job.id}:${slot}`
  // TTL = 5 minutes, which exceeds any reasonable single job runtime.
  const lockTtlMs = 5 * 60 * 1000

  const lock = await acquireLock(lockKey, lockTtlMs)
  if (!lock) {
    log.info('cron job skipped — lock held by another instance', {
      description: job.description,
      lockKey,
    })
    return
  }

  log.info('running job', { description: job.description, lockKey })

  // Dynamically import router to avoid circular deps at module load time
  try {
    const { routeMessage } = await import('../agents/router.js')
    const response = await routeMessage('general', job.task, [])

    if (job.channel === 'console') {
      log.info('job output', { description: job.description, response })
    }
    // Telegram delivery would happen here if integrated

    const nowMs = Date.now()
    job.lastRun = nowMs
    const store = await loadStore()
    const idx = store.jobs.findIndex((j) => j.id === job.id)
    if (idx !== -1) {
      store.jobs[idx] = { ...store.jobs[idx], lastRun: nowMs }
      await saveStore(store)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('job failed', { description: job.description, error: message })
  } finally {
    await releaseLock(lockKey)
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
    log.info('started scheduled jobs', { count: store.jobs.filter((j) => j.enabled).length })
  }
}
