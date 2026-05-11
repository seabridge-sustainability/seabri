import { describe, expect, it } from 'vitest'
import { runIncidentWorkflow } from './incident-workflow.js'

describe('Living Companion incident workflow', () => {
  it('answers bathroom flooding with short action-first incident mode', () => {
    const result = runIncidentWorkflow({ message: 'My bathroom is flooding.' })

    expect(result.handled).toBe(true)
    expect(result.mode).toBe('incident')
    expect(result.response).toContain('IMMEDIATE STEPS')
    expect(result.response).toContain('Question:')
    expect(result.response!.split('\n').length).toBeLessThanOrEqual(8)
    expect(result.response).not.toMatch(/stack|OPENAI_API_KEY|Anthropic|exception|undefined/i)
  })

  it('extracts first-session profile details from a flood reply', () => {
    const result = runIncidentWorkflow({
      message: 'I am safe. Alex Rivera, 45 Water St, Miami FL 33101, 305-555-1212. The bathroom is flooding.',
    })

    expect(result.handled).toBe(true)
    expect(result.profileUpdates).toMatchObject({
      name: 'Alex Rivera',
      zip: '33101',
      phone: '+13055551212',
    })
    expect(result.response).toContain('Are people, pets, and electricity safe')
  })

  it('remembers latest policy text and extracts water/flood/sewer terms on follow-up', () => {
    const result = runIncidentWorkflow({
      message: 'Does my uploaded policy cover this bathroom flooding?',
      history: [
        {
          role: 'user',
          content:
            '[PDF: policy.pdf]\nCoverage D: $12,000\nWater backup endorsement: $5,000\nFlood is excluded\nSump overflow deductible: $1,000',
        },
      ],
    })

    expect(result.handled).toBe(true)
    expect(result.mode).toBe('insurance_document')
    expect(result.response).toContain('Water/sewer backup endorsement')
    expect(result.response).toContain('Flood exclusion')
    expect(result.response).toContain('Loss of Use')
  })

  it('keeps media continuity for photo follow-up questions', () => {
    const result = runIncidentWorkflow({
      message: 'What do you see in the photo?',
      history: [
        { role: 'user', content: 'My bathroom is flooding.' },
        { role: 'user', content: '[image/jpeg photo attached: bathroom-water.jpg]' },
      ],
    })

    expect(result.handled).toBe(true)
    expect(result.mode).toBe('photo_followup')
    expect(result.response).toContain('latest photo/document')
    expect(result.response).toContain('insurer wording')
  })

  it('ranks local help options when a location is known', () => {
    const result = runIncidentWorkflow({
      message: 'Find me a plumber and water mitigation nearby',
      history: [
        { role: 'user', content: 'My bathroom is flooding.' },
        { role: 'user', content: 'Alex Rivera, 45 Water St, Miami FL 33101, 305-555-1212' },
      ],
    })

    expect(result.handled).toBe(true)
    expect(result.mode).toBe('local_help')
    expect(result.response).toContain('Emergency plumber')
    expect(result.response).toContain('Water mitigation')
    expect(result.response).toContain('public works')
  })

  it('requires an exact number before preparing executable outbound action', () => {
    const result = runIncidentWorkflow({
      message: 'Call a plumber for me',
      history: [{ role: 'user', content: 'My bathroom is flooding.' }],
    })

    expect(result.handled).toBe(true)
    expect(result.mode).toBe('action_preparation')
    expect(result.response).toContain('need the exact phone number')
    expect(result.response).not.toContain('Confirm? Reply YES')
  })

  it('creates an approval-gated action card only when an exact number is provided', () => {
    const result = runIncidentWorkflow({
      message: 'Call the plumber at 305-555-0199',
      history: [
        { role: 'user', content: 'My bathroom is flooding.' },
        { role: 'user', content: 'Alex Rivera, 45 Water St, Miami FL 33101, 305-555-1212' },
      ],
    })

    expect(result.handled).toBe(true)
    expect(result.mode).toBe('action_preparation')
    expect(result.response).toContain('PROPOSED ACTION')
    expect(result.response).toContain('Confirm? Reply YES')
    expect(result.response).toContain('305-555-0199')
  })
})
