/**
 * Municipal Lookup Adapter
 *
 * Defines the contract for water restriction lookups, recycling acceptance rules,
 * hazardous drop-off sites, rebates, and public works contacts.
 *
 * Default (NotAvailable) adapter: returns not_verified with a referral message.
 * Fixture adapter: returns labeled example-only data for tests.
 *
 * Factory reads env var OPENSEABRI_MUNICIPAL_ADAPTER:
 *   'fixture' → FixtureMunicipalAdapter
 *   otherwise → NotAvailableMunicipalAdapter
 *
 * No live provider calls are made by either adapter in this module.
 */

// ── Result types ──────────────────────────────────────────────────────────────

export interface MunicipalLookupResult {
  status: 'not_verified' | 'fixture' | 'ok' | 'error'
  message: string
  source?: string
}

export interface WaterRestrictionResult extends MunicipalLookupResult {
  restrictions?: Array<{
    description: string
    scheduleOrStage: string
    violationNote: string
  }>
}

export interface RecyclingRuleResult extends MunicipalLookupResult {
  acceptedMaterials?: string[]
  rejectedMaterials?: string[]
  pickupScheduleNote?: string
}

export interface HazardousDropoffResult extends MunicipalLookupResult {
  sites?: Array<{
    name: string
    address: string
    acceptedCategories: string[]
    hoursNote: string
  }>
}

export interface RebateResult extends MunicipalLookupResult {
  rebates?: Array<{
    programName: string
    description: string
    eligibilityNote: string
    applyUrl?: string
  }>
}

export interface PublicWorksContactResult extends MunicipalLookupResult {
  contacts?: Array<{
    department: string
    phone?: string
    website?: string
    hoursNote: string
  }>
}

// ── Adapter interface ─────────────────────────────────────────────────────────

export interface MunicipalLookupAdapter {
  /**
   * Identifier for this adapter (used in logging/diagnostics).
   */
  readonly adapterId: string

  /**
   * Water restriction schedule or drought stage for the given location.
   * @param location City, ZIP, or address string.
   */
  getWaterRestrictions(location: string): Promise<WaterRestrictionResult>

  /**
   * Recycling acceptance rules for the given location.
   * @param location City, ZIP, or address string.
   */
  getRecyclingRules(location: string): Promise<RecyclingRuleResult>

  /**
   * Household hazardous waste and e-waste drop-off sites near the given location.
   * @param location City, ZIP, or address string.
   */
  getHazardousDropoffSites(location: string): Promise<HazardousDropoffResult>

  /**
   * Municipal rebate programs (energy, water, weatherization, etc.) for the given location.
   * @param location City, ZIP, or address string.
   */
  getRebates(location: string): Promise<RebateResult>

  /**
   * Public works department contacts for the given location.
   * @param location City, ZIP, or address string.
   */
  getPublicWorksContacts(location: string): Promise<PublicWorksContactResult>
}

// ── NotAvailableMunicipalAdapter (default production) ────────────────────────

const NOT_AVAILABLE_MESSAGE =
  'Municipal data not configured for this location. Contact your local utility or public works department.'

export class NotAvailableMunicipalAdapter implements MunicipalLookupAdapter {
  readonly adapterId = 'not_available'

  async getWaterRestrictions(_location: string): Promise<WaterRestrictionResult> {
    return { status: 'not_verified', message: NOT_AVAILABLE_MESSAGE }
  }

  async getRecyclingRules(_location: string): Promise<RecyclingRuleResult> {
    return { status: 'not_verified', message: NOT_AVAILABLE_MESSAGE }
  }

  async getHazardousDropoffSites(_location: string): Promise<HazardousDropoffResult> {
    return { status: 'not_verified', message: NOT_AVAILABLE_MESSAGE }
  }

  async getRebates(_location: string): Promise<RebateResult> {
    return { status: 'not_verified', message: NOT_AVAILABLE_MESSAGE }
  }

  async getPublicWorksContacts(_location: string): Promise<PublicWorksContactResult> {
    return { status: 'not_verified', message: NOT_AVAILABLE_MESSAGE }
  }
}

// ── FixtureMunicipalAdapter (test / fixture mode) ────────────────────────────

const FIXTURE_DISCLAIMER =
  'EXAMPLE DATA ONLY — not verified, not from a live source. For testing purposes only. Do not use for real decisions.'

