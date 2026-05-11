import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { AGENTS, GATEWAY_PORT } from './config.js'

describe('AGENTS', () => {
  it('is a non-empty array', () => {
    expect(AGENTS.length).toBeGreaterThan(0)
  })

  it('each agent has id, name, and icon', () => {
    for (const agent of AGENTS) {
      expect(agent.id).toBeTruthy()
      expect(agent.name).toBeTruthy()
      expect(agent.icon).toBeTruthy()
    }
  })

  it('has unique agent ids', () => {
    const ids = AGENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes seabri-orchestrator', () => {
    expect(AGENTS.find((a) => a.id === 'seabri-orchestrator')).toBeDefined()
  })

  it('includes core agent set', () => {
    const ids = AGENTS.map((a) => a.id)
    expect(ids).toContain('climate-risk')
    expect(ids).toContain('home-community')
    expect(ids).toContain('investment-screening')
    expect(ids).toContain('general')
  })

  it('has 15 agents', () => {
    expect(AGENTS).toHaveLength(15)
  })
})

describe('GATEWAY_PORT', () => {
  it('is a number', () => {
    expect(typeof GATEWAY_PORT).toBe('number')
  })

  it('defaults to 18790', () => {
    expect(GATEWAY_PORT).toBe(18790)
  })

  it('lets explicit runtime environment override .env values by default', () => {
    const output = execFileSync(
      process.execPath,
      ['--import', 'tsx', '-e', "import('./gateway/config.ts').then((m) => console.log(m.GATEWAY_PORT))"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          GATEWAY_PORT: '19001',
          OPENSEABRI_DOTENV_OVERRIDE: 'false',
        },
        encoding: 'utf8',
      },
    )

    expect(output.trim()).toBe('19001')
  })
})
