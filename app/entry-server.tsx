import { h } from 'preact'
import { render } from 'preact-render-to-string'
import * as rootModules from './root'
import { matchRoute, type RequestContext } from './router'

// Helper to safely invoke server-only exports.  It returns undefined when
// the handler is not defined.
async function runServerHandler<T>(fn: any | undefined, ctx: RequestContext): Promise<T | undefined> {
  if (!fn) return undefined
  return await fn(ctx)
}

export async function renderRequest(req: { url: string; method: string; headers: any }): Promise<{
  status: number
  headers: [string, string][]
  body: string
}> {
  // Build a URL object; base isn't used for relative paths but required by URL constructor
  const url = new URL(req.url, 'http://localhost')
  const match = matchRoute(url)

  let status = 200
  const headers: [string, string][] = [['Content-Type', 'text/html; charset=utf-8']]

  // Call the root loader to fetch application-wide data
  const rootData = rootModules.loader
    ? await runServerHandler(rootModules.loader, {
        url,
        params: {},
        request: new Request(url, { method: req.method, headers: req.headers }),
      })
    : {}

  if (!match) {
    status = 404
  }

  const ctx: RequestContext = {
    url,
    params: match?.params ?? {},
    request: new Request(url, { method: req.method, headers: req.headers }),
  }

  // Execute the action on POST/PUT/DELETE/PATCH or the loader on other methods
  let pageData: {
    loaderData: any
    actionData: any
  } = {
    loaderData: {},
    actionData: {},
  }

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase()) && match?.route.mod.action) {
    pageData.actionData = await runServerHandler(match.route.mod.action, ctx)
    // Similar to how React Router v7 does it, we re-run the loader to get the latest data after the action.
    pageData.loaderData = await runServerHandler(match.route.mod.loader, ctx)
    headers.push(['X-Action', '1'])

    if (pageData.actionData instanceof Response) {
      // If the action returns a Response object, we return it directly.
      // React Router v7 supports this as well, see https://reactrouter.com/how-to/actions#throwing-responses
      // This is useful for redirects, authentication, etc.
      return {
        // TODO: make the function be compatible with Response objects as returning objects
        status: pageData.actionData.status,
        headers: Array.from(pageData.actionData.headers.entries()),
        body: await pageData.actionData.text(),
      }
    }
  } else if (match?.route.mod.loader) {
    pageData.loaderData = await runServerHandler(match.route.mod.loader, ctx)

    if (pageData.loaderData instanceof Response) {
      // If the loader returns a Response object, we return it directly.
      // React Router v7 supports this as well, see https://reactrouter.com/how-to/actions#throwing-responses
      // This is useful for redirects, authentication, etc.
      return {
        // TODO: make the function be compatible with Response objects as returning objects
        status: pageData.loaderData.status,
        headers: Array.from(pageData.loaderData.headers.entries()),
        body: await pageData.loaderData.text(),
      }
    }
  }

  // Merge metadata from the matched route
  const meta = Object.assign(
    {},
    (match?.route.mod.meta && (await runServerHandler(match.route.mod.meta as any, ctx))) || {},
  )

  // Determine which page component to render
  const RootLayout = (rootModules as any).Layout
  if (!RootLayout) {
    throw new Error('root.tsx Layout export not found')
  }
  const RootPage = (rootModules as any).default
  const CurrentPage = match?.route.mod.default ?? (() => h('div', null, 'Page Not Found'))

  const rootLoaderData = typeof rootData === 'object' ? rootData : { rootLoaderData: rootData }

  const currentPageProps: Route.PageProps = {
    url: { pathname: url.pathname, search: url.search },
    loaderData: { ...rootLoaderData, ...pageData.loaderData } as any,
    actionData: pageData.actionData as any,
    params: match?.params ?? {},
    meta,
  }

  // Render the application to a string.  Root wraps the page component and
  // supplies meta and data for the document head and layout.
  const appHtml = render(
    h(
      RootLayout,
      currentPageProps,
      RootPage ? h(RootPage, currentPageProps, h(CurrentPage, currentPageProps)) : h(CurrentPage, currentPageProps),
    ),
  )

  // Serialize the data used for hydration.  Escape '<' to prevent script injection.
  const payload = JSON.stringify(currentPageProps).replace(/</g, '\\u003c')

  // Inject the serialized data only; servers will handle asset tags.
  const finalHtml =
    '<!doctype html>' +
    appHtml.replace('</body>', `<script id="__DATA" type="application/json">${payload}</script></body>`)

  return { status, headers, body: finalHtml }
}

// Opt-in for better server HMR support during development
if (import.meta.hot) {
  import.meta.hot.accept()
}
