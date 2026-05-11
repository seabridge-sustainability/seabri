export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export interface LogEntry {
  level: LogLevel
  msg: string
  module: string
  ts: string
  [key: string]: unknown
}

export interface LoggerOptions {
  module: string
  level?: LogLevel
}

function getGlobalLevel(): LogLevel {
  const env = process.env.OPENSEABRI_LOG_LEVEL?.toLowerCase()
  if (env && env in LEVEL_RANK) return env as LogLevel
  return 'info'
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry)
}

function formatPretty(entry: LogEntry): string {
  const { level, msg, module, ts, ...rest } = entry
  const extra = Object.keys(rest).length > 0
    ? ' ' + Object.entries(rest).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')
    : ''
  return `${ts} [${level.toUpperCase().padEnd(5)}] [${module}] ${msg}${extra}`
}

const useJson = process.env.OPENSEABRI_LOG_FORMAT === 'json'
const format = useJson ? formatJson : formatPretty

export class Logger {
  private readonly module: string
  private readonly minLevel: LogLevel

  constructor(options: LoggerOptions) {
    this.module = options.module
    this.minLevel = options.level ?? getGlobalLevel()
  }

  private emit(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.minLevel]) return
    const entry: LogEntry = {
      level,
      msg,
      module: this.module,
      ts: new Date().toISOString(),
      ...data,
    }
    const line = format(entry)
    if (level === 'error') {
      console.error(line)
    } else if (level === 'warn') {
      console.warn(line)
    } else {
      console.log(line)
    }
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    this.emit('debug', msg, data)
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.emit('info', msg, data)
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.emit('warn', msg, data)
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.emit('error', msg, data)
  }

  child(extra: Record<string, unknown>): Logger {
    const child = new Logger({ module: this.module, level: this.minLevel })
    const parentEmit = child.emit.bind(child)
    child.emit = (level: LogLevel, msg: string, data?: Record<string, unknown>) => {
      parentEmit(level, msg, { ...extra, ...data })
    }
    return child
  }
}

export function createLogger(module: string, level?: LogLevel): Logger {
  return new Logger({ module, level })
}
