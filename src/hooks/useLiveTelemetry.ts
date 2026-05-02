import { useEffect, useRef, useState } from 'react'
import type { DailyMetric } from '../components/sustainability-dashboard/useSustainabilityData.js'

export interface LiveTelemetryState {
  metrics: DailyMetric[]
  avgScore: number
  totalCostUsd: number
  totalCarbonGrams: number
  totalRequests: number
  lastRoutingTier: string | undefined
  loading: boolean
  error: string | null
}

const INITIAL: LiveTelemetryState = {
  metrics: [],
  avgScore: 0,
  totalCostUsd: 0,
  totalCarbonGrams: 0,
  totalRequests: 0,
  lastRoutingTier: undefined,
  loading: true,
  error: null,
}

const POLL_INTERVAL_MS = 30_000

export function useLiveTelemetry(gatewayUrl: string | undefined): LiveTelemetryState {
  const [state, setState] = useState<LiveTelemetryState>(INITIAL)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!gatewayUrl) {
      setState((prev) => ({ ...prev, loading: false }))
      return
    }

    const baseUrl = gatewayUrl.replace(/\/+$/, '')

    async function fetchTelemetry(): Promise<void> {
      try {
        const [snapshotRes, historyRes] = await Promise.all([
          fetch(`${baseUrl}/api/seabri/telemetry`),
          fetch(`${baseUrl}/api/seabri/telemetry/history?days=7`),
        ])

        if (!snapshotRes.ok) throw new Error(`HTTP ${snapshotRes.status}`)

        const snapshot = await snapshotRes.json() as {
          aggregated: {
            totalRequests: number
            totalCostUsd: number
            totalCarbonGrams: number
            avgLatencyMs: number
          }
          sustainabilityScore: {
            avgComposite: number
            totalCostUsd: number
            totalCarbonGrams: number
          }
          recentCount: number
          lastRoutingTier?: string
        }

        // Build DailyMetric array from history buckets when available.
        let metrics: DailyMetric[] = []
        if (historyRes.ok) {
          const histData = await historyRes.json() as {
            history: Array<{ date: string; requestCount: number; costUsd: number; carbonGrams: number }>
          }
          metrics = (histData.history ?? [])
            .filter((b) => b.requestCount > 0)
            .map((b) => ({
              date: b.date,
              carbonGrams: b.carbonGrams,
              costUsd: b.costUsd,
              requestCount: b.requestCount,
            }))
            .reverse() // oldest-first for charts
        }

        // Fall back to a single today-bucket from the aggregated snapshot
        if (metrics.length === 0 && snapshot.aggregated.totalRequests > 0) {
          const today = new Date().toISOString().slice(0, 10)
          metrics = [{
            date: today,
            carbonGrams: snapshot.aggregated.totalCarbonGrams,
            costUsd: snapshot.aggregated.totalCostUsd,
            requestCount: snapshot.aggregated.totalRequests,
          }]
        }

        setState({
          metrics,
          avgScore: snapshot.sustainabilityScore.avgComposite,
          totalCostUsd: snapshot.aggregated.totalCostUsd,
          totalCarbonGrams: snapshot.aggregated.totalCarbonGrams,
          totalRequests: snapshot.aggregated.totalRequests,
          lastRoutingTier: snapshot.lastRoutingTier,
          loading: false,
          error: null,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        setState((prev) => ({ ...prev, loading: false, error: message }))
      }
    }

    fetchTelemetry()
    timerRef.current = setInterval(fetchTelemetry, POLL_INTERVAL_MS)

    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current)
    }
  }, [gatewayUrl])

  return state
}
