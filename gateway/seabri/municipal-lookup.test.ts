import { afterEach, describe, expect, it } from 'vitest'
import {
  FixtureMunicipalAdapter,
  NotAvailableMunicipalAdapter,
  getMunicipalAdapter,
} from './municipal-lookup.js'

const NOT_AVAILABLE_MESSAGE =
  'Municipal data not configured for this location. Contact your local utility or public works department.'

afterEach(() => {
  delete process.env.OPENSEABRI_MUNICIPAL_ADAPTER
})

describe('getMunicipalAdapter factory', () => {
  it('returns NotAvailableMunicipalAdapter by default (no env var)', () => {
    const adapter = getMunicipalAdapter()
    expect(adapter).toBeInstanceOf(NotAvailableMunicipalAdapter)
    expect(adapter.adapterId).toBe('not_available')
  })

  it('returns NotAvailableMunicipalAdapter when env var is unrecognized', () => {
    process.env.OPENSEABRI_MUNICIPAL_ADAPTER = 'live_provider'
    const adapter = getMunicipalAdapter()
    expect(adapter).toBeInstanceOf(NotAvailableMunicipalAdapter)
  })

  it('returns FixtureMunicipalAdapter when env var is "fixture"', () => {
    process.env.OPENSEABRI_MUNICIPAL_ADAPTER = 'fixture'
    const adapter = getMunicipalAdapter()
    expect(adapter).toBeInstanceOf(FixtureMunicipalAdapter)
    expect(adapter.adapterId).toBe('fixture')
  })

  it('returns FixtureMunicipalAdapter for case-insensitive "FIXTURE"', () => {
    process.env.OPENSEABRI_MUNICIPAL_ADAPTER = 'FIXTURE'
    const adapter = getMunicipalAdapter()
    expect(adapter).toBeInstanceOf(FixtureMunicipalAdapter)
  })
})

describe('NotAvailableMunicipalAdapter', () => {
  const adapter = new NotAvailableMunicipalAdapter()

  it('returns not_verified status for water restrictions', async () => {
    const result = await adapter.getWaterRestrictions('Miami FL 33101')
    expect(result.status).toBe('not_verified')
    expect(result.message).toBe(NOT_AVAILABLE_MESSAGE)
  })

  it('returns not_verified status for recycling rules', async () => {
    const result = await adapter.getRecyclingRules('33101')
    expect(result.status).toBe('not_verified')
    expect(result.message).toBe(NOT_AVAILABLE_MESSAGE)
  })

  it('returns not_verified status for hazardous drop-off sites', async () => {
    const result = await adapter.getHazardousDropoffSites('Miami')
    expect(result.status).toBe('not_verified')
    expect(result.message).toBe(NOT_AVAILABLE_MESSAGE)
  })

  it('returns not_verified status for rebates', async () => {
    const result = await adapter.getRebates('Miami FL')
    expect(result.status).toBe('not_verified')
    expect(result.message).toBe(NOT_AVAILABLE_MESSAGE)
  })

  it('returns not_verified status for public works contacts', async () => {
    const result = await adapter.getPublicWorksContacts('Miami FL')
    expect(result.status).toBe('not_verified')
    expect(result.message).toBe(NOT_AVAILABLE_MESSAGE)
  })

  it('does not include live contact data', async () => {
    const restriction = await adapter.getWaterRestrictions('Any Location')
    expect(restriction.restrictions).toBeUndefined()
    const recycling = await adapter.getRecyclingRules('Any Location')
    expect(recycling.acceptedMaterials).toBeUndefined()
    const hazardous = await adapter.getHazardousDropoffSites('Any Location')
    expect(hazardous.sites).toBeUndefined()
    const rebate = await adapter.getRebates('Any Location')
    expect(rebate.rebates).toBeUndefined()
    const contacts = await adapter.getPublicWorksContacts('Any Location')
    expect(contacts.contacts).toBeUndefined()
  })
})

describe('FixtureMunicipalAdapter', () => {
  const adapter = new FixtureMunicipalAdapter()

  it('returns fixture status for all lookup types', async () => {
    const restriction = await adapter.getWaterRestrictions('33101')
    expect(restriction.status).toBe('fixture')
    const recycling = await adapter.getRecyclingRules('33101')
    expect(recycling.status).toBe('fixture')
    const hazardous = await adapter.getHazardousDropoffSites('33101')
    expect(hazardous.status).toBe('fixture')
    const rebate = await adapter.getRebates('33101')
    expect(rebate.status).toBe('fixture')
    const contacts = await adapter.getPublicWorksContacts('33101')
    expect(contacts.status).toBe('fixture')
  })

  it('labels all fixture data with EXAMPLE ONLY or FIXTURE disclaimer in messages', async () => {
    const restriction = await adapter.getWaterRestrictions('33101')
    expect(restriction.message).toMatch(/EXAMPLE DATA ONLY|fixture|not verified/i)
    const recycling = await adapter.getRecyclingRules('33101')
    expect(recycling.message).toMatch(/EXAMPLE DATA ONLY|fixture|not verified/i)
  })

  it('fixture water restrictions include EXAMPLE label in description', async () => {
    const result = await adapter.getWaterRestrictions('Test City')
    expect(result.restrictions).toBeDefined()
    expect(result.restrictions!.length).toBeGreaterThan(0)
    const desc = result.restrictions![0].description
    expect(desc).toMatch(/fixture|example/i)
  })

  it('fixture recycling rules include EXAMPLE ONLY label in materials', async () => {
    const result = await adapter.getRecyclingRules('Test City')
    expect(result.acceptedMaterials).toBeDefined()
    const firstMaterial = result.acceptedMaterials![0]
    expect(firstMaterial).toMatch(/EXAMPLE ONLY/i)
    expect(result.rejectedMaterials).toBeDefined()
    const firstRejected = result.rejectedMaterials![0]
    expect(firstRejected).toMatch(/EXAMPLE ONLY/i)
  })

  it('fixture hazardous sites include FIXTURE DATA label', async () => {
    const result = await adapter.getHazardousDropoffSites('Test City')
    expect(result.sites).toBeDefined()
    expect(result.sites!.length).toBeGreaterThan(0)
    const site = result.sites![0]
    expect(site.name).toMatch(/fixture|FIXTURE/i)
    expect(site.address).toMatch(/FIXTURE DATA/i)
  })

  it('fixture rebates include FIXTURE label and no live apply URL', async () => {
    const result = await adapter.getRebates('Test City')
    expect(result.rebates).toBeDefined()
    expect(result.rebates!.length).toBeGreaterThan(0)
    const rebate = result.rebates![0]
    expect(rebate.programName).toMatch(/FIXTURE/i)
    // Fixture adapter does not invent live URLs
    expect(rebate.applyUrl).toBeUndefined()
  })

  it('fixture public works contacts do not include phone or website (no fake data)', async () => {
    const result = await adapter.getPublicWorksContacts('Test City')
    expect(result.contacts).toBeDefined()
    expect(result.contacts!.length).toBeGreaterThan(0)
    const contact = result.contacts![0]
    // Fixture must not invent real phone or website numbers
    expect(contact.phone).toBeUndefined()
    expect(contact.website).toBeUndefined()
  })

  it('includes source field set to fixture', async () => {
    const result = await adapter.getWaterRestrictions('Anywhere')
    expect(result.source).toBe('fixture')
  })
})