export class FixtureMunicipalAdapter implements MunicipalLookupAdapter {
  readonly adapterId = 'fixture'

  async getWaterRestrictions(location: string): Promise<WaterRestrictionResult> {
    return {
      status: 'fixture',
      message: FIXTURE_DISCLAIMER,
      source: 'fixture',
      restrictions: [
        {
          description: `Example Stage 2 water restriction for ${location} (fixture — not real).`,
          scheduleOrStage: 'Stage 2 — odd/even watering schedule on Monday/Thursday only before 10am or after 6pm.',
          violationNote: 'Example: violations may result in a warning notice (fixture data, not verified).',
        },
      ],
    }
  }

  async getRecyclingRules(location: string): Promise<RecyclingRuleResult> {
    return {
      status: 'fixture',
      message: FIXTURE_DISCLAIMER,
      source: 'fixture',
      acceptedMaterials: [
        'Cardboard (flattened, dry) — EXAMPLE ONLY',
        'Plastic bottles #1 and #2 — EXAMPLE ONLY',
        'Aluminum cans — EXAMPLE ONLY',
        'Glass bottles and jars — EXAMPLE ONLY',
      ],
      rejectedMaterials: [
        'Plastic bags (take to store drop-off) — EXAMPLE ONLY',
        'Styrofoam — EXAMPLE ONLY',
        'Electronics (see hazardous drop-off) — EXAMPLE ONLY',
      ],
      pickupScheduleNote: `Example: bi-weekly recycling pickup for ${location} area (fixture — not real).`,
    }
  }

  async getHazardousDropoffSites(location: string): Promise<HazardousDropoffResult> {
    return {
      status: 'fixture',
      message: FIXTURE_DISCLAIMER,
      source: 'fixture',
      sites: [
        {
          name: `Example County HHW Facility (fixture — not verified near ${location})`,
          address: '1 Example Blvd, Example City, EX 00000 — FIXTURE DATA',
          acceptedCategories: ['Paint', 'Batteries', 'Electronics', 'Oils', 'Chemicals'],
          hoursNote: 'Example: Saturdays 8am–2pm — FIXTURE DATA, verify before visit.',
        },
      ],
    }
  }

  async getRebates(location: string): Promise<RebateResult> {
    return {
      status: 'fixture',
      message: FIXTURE_DISCLAIMER,
      source: 'fixture',
      rebates: [
        {
          programName: `Example Utility Rebate for ${location} — FIXTURE`,
          description: 'Example: up to $100 rebate for qualifying ENERGY STAR appliances — FIXTURE DATA, not verified.',
          eligibilityNote: 'Example: must be a residential customer and purchase from an approved retailer — FIXTURE DATA.',
          applyUrl: undefined,
        },
        {
          programName: 'Example Water Authority Conservation Rebate — FIXTURE',
          description: 'Example: rebate for high-efficiency toilets and irrigation controllers — FIXTURE DATA, not verified.',
          eligibilityNote: 'Example: applies to residential customers within service area — FIXTURE DATA.',
          applyUrl: undefined,
        },
      ],
    }
  }

  async getPublicWorksContacts(location: string): Promise<PublicWorksContactResult> {
    return {
      status: 'fixture',
      message: FIXTURE_DISCLAIMER,
      source: 'fixture',
      contacts: [
        {
          department: `Example Public Works — ${location} (FIXTURE DATA, not real)`,
          phone: undefined,
          website: undefined,
          hoursNote: 'Example: Mon–Fri 8am–5pm — FIXTURE DATA, verify before contacting.',
        },
      ],
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Returns the configured MunicipalLookupAdapter based on the
 * OPENSEABRI_MUNICIPAL_ADAPTER environment variable.
 *
 * 'fixture' → FixtureMunicipalAdapter (for testing)
 * otherwise → NotAvailableMunicipalAdapter (default production)
 */
export function getMunicipalAdapter(): MunicipalLookupAdapter {
  const adapterEnv = (process.env.OPENSEABRI_MUNICIPAL_ADAPTER ?? '').toLowerCase().trim()
  if (adapterEnv === 'fixture') {
    return new FixtureMunicipalAdapter()
  }
  return new NotAvailableMunicipalAdapter()
}
