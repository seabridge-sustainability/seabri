export { CarbonTracker, estimateRequestCarbon } from './carbon-tracker.js'
export type { CarbonEstimate, SessionCarbonSummary, CarbonEquivalents } from './carbon-tracker.js'

export {
  computeOverallScore,
  createSustainabilityScore,
  scoreToBand,
  formatScoreReport,
} from './scoring.js'
export type {
  SustainabilityDimension,
  DimensionScore,
  SustainabilityScore,
} from './scoring.js'

export { compareProducts, CompareProductsInputSchema, ProductOptionSchema } from './product-comparison.js'
export type { CompareProductsInput, ProductComparisonResult } from './product-comparison.js'
