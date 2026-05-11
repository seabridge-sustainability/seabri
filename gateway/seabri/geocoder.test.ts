import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { geocodeCoordinates, geocodeAddress, type GeocodeResult } from './geocoder.js'

const NOMINATIM_RESULT = {
  display_name: '123 Main Street, Miami, Miami-Dade County, Florida, 33101, United States',
  lat: '25.7617',
  lon: '-80.1918',
  address: {
    road: 'Main Street',
    city: 'Miami',
    state: 'Florida',
    country: 'United States',
    postcode: '33101',
  },
}

const GOOGLE_RESULT = {
  status: 'OK',
  results: [
    {
      formatted_address: '123 Main St, Miami, FL 33101, USA',
      geometry: { location: { lat: 25.7617, lng: -80.1918 } },
      address_components: [
        { types: ['locality'], long_name: 'Miami', short_name: 'Miami' },
        { types: ['administrative_area_level_1'], long_name: 'Florida', short_name: 'FL' },
        { types: ['country'], long_name: 'United States', short_name: 'US' },
        { types: ['postal_code'], long_name: '33101', short_name: '33101' },
      ],
    },
  ],
}

const originalEnv = { ...process.env }

function mockFetch(responseBody: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    })
  )
}

beforeEach(() => {
  delete process.env.GOOGLE_MAPS_KEY
})

afterEach(() => {
  vi.unstubAllGlobals()
  for (const key of ['GOOGLE_MAPS_KEY']) {
    if (key in originalEnv) {
      process.env[key] = originalEnv[key]
    } else {
      delete process.env[key]
    }
  }
})

describe('geocodeCoordinates — Nominatim fallback', () => {
  it('returns GeocodeResult with formattedAddress', async () => {
    mockFetch(NOMINATIM_RESULT)
    const result = await geocodeCoordinates(25.7617, -80.1918)
    expect(result.formattedAddress).toContain('Miami')
  })

  it('returns correct lat/lng', async () => {
    mockFetch(NOMINATIM_RESULT)
    const result = await geocodeCoordinates(25.7617, -80.1918)
    expect(result.lat).toBeCloseTo(25.7617)
    expect(result.lng).toBeCloseTo(-80.1918)
  })

  it('populates city, state, country, postalCode', async () => {
    mockFetch(NOMINATIM_RESULT)
    const result = await geocodeCoordinates(25.7617, -80.1918)
    expect(result.city).toBe('Miami')
    expect(result.state).toBe('Florida')
    expect(result.country).toBe('United States')
    expect(result.postalCode).toBe('33101')
  })

  it('calls Nominatim reverse endpoint', async () => {
    mockFetch(NOMINATIM_RESULT)
    await geocodeCoordinates(10, 20)
    const calls = vi.mocked(fetch).mock.calls
    expect(calls[0][0]).toContain('nominatim.openstreetmap.org/reverse')
    expect(calls[0][0]).toContain('lat=10')
    expect(calls[0][0]).toContain('lon=20')
  })
})

describe('geocodeCoordinates — Google Maps', () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_KEY = 'test-key'
  })

  it('uses Google reverse geocode when key is set', async () => {
    mockFetch(GOOGLE_RESULT)
    const result = await geocodeCoordinates(25.7617, -80.1918)
    expect(result.formattedAddress).toContain('Miami')
    const calls = vi.mocked(fetch).mock.calls
    expect(calls[0][0]).toContain('maps.googleapis.com')
  })

  it('returns city from Google result', async () => {
    mockFetch(GOOGLE_RESULT)
    const result = await geocodeCoordinates(25.7617, -80.1918)
    expect(result.city).toBe('Miami')
  })
})

describe('geocodeAddress', () => {
  it('returns result from Nominatim search', async () => {
    mockFetch([NOMINATIM_RESULT])
    const result = await geocodeAddress('123 Main St, Miami FL')
    expect(result).not.toBeNull()
    expect((result as GeocodeResult).formattedAddress).toContain('Miami')
  })

  it('returns null when Nominatim returns empty array', async () => {
    mockFetch([])
    const result = await geocodeAddress('zzznonexistentzz')
    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const result = await geocodeAddress('some address')
    expect(result).toBeNull()
  })

  it('uses Google forward geocode when key is set', async () => {
    process.env.GOOGLE_MAPS_KEY = 'test-key'
    mockFetch(GOOGLE_RESULT)
    const result = await geocodeAddress('123 Main St Miami FL')
    expect(result).not.toBeNull()
    const calls = vi.mocked(fetch).mock.calls
    expect(calls[0][0]).toContain('maps.googleapis.com')
  })
})
