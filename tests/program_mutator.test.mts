import { test } from 'node:test'
import assert from 'node:assert/strict'

const { deriveMutationFromReport } = await import('../research/program_mutator.ts')

test('deriveMutationFromReport classifies "specific" notes as effective patterns', () => {
  const result = deriveMutationFromReport(['be more specific about regions'])
  assert.deepEqual(result.effectivePatterns, ['be more specific about regions'])
  assert.deepEqual(result.qualityObservations, [])
  assert.deepEqual(result.topicsToPrioritize, [])
})

test('deriveMutationFromReport classifies "framing" notes as effective patterns', () => {
  const result = deriveMutationFromReport(['improve framing of water-risk queries'])
  assert.equal(result.effectivePatterns?.length, 1)
  assert.equal(result.qualityObservations?.length, 0)
})

test('deriveMutationFromReport classifies "quality" notes as observations', () => {
  const result = deriveMutationFromReport(['quality threshold too low'])
  assert.equal(result.qualityObservations?.length, 1)
  assert.equal(result.effectivePatterns?.length, 0)
})

test('deriveMutationFromReport classifies "expand" notes as topics to prioritize', () => {
  const result = deriveMutationFromReport(['expand coverage of TNFD disclosures'])
  assert.equal(result.topicsToPrioritize?.length, 1)
  assert.equal(result.topicsToPrioritize?.[0]?.reason, 'expand coverage of TNFD disclosures')
})

test('deriveMutationFromReport falls back to observations for uncategorized notes', () => {
  const result = deriveMutationFromReport(['random unrelated note'])
  assert.equal(result.qualityObservations?.length, 1)
  assert.equal(result.effectivePatterns?.length, 0)
  assert.equal(result.topicsToPrioritize?.length, 0)
})

test('deriveMutationFromReport returns empty arrays for empty input', () => {
  const result = deriveMutationFromReport([])
  assert.deepEqual(result.effectivePatterns, [])
  assert.deepEqual(result.qualityObservations, [])
  assert.deepEqual(result.topicsToDeprioritize, [])
  assert.deepEqual(result.topicsToPrioritize, [])
})
