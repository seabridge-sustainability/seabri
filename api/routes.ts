export interface ApiRequest {
  method: string
  path: string
  headers: Record<string, string>
  body: unknown
  params: Record<string, string>
  query: Record<string, string>
}

export interface ApiResponse {
  status: number
  body: unknown
  headers?: Record<string, string>
}

export type ApiHandler = (req: ApiRequest) => Promise<ApiResponse>

export interface RouteDefinition {
  method: string
  path: string
  handler: ApiHandler
}

export interface ApiRouter {
  handle(req: ApiRequest): Promise<ApiResponse>
  routes(): RouteDefinition[]
}

// Convert a path pattern like /workflows/:id to a regex
function pathToRegex(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = []
  const regexStr = pattern
    .replace(/:[^/]+/g, (match) => {
      paramNames.push(match.slice(1))
      return '([^/]+)'
    })
    .replace(/\//g, '\\/')
  return { regex: new RegExp(`^${regexStr}$`), paramNames }
}

function isExact(pattern: string): boolean {
  return !pattern.includes(':')
}

export function buildApiRouter(definitions: RouteDefinition[]): ApiRouter {
  // Pre-compile patterns; exact routes get priority over parameterised
  const compiled = definitions.map((def) => ({
    ...def,
    ...pathToRegex(def.path),
  }))

  // Sort: exact first, then parameterised
  compiled.sort((a, b) => {
    const aExact = isExact(a.path) ? 0 : 1
    const bExact = isExact(b.path) ? 0 : 1
    return aExact - bExact
  })

  return {
    async handle(req) {
      const pathMatches: typeof compiled = []

      for (const route of compiled) {
        const match = req.path.match(route.regex)
        if (match) {
          const params: Record<string, string> = {}
          route.paramNames.forEach((name, i) => {
            params[name] = match[i + 1]
          })
          if (route.method === req.method) {
            try {
              return await route.handler({ ...req, params })
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err)
              return { status: 500, body: { error: msg } }
            }
          } else {
            pathMatches.push(route)
          }
        }
      }

      if (pathMatches.length > 0) {
        return { status: 405, body: { error: 'Method Not Allowed' } }
      }

      return { status: 404, body: { error: 'Not Found' } }
    },

    routes() {
      return definitions
    },
  }
}
