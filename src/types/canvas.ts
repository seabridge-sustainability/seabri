/**
 * A2UI block schema — structured sustainability panel content streamed
 * alongside chat turns. Each block is additive; the pane renders them in
 * order of arrival. Keep this shape stable so the gateway canvas server
 * (gateway/canvas/server.ts) and the SPA agree on the wire format.
 */

export type ComplianceTag =
  | 'ISSB'
  | 'ESRS'
  | 'TNFD'
  | 'SBTi'
  | 'CSRD'
  | 'GRI'
  | 'CDP'
  | 'TCFD'
  | 'SFDR'
  | 'SEC'
  | 'GHG_PROTOCOL'
  | 'GENERAL'

export interface CanvasText {
  kind: 'text'
  id: string
  title?: string
  body: string
  tags?: ComplianceTag[]
}

export interface CanvasChart {
  kind: 'chart'
  id: string
  title: string
  unit?: string
  series: { label: string; value: number }[]
  tags?: ComplianceTag[]
}

export interface CanvasTable {
  kind: 'table'
  id: string
  title: string
  columns: string[]
  rows: (string | number)[][]
  tags?: ComplianceTag[]
}

export interface CanvasCitations {
  kind: 'citations'
  id: string
  title?: string
  sources: { label: string; url?: string; note?: string }[]
}

export type CanvasBlock = CanvasText | CanvasChart | CanvasTable | CanvasCitations

export interface CanvasEvent {
  type: 'block' | 'clear' | 'status'
  sessionId?: string
  block?: CanvasBlock
  status?: string
}
