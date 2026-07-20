import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  callMcpTool,
  getClimateRiskData,
  isSeaBridgeAvailable,
  scanWebsite,
} from './seabridge_client.js'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('SeaBridgeAI bridge client', () => {
  afterEach(() => {
    delete process.env.SEABRIDGE_API_URL
    delete process.env.SEABRIDGE_API_KEY
    vi.unstubAllGlobals()
  })

  it('uses the configured read-tier key and encodes a company identifier', async () => {
    process.env.SEABRIDGE_API_URL = 'https://backend.example/'
    process.env.SEABRIDGE_API_KEY = 'read-key'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ company_id: 'a/b' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getClimateRiskData('a/b')).resolves.toEqual({ company_id: 'a/b' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.example/api/v1/openseabri/climate-risk/a%2Fb',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
    const request = fetchMock.mock.calls[0][1] as RequestInit
    expect(new Headers(request.headers).get('X-OpenSeaBri-Key')).toBe('read-key')
  })

  it('reports unavailable without the required server-side bridge key', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(isSeaBridgeAvailable()).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps web ingestion input to the backend schema and records external-fetch acknowledgement', async () => {
    process.env.SEABRIDGE_API_KEY = 'read-key'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }))
    vi.stubGlobal('fetch', fetchMock)

    await scanWebsite({ tenantId: 'tenant-a', url: 'https://example.com', schemaType: 'contact' })
    const request = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(String(request.body))).toMatchObject({
      tenant_id: 'tenant-a', schema_type: 'contact', acknowledge_external_fetch: true,
    })
  })

  it('refuses MCP calls without an explicit tenant', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(callMcpTool('openkb_status', {}, 'approval')).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('binds MCP calls to the explicit tenant and forwards the scoped approval token', async () => {
    process.env.SEABRIDGE_API_KEY = 'read-key'
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true }))
    vi.stubGlobal('fetch', fetchMock)

    await callMcpTool('openkb_status', { tenant_id: 'tenant-a' }, 'v1.approval')
    const request = fetchMock.mock.calls[0][1] as RequestInit
    expect(new Headers(request.headers).get('X-OpenSeaBri-Run-Approval')).toBe('v1.approval')
    expect(JSON.parse(String(request.body))).toEqual({
      tenant_id: 'tenant-a', tool_name: 'openkb_status',
      arguments: { tenant_id: 'tenant-a' },
      acknowledge_paid: true, acknowledge_mutation: false,
    })
  })
})
