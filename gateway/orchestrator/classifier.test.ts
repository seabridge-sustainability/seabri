import { describe, it, expect } from 'vitest'
import { classifyIntent } from './classifier.js'

describe('Intent Classifier', () => {
  describe('climate-risk', () => {
    it('classifies flood questions', () => {
      const result = classifyIntent('What is my flood zone for 123 Main St?')
      expect(result.primaryAgent).toBe('climate-risk')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('classifies wildfire questions', () => {
      const result = classifyIntent('Is my property at risk of wildfire?')
      expect(result.primaryAgent).toBe('climate-risk')
    })

    it('classifies sea level rise', () => {
      const result = classifyIntent('How will sea level rise affect coastal properties?')
      expect(result.primaryAgent).toBe('climate-risk')
    })

    it('classifies extreme heat', () => {
      const result = classifyIntent('What is the extreme heat outlook for Phoenix?')
      expect(result.primaryAgent).toBe('climate-risk')
    })
  })

  describe('nature-biodiversity', () => {
    it('classifies biodiversity questions', () => {
      const result = classifyIntent('What is the biodiversity risk for my supply chain?')
      expect(result.primaryAgent).toBe('nature-biodiversity')
    })

    it('classifies water stress', () => {
      const result = classifyIntent('How does water stress affect our agricultural operations?')
      expect(result.primaryAgent).toBe('nature-biodiversity')
    })

    it('classifies TNFD', () => {
      const result = classifyIntent('Help me with the TNFD LEAP approach')
      expect(result.primaryAgent).toBe('nature-biodiversity')
    })
  })

  describe('sustainability-reporting', () => {
    it('classifies CSRD questions', () => {
      const result = classifyIntent('What are the CSRD requirements for our company?')
      expect(result.primaryAgent).toBe('sustainability-reporting')
    })

    it('classifies TCFD', () => {
      const result = classifyIntent('How do I prepare a TCFD disclosure?')
      expect(result.primaryAgent).toBe('sustainability-reporting')
    })

    it('classifies double materiality', () => {
      const result = classifyIntent('Explain double materiality assessment')
      expect(result.primaryAgent).toBe('sustainability-reporting')
    })
  })

  describe('investment-screening', () => {
    it('classifies portfolio risk', () => {
      const result = classifyIntent('Screen my portfolio for ESG risk exposure')
      expect(result.primaryAgent).toBe('investment-screening')
    })

    it('classifies stranded assets', () => {
      const result = classifyIntent('What is stranded asset risk for oil and gas investments?')
      expect(result.primaryAgent).toBe('investment-screening')
    })
  })

  describe('home-community', () => {
    it('classifies solar panel questions', () => {
      const result = classifyIntent('Should I install solar panels on my roof?')
      expect(result.primaryAgent).toBe('home-community')
    })

    it('classifies IRA credits', () => {
      const result = classifyIntent('What IRA tax credits can I get for a heat pump?')
      expect(result.primaryAgent).toBe('home-community')
    })
  })

  describe('net-zero', () => {
    it('classifies scope questions', () => {
      const result = classifyIntent('How do I measure scope 3 emissions?')
      expect(result.primaryAgent).toBe('net-zero')
    })

    it('classifies SBTi', () => {
      const result = classifyIntent('How do I set science based targets with SBTi?')
      expect(result.primaryAgent).toBe('net-zero')
    })

    it('classifies carbon offsets', () => {
      const result = classifyIntent('Are carbon offsets worth buying for our company?')
      expect(result.primaryAgent).toBe('net-zero')
    })
  })

  describe('natural-capital', () => {
    it('classifies carbon market questions', () => {
      const result = classifyIntent('How does the voluntary carbon market work for landowners?')
      expect(result.primaryAgent).toBe('natural-capital')
    })

    it('classifies USDA programs', () => {
      const result = classifyIntent('What EQIP payments can I get from NRCS?')
      expect(result.primaryAgent).toBe('natural-capital')
    })

    it('classifies conservation easements', () => {
      const result = classifyIntent('How do conservation easements and land trusts work?')
      expect(result.primaryAgent).toBe('natural-capital')
    })
  })

  describe('general / fallback', () => {
    it('falls back to general for vague queries', () => {
      const result = classifyIntent('Hello, how are you?')
      expect(result.primaryAgent).toBe('general')
      expect(result.confidence).toBeLessThanOrEqual(0.5)
    })

    it('falls back for unrelated queries', () => {
      const result = classifyIntent('What is the weather today?')
      expect(result.primaryAgent).toBe('general')
    })
  })

  describe('multi-agent detection', () => {
    it('detects cross-domain queries', () => {
      const result = classifyIntent(
        'Assess the flood risk and biodiversity impact of the deforestation in our watershed area with water stress analysis',
      )
      expect(result.secondaryAgents.length).toBeGreaterThan(0)
    })

    it('returns confidence below 1', () => {
      const result = classifyIntent(
        'Compare the climate risk and ESG investment screening for our portfolio',
      )
      expect(result.confidence).toBeLessThan(1)
    })
  })
})
