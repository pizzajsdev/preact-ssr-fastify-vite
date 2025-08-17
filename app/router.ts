import type { VNode } from 'preact'

// Define the types for server-only handlers that route modules may export.
export type Meta = (ctx: RequestContext) => Record<string, string> | undefined
export type Loader<T = unknown> = (ctx: RequestContext) => Promise<T> | T
export type Action<T = unknown> = (ctx: RequestContext) => Promise<T> | T

export type RouteModule = {
  default: (props: { data?: any; params: Record<string, string | string[]> }) => VNode<any>
  meta?: Meta
  loader?: Loader
  action?: Action
}

// Context passed to server-only handlers.  This includes the URL of the
// request, dynamic parameters extracted from the pathname, and the original
// Request object for further data (e.g. headers, body).
export type RequestContext = {
  url: URL
  params: Record<string, string | string[]>
  request: Request
}

// Eagerly import every file within app/routes as a route module.  Vite's
// import.meta.glob resolves relative to the importing file.
const files = import.meta.glob('./routes/**/*.{tsx,ts}', { eager: true }) as Record<string, RouteModule>

// Convert the file system path of a route module into a URL path.  For
// example './routes/index.tsx' -> '/', and './routes/users/[id].tsx' -> '/users/:id'.
function fileToPath(fp: string) {
  let p = fp.replace(/^\.\/routes/, '').replace(/\.(tsx|ts)$/, '')
  // '/users/index' -> '/users/'
  p = p.replace(/\/index$/, '/')
  // '[id].tsx' -> ':id' and '[...segments].tsx' -> '*segments'
  p = p.replace(/\[(\.\.\.)?([^\]]+)\]/g, (_: any, rest: string, name: string) => (rest ? `*${name}` : `:${name}`))
  if (!p.startsWith('/')) p = `/${p}`
  return p
}

export type Route = { path: string; mod: RouteModule }
export const routes: Route[] = Object.entries(files).map(([key, mod]) => ({
  path: fileToPath(key),
  mod,
}))

// Simple path matcher.  It matches static segments, dynamic parameters (prefixed
// with ':'), and a wildcard '*' segment.  It returns the matched route and
// decoded params or null if no route matches.
export function matchRoute(url: URL) {
  const pathname = url.pathname.endsWith('/') && url.pathname !== '/' ? url.pathname.slice(0, -1) : url.pathname
  for (const r of routes) {
    const params: Record<string, string | string[]> = {}
    const a = pathname.split('/').filter(Boolean)
    const b = r.path.split('/').filter(Boolean)
    let ok = true
    let ai = 0
    let bi = 0
    for (; ai < a.length && bi < b.length; ai++, bi++) {
      const seg = b[bi]
      if (seg.startsWith('*')) {
        const name = seg.slice(1) || 'wildcard'
        const restSegments = a.slice(ai).map((s) => decodeURIComponent(s))
        params[name] = restSegments
        ai = a.length
        bi = b.length
        ok = true
        break
      }
      if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(a[ai])
      else if (seg !== a[ai]) {
        ok = false
        break
      }
    }
    if (ok && ai === a.length && bi === b.length) return { route: r, params }
  }
  return null
}
