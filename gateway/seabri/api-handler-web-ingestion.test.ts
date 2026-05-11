import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createServer, type Server } from 'http'
import { handleSeabriApiRequest } from './api-handler.js'
import { scanWebsite } from '../../bridge/seabridge_client.js'

vi.mock('../../bridge/seabridge_client.js', () => ({
  scanWebsite: vi.fn(),
}))

function makeServer(): { server: Server; baseUrl: () => string } {
  const server = createServer(async (req, res) => {
    await handleSeabriApiRequest(req, res)
  })
  return {
    server,
    baseUrl: () => `http://localhost:${(server.address() as { port: number }).port}`,
  }
}

async function listen(server: Server): Promise<void> {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
}

async function close(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()))
}

describe('SeaBri API web ingestion', () => {
  let server: Server
  let baseUrl: () => string
  const apiKey = 'test-openseabri-key'

  beforeEach(async () => {
    process.env.OPENSEABRI_API_KEY = apiKey
    vi.mocked(scanWebsite).mockReset()
    ;({ server, baseUrl } = makeServer())
    await listen(server)
  })

  afterEach(async () => {
    await close(server)
    delete process.env.OPENSEABRI_API_KEY
  })

  it('POST /api/seabri/web-ingestion/scan proxies a bounded scan request', async () => {
    vi.mocked(scanWebsite).mockResolvedValue({
      success: true,
      provider: 'direct_fetch',
      url: 'https://example.com',
      contacts: { emails: [], phones: [], contact_urls: [] },
    })

    const res = await fetch(`${baseUrl()}/api/seabri/web-ingestion/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openseabri-key': apiKey,
      },
      body: JSON.stringify({
        tenantId: 'tenant-1',
        url: 'https://example.com',
        purpose: 'find contact guidance',
        schemaType: 'contact',
      }),
    })

    expect(res.status).toBe(200)
    expect(scanWebsite).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      url: 'https://example.com',
      purpose: 'find contact guidance',
      schemaType: 'contact',
      useFirecrawl: undefined,
    })
  })
})
