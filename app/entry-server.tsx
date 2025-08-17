import { h } from 'preact'
import { render } from 'preact-render-to-string'
import * as rootModules from './root'
import { matchRoute } from './router'

const APP_URL = process.env.APP_URL || 'http://localhost'

// Helper to safely invoke server-only exports.  It returns undefined when
// the handler is not defined.
async function runServerHandler<T>(fn: any | undefined, ctx: Route.Context): Promise<T | undefined> {
  if (!fn) return undefined
  return await fn(ctx)
}

export const renderRequest: SSRServer.RenderRequest = async (request: Request): Promise<Response> => {
  // Build a URL object; base is used when URL is relative
  const url = new URL(request.url, APP_URL)
  const match = matchRoute(url)

  let status = 200
  const extraHeaders: [string, string][] = []

  // Call the root loader to fetch application-wide data
  const rootData = rootModules.loader
    ? await runServerHandler(rootModules.loader, {
        url,
        params: {},
        request,
      })
    : {}

  if (!match) {
    status = 404
  }

  const ctx: Route.Context = {
    url,
    params: match?.params ?? {},
    request,
  }

  // Execute the action on POST/PUT/DELETE/PATCH or the loader on other methods
  let pageData: {
    loaderData: any
    actionData: any
  } = {
    loaderData: {},
    actionData: {},
  }

  const method = request.method.toUpperCase()
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && match?.route.mod.action) {
    pageData.actionData = await runServerHandler(match.route.mod.action, ctx)
    // Similar to how React Router v7 does it, we re-run the loader to get the latest data after the action.
    pageData.loaderData = await runServerHandler(match.route.mod.loader, ctx)
    extraHeaders.push(['X-Action', '1'])

    if (pageData.actionData instanceof Response) {
      // If the action returns a Response object, return it directly (redirects, auth, etc.)
      return pageData.actionData
    }
  } else if (match?.route.mod.loader) {
    pageData.loaderData = await runServerHandler(match.route.mod.loader, ctx)

    if (pageData.loaderData instanceof Response) {
      // If the loader returns a Response object, return it directly (redirects, auth, etc.)
      return pageData.loaderData
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

  // Ensure Content-Type is set; append any extra headers like X-Action
  const headers = new Headers([['Content-Type', 'text/html; charset=utf-8'], ...extraHeaders])
  return new Response(finalHtml, { status, headers })
}

// Opt-in for better server HMR support during development
if (import.meta.hot) {
  import.meta.hot.accept()
}
