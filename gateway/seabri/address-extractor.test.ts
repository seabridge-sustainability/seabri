import { describe, it, expect } from 'vitest'
import { extractAddress } from './address-extractor.js'

describe('extractAddress', () => {
  it('extracts US address with zip', () => {
    expect(extractAddress('What is the flood risk at 123 Main St, Miami, FL 33101?'))
      .toBe('123 Main St, Miami, FL 33101')
  })

  it('extracts address without zip', () => {
    expect(extractAddress('damage at 45 Oak Avenue London')).toBeTruthy()
  })

  it('returns null when no address present', () => {
    expect(extractAddress('what is the weather today')).toBeNull()
  })

  it('handles Avenue abbreviation', () => {
    expect(extractAddress('123 Oak Ave, Chicago IL')).toBeTruthy()
  })

  it('extracts address with zip+4', () => {
    expect(extractAddress('My property is at 500 Elm Drive, Austin, TX 78701-2345'))
      .toContain('500 Elm Drive')
  })

  it('extracts boulevard address', () => {
    expect(extractAddress('Send help to 200 Sunset Blvd, Los Angeles, CA 90028')).toBeTruthy()
  })

  it('returns null for coordinate-only text', () => {
    expect(extractAddress('location: 25.7617, -80.1918')).toBeNull()
  })

  it('returns null for generic sentences', () => {
    expect(extractAddress('Please check the sustainability report')).toBeNull()
  })

  it('trimmed capture does not include trailing punctuation', () => {
    const result = extractAddress('What is the risk at 123 Main St, Miami, FL 33101?')
    expect(result).not.toMatch(/\?$/)
  })
})
