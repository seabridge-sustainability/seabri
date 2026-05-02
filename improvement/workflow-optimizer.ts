export interface StepProfile {
  stepId: string
  model: string
  avgLatencyMs: number
  avgCostUsd: number
  successRate: number
  dependsOn: string[]
}

export interface WorkflowProfile {
  workflowId: string
  steps: StepProfile[]
  totalAvgLatencyMs: number
  totalAvgCostUsd: number
}

export interface WorkflowAnalysis {
  slowestStepId: string | undefined
  mostExpensiveStepId: string | undefined
  parallelizableGroups: string[][]
  overpoweredStepIds: string[]
}

export type SuggestionType = 'downgrade_model' | 'parallelize' | 'cache'

export interface OptimizationSuggestion {
  type: SuggestionType
  stepId?: string
  stepIds?: string[]
  description: string
  estimatedCostSavingUsd?: number
  estimatedLatencySavingMs?: number
}

// Model cost tiers — higher tier = more expensive
const MODEL_TIER: Record<string, number> = {
  'claude-haiku-4-5-20251001': 1,
  'claude-haiku-4-5': 1,
  'claude-sonnet-4-6': 2,
  'claude-opus-4-7': 3,
  'claude-opus-4-6': 3,
}

function getTier(model: string): number {
  return MODEL_TIER[model] ?? 2
}

// A step is "over-powered" if it uses tier-3 and could likely use tier-2
const OVER_POWERED_THRESHOLD = 3

function buildTransitiveDeps(steps: StepProfile[]): Map<string, Set<string>> {
  const directDeps = new Map<string, Set<string>>()
  for (const s of steps) directDeps.set(s.stepId, new Set(s.dependsOn))

  // Floyd-Warshall style transitive closure
  const allIds = steps.map((s) => s.stepId)
  const reachable = new Map<string, Set<string>>()
  for (const id of allIds) reachable.set(id, new Set(directDeps.get(id)!))

  let changed = true
  while (changed) {
    changed = false
    for (const id of allIds) {
      const deps = reachable.get(id)!
      for (const dep of [...deps]) {
        for (const transitive of reachable.get(dep) ?? []) {
          if (!deps.has(transitive)) {
            deps.add(transitive)
            changed = true
          }
        }
      }
    }
  }
  return reachable
}

function findParallelizableGroups(steps: StepProfile[]): string[][] {
  const transitive = buildTransitiveDeps(steps)
  const groups: string[][] = []
  const assigned = new Set<string>()

  for (const step of steps) {
    if (assigned.has(step.stepId)) continue
    const peers = steps.filter(
      (other) =>
        other.stepId !== step.stepId &&
        !assigned.has(other.stepId) &&
        !transitive.get(other.stepId)!.has(step.stepId) &&
        !transitive.get(step.stepId)!.has(other.stepId),
    )
    if (peers.length > 0) {
      const group = [step.stepId, ...peers.map((p) => p.stepId)]
      group.forEach((id) => assigned.add(id))
      groups.push(group)
    }
  }
  return groups
}

export function analyzeWorkflow(profile: WorkflowProfile): WorkflowAnalysis {
  const { steps } = profile

  const slowestStep = steps.reduce<StepProfile | undefined>(
    (max, s) => (!max || s.avgLatencyMs > max.avgLatencyMs ? s : max),
    undefined,
  )

  const expensiveStep = steps.reduce<StepProfile | undefined>(
    (max, s) => (!max || s.avgCostUsd > max.avgCostUsd ? s : max),
    undefined,
  )

  const parallelizableGroups = findParallelizableGroups(steps)
  const overpoweredStepIds = steps
    .filter((s) => getTier(s.model) >= OVER_POWERED_THRESHOLD)
    .map((s) => s.stepId)

  return {
    slowestStepId: slowestStep?.stepId,
    mostExpensiveStepId: expensiveStep?.stepId,
    parallelizableGroups,
    overpoweredStepIds,
  }
}

// Cost ratio: opus (~$15/M) is roughly 10x haiku (~$1.25/M output)
const DOWNGRADE_SAVINGS_RATIO = 0.7

export function buildOptimizationSuggestions(profile: WorkflowProfile): OptimizationSuggestion[] {
  const analysis = analyzeWorkflow(profile)
  const suggestions: OptimizationSuggestion[] = []

  // 1. Model downgrade suggestions
  for (const stepId of analysis.overpoweredStepIds) {
    const step = profile.steps.find((s) => s.stepId === stepId)!
    suggestions.push({
      type: 'downgrade_model',
      stepId,
      description: `Step "${stepId}" uses ${step.model} — consider downgrading to claude-sonnet-4-6 for routine tasks.`,
      estimatedCostSavingUsd: step.avgCostUsd * DOWNGRADE_SAVINGS_RATIO,
    })
  }

  // 2. Parallelization suggestions
  for (const group of analysis.parallelizableGroups) {
    const latencies = group
      .map((id) => profile.steps.find((s) => s.stepId === id)?.avgLatencyMs ?? 0)
    const maxLatency = Math.max(...latencies)
    const totalLatency = latencies.reduce((a, b) => a + b, 0)
    suggestions.push({
      type: 'parallelize',
      stepIds: group,
      description: `Steps [${group.join(', ')}] have no dependencies — run them in parallel.`,
      estimatedLatencySavingMs: totalLatency - maxLatency,
    })
  }

  // 3. Caching suggestion for repeated expensive steps
  const seenIds = new Set<string>()
  const duplicateIds = new Set<string>()
  for (const step of profile.steps) {
    if (seenIds.has(step.stepId)) duplicateIds.add(step.stepId)
    seenIds.add(step.stepId)
  }
  for (const stepId of duplicateIds) {
    const step = profile.steps.find((s) => s.stepId === stepId)!
    if (step.avgCostUsd >= 0.1) {
      suggestions.push({
        type: 'cache',
        stepId,
        description: `Step "${stepId}" appears multiple times — cache results to avoid redundant calls.`,
        estimatedCostSavingUsd: step.avgCostUsd,
      })
    }
  }

  return suggestions
}
