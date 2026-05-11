const testApiKey = 'test-openseabri-key'
const nativeFetch = globalThis.fetch

process.env.OPENSEABRI_API_KEY ??= testApiKey

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : String(input)
  if (!url.includes('/api/seabri')) return nativeFetch(input, init)

  const headers = new Headers(init?.headers)
  if (!headers.has('x-openseabri-key')) {
    headers.set('x-openseabri-key', process.env.OPENSEABRI_API_KEY ?? testApiKey)
  }

  return nativeFetch(input, { ...init, headers })
}) as typeof fetch
