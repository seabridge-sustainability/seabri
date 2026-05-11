import { describe, it, expect } from 'vitest'
import { rankByTfIdf } from './rag.js'

const corpus = [
  { id: 'carbon', text: 'Carbon footprint tracking and greenhouse gas emissions monitoring' },
  { id: 'flood', text: 'Flood risk assessment coastal inland riverine water damage' },
  { id: 'energy', text: 'Energy efficiency building performance electricity consumption' },
  { id: 'biodiversity', text: 'Biodiversity impact habitat ecosystem species conservation' },
]

describe('rankByTfIdf', () => {
  it('returns empty array for empty corpus', () => {
    expect(rankByTfIdf('carbon', [])).toEqual([])
  })

  it('returns all items with score 0 for empty query', () => {
    const results = rankByTfIdf('', corpus)
    expect(results).toHaveLength(4)
    for (const r of results) {
      expect(r.score).toBe(0)
    }
  })

  it('ranks matching document highest', () => {
    const results = rankByTfIdf('carbon emissions greenhouse gas', corpus)
    expect(results[0].id).toBe('carbon')
    expect(results[0].score).toBeGreaterThan(0)
  })

  it('ranks flood document first for flood query', () => {
    const results = rankByTfIdf('flood risk coastal water', corpus)
    expect(results[0].id).toBe('flood')
  })

  it('ranks energy document first for energy query', () => {
    const results = rankByTfIdf('energy efficiency building electricity', corpus)
    expect(results[0].id).toBe('energy')
  })

  it('ranks biodiversity document first for habitat query', () => {
    const results = rankByTfIdf('biodiversity habitat species', corpus)
    expect(results[0].id).toBe('biodiversity')
  })

  it('returns scores sorted descending', () => {
    const results = rankByTfIdf('carbon energy', corpus)
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
    }
  })

  it('all scores are between 0 and 1', () => {
    const results = rankByTfIdf('flood risk assessment', corpus)
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(1)
    }
  })

  it('handles single-word query', () => {
    const results = rankByTfIdf('flood', corpus)
    expect(results[0].id).toBe('flood')
    expect(results[0].score).toBeGreaterThan(0)
  })

  it('handles query with no matching terms', () => {
    const results = rankByTfIdf('xyzzy foobar', corpus)
    for (const r of results) {
      expect(r.score).toBe(0)
    }
  })

  it('handles single-document corpus', () => {
    const results = rankByTfIdf('carbon', [{ id: 'only', text: 'carbon tracking' }])
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('only')
  })

  it('strips punctuation from query and corpus', () => {
    const results = rankByTfIdf('carbon!', [
      { id: 'a', text: 'carbon, emissions, tracking.' },
    ])
    expect(results[0].score).toBeGreaterThan(0)
  })

  it('is case-insensitive', () => {
    const results = rankByTfIdf('CARBON EMISSIONS', corpus)
    expect(results[0].id).toBe('carbon')
    expect(results[0].score).toBeGreaterThan(0)
  })
})
