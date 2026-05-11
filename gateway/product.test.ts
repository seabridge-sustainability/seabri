import { describe, it, expect } from 'vitest'
import {
  Product,
  productForChannel,
  isCompanionSurface,
  isHarnessSurface,
} from './product.js'

describe('Product enum', () => {
  it('has two values', () => {
    expect(Product.COMPANION).toBe('companion')
    expect(Product.HARNESS).toBe('harness')
  })
})

describe('productForChannel', () => {
  it.each(['telegram', 'whatsapp', 'sms', 'discord', 'slack', 'web'])(
    'maps %s to COMPANION',
    (id) => {
      expect(productForChannel(id)).toBe(Product.COMPANION)
    }
  )

  it.each(['cli', 'mcp', 'api', 'websocket'])(
    'maps %s to HARNESS',
    (id) => {
      expect(productForChannel(id)).toBe(Product.HARNESS)
    }
  )

  it('defaults unknown channels to COMPANION', () => {
    expect(productForChannel('unknown-channel')).toBe(Product.COMPANION)
  })
})

describe('isCompanionSurface', () => {
  it('returns true for telegram', () => {
    expect(isCompanionSurface('telegram')).toBe(true)
  })

  it('returns false for cli', () => {
    expect(isCompanionSurface('cli')).toBe(false)
  })
})

describe('isHarnessSurface', () => {
  it('returns true for mcp', () => {
    expect(isHarnessSurface('mcp')).toBe(true)
  })

  it('returns false for whatsapp', () => {
    expect(isHarnessSurface('whatsapp')).toBe(false)
  })
})
