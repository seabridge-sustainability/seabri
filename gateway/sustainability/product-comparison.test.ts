import { describe, expect, it } from 'vitest'
import { compareProducts } from './product-comparison.js'
import { executeTool, getToolDefinition } from '../tools/registry.js'
import { registerBuiltinTools } from '../tools/register-builtin.js'

describe('compareProducts', () => {
  it('compares two products and returns a concise recommendation', () => {
    const result = compareProducts({
      products: [
        {
          name: 'Repairable steel bottle',
          attributes: {
            durable: true,
            repairable: true,
            reusable: true,
            minimalPackaging: true,
            local: true,
          },
        },
        {
          name: 'Single-use plastic bottle',
          attributes: {
            durable: false,
            repairable: false,
            reusable: false,
            minimalPackaging: false,
            local: false,
          },
        },
      ],
      priorities: ['durability', 'repairability', 'packaging'],
    })

    expect(result.recommendation).toContain('Repairable steel bottle')
    expect(result.products[0].sustainabilityScore).toBeGreaterThan(result.products[1].sustainabilityScore)
  })

  it('handles missing data without inventing certifications', () => {
    const result = compareProducts({
      products: [
        { name: 'Unknown detergent' },
        { name: 'Refill detergent', attributes: { reusable: true } },
      ],
    })

    expect(result.unknowns).toContain('certifications not provided or not verified')
    expect(result.products[0].considerations.certifications).toContain('no certifications invented')
    expect(result.products[0].sourceStatus).toBe('unknown')
  })

  it('rejects malformed input with a validation error instead of scoring fake data', () => {
    expect(() => compareProducts({ products: [{ name: 'Only one option' }] })).toThrow()
  })

  it('is exposed through the tool registry', async () => {
    registerBuiltinTools()
    expect(getToolDefinition('compare_products')).toBeDefined()
    const output = await executeTool('compare_products', {
      products: [
        { name: 'Local refurbished laptop', attributes: { durable: true, repairable: true, local: true } },
        { name: 'New disposable device', attributes: { durable: false, repairable: false } },
      ],
    })
    const parsed = JSON.parse(output) as { recommendation: string }
    expect(parsed.recommendation).toContain('Local refurbished laptop')
  })
})
