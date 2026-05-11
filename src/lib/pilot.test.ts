import { describe, expect, it } from 'vitest'
import {
  addPilotActivity,
  buildProfileLocation,
  emptyPilotState,
  isProfileReady,
  pilotIncidentPrompt,
  sanitizePilotDetail,
} from './pilot.js'

describe('pilot state helpers', () => {
  it('detects complete and incomplete pilot profiles', () => {
    const state = emptyPilotState()
    expect(isProfileReady(state.profile)).toBe(false)
    expect(isProfileReady({
      ...state.profile,
      name: 'Alex Rivera',
      address: '123 Water St',
      zip: '33101',
      phone: '+13055550100',
      preferredLanguage: 'English',
    })).toBe(true)
  })

  it('redacts phone, address, and ZIP from activity details', () => {
    const sanitized = sanitizePilotDetail('Called +1 305 555 0100 for 123 Water St near 33101')
    expect(sanitized).toContain('[phone redacted]')
    expect(sanitized).toContain('[address redacted]')
    expect(sanitized).toContain('[zip redacted]')
    expect(sanitized).not.toContain('305 555 0100')
    expect(sanitized).not.toContain('123 Water St')
  })

  it('adds bounded activity history without leaking profile details', () => {
    const state = addPilotActivity(emptyPilotState(), {
      workflow: 'incident',
      title: 'Incident started',
      detail: 'Bathroom flood at 123 Water St, 33101, call +13055550100',
    })
    expect(state.activity).toHaveLength(1)
    expect(state.activity[0].title).toBe('Incident started')
    expect(state.activity[0].detail).not.toContain('123 Water St')
    expect(state.activity[0].detail).not.toContain('+13055550100')
  })

  it('builds location and incident prompt for profile-backed flows', () => {
    const state = emptyPilotState()
    const profile = { ...state.profile, address: '123 Water St', city: 'Miami', state: 'FL', zip: '33101' }
    expect(buildProfileLocation(profile)).toBe('123 Water St, Miami, FL, 33101')
    expect(pilotIncidentPrompt('My bathroom is flooding', 'photo.jpg')).toContain('photo.jpg')
  })
})
