const LOG_LEVELS = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 } as const
type Level = keyof typeof LOG_LEVELS

const configuredLevel: Level =
  (process.env.OPENSEABRI_LOG_LEVEL as Level | undefined) ?? 'info'
const threshold = LOG_LEVELS[configuredLevel] ?? LOG_LEVELS.info

function emit(level: Level, component: string, msg: string, extra?: Record<string, unknown>): void {
  if (LOG_LEVELS[level] < threshold) return
  const entry = {
    ts: new Date().toISOString(),
    level,
    component,
    msg,
    ...extra,
  }
  const line = JSON.stringify(entry)
  if (level === 'error' || level === 'fatal') {
    process.stderr.write(line + '\n')
  } else {
    process.stdout.write(line + '\n')
  }
}

export interface Logger {
  debug(msg: string, extra?: Record<string, unknown>): void
  info(msg: string, extra?: Record<string, unknown>): void
  warn(msg: string, extra?: Record<string, unknown>): void
  error(msg: string, extra?: Record<string, unknown>): void
  fatal(msg: string, extra?: Record<string, unknown>): void
  child(component: string): Logger
}

export function createLogger(component: string): Logger {
  return {
    debug: (msg, extra) => emit('debug', component, msg, extra),
    info: (msg, extra) => emit('info', component, msg, extra),
    warn: (msg, extra) => emit('warn', component, msg, extra),
    error: (msg, extra) => emit('error', component, msg, extra),
    fatal: (msg, extra) => emit('fatal', component, msg, extra),
    child: (sub) => createLogger(`${component}.${sub}`),
  }
}

export const log = createLogger('gateway')
