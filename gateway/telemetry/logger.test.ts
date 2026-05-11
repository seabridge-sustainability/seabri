import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLogger, Logger } from './logger.js'

describe('Logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a logger with module name', () => {
    const log = createLogger('gateway')
    expect(log).toBeInstanceOf(Logger)
  })

  it('logs info messages', () => {
    const log = createLogger('test', 'info')
    log.info('hello')
    expect(logSpy).toHaveBeenCalledOnce()
    expect(logSpy.mock.calls[0][0]).toContain('[test]')
    expect(logSpy.mock.calls[0][0]).toContain('hello')
  })

  it('logs warn messages to console.warn', () => {
    const log = createLogger('test', 'info')
    log.warn('caution')
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0][0]).toContain('caution')
  })

  it('logs error messages to console.error', () => {
    const log = createLogger('test', 'info')
    log.error('failure')
    expect(errorSpy).toHaveBeenCalledOnce()
    expect(errorSpy.mock.calls[0][0]).toContain('failure')
  })

  it('suppresses messages below minimum level', () => {
    const log = createLogger('test', 'warn')
    log.debug('should not appear')
    log.info('should not appear')
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('includes extra data in log output', () => {
    const log = createLogger('test', 'info')
    log.info('request', { method: 'GET', path: '/health' })
    expect(logSpy.mock.calls[0][0]).toContain('method=')
    expect(logSpy.mock.calls[0][0]).toContain('/health')
  })

  it('child logger inherits module and adds extra fields', () => {
    const log = createLogger('test', 'info')
    const child = log.child({ sessionId: 'abc123' })
    child.info('child message')
    expect(logSpy.mock.calls[0][0]).toContain('sessionId=')
    expect(logSpy.mock.calls[0][0]).toContain('abc123')
  })

  it('includes ISO timestamp', () => {
    const log = createLogger('test', 'info')
    log.info('timestamped')
    const output = logSpy.mock.calls[0][0] as string
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T/)
  })
})
