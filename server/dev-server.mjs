import middie from '@fastify/middie'
import fastifyStatic from '@fastify/static'
import fastify from 'fastify'
import { exec } from 'node:child_process'
import path from 'node:path'
import { createServer, isRunnableDevEnvironment } from 'vite'

/**
 * This script starts a development server using Fastify and Vite's Environment
 * API.  It runs a single Vite dev server hosting both the client and the
 * SSR environment, mounts Vite's middlewares on Fastify via middie for
 * HMR and asset serving, and delegates all requests to the SSR renderer.
 */
async function main() {
  // Parse CLI flags (support --open[=path] or -o[=path])
  let openFlag = false
  let openPath = ''
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (arg === '--open' || arg === '-o') {
      openFlag = true
      const next = process.argv[i + 1]
      if (next && !next.startsWith('-')) {
        openPath = next
        i++
      }
    } else if (arg.startsWith('--open=')) {
      openFlag = true
      openPath = arg.split('=')[1] || ''
    } else if (arg.startsWith('-o=')) {
      openFlag = true
      openPath = arg.split('=')[1] || ''
    }
  }

  // Create a Vite dev server in middleware mode.  We declare an additional
  // environment named `ssr` so that Vite builds an SSR graph alongside the
  // client graph.  Vite's middlewares handle transforming and serving files.
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    environments: { ssr: {}, client: {} },
  })

  // NOTE: Do not cache the SSR environment. Vite recreates environments on
  // config changes/restart, so holding a stale reference leads to
  // "Vite module runner has been closed". Always fetch from `vite.environments`.
  // const ssrEnv = vite.environments.ssr // don't cache this here

  // Spin up a Fastify server
  const app = fastify()
  // Register middie to enable Express/Connect-style middleware usage
  await app.register(middie)

  // Serve files from /public (e.g., /favicon.ico). Vite also serves public,
  // but this guarantees availability even when not intercepted by Vite.
  await app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/',
    decorateReply: false,
    wildcard: false,
  })

  // Mount Vite's connect middleware so HMR and transformed assets are handled.
  app.use(vite.middlewares)

  // Fallback to SSR for anything not served above (static/assets).
  app.setNotFoundHandler(async (req, reply) => {
    try {
      // Always fetch the current SSR environment and import the entry.
      const env = vite.environments.ssr
      if (!isRunnableDevEnvironment(env)) {
        throw new Error('SSR environment must be runnable in dev')
      }
      const { renderRequest } = await env.runner.import('/app/entry-server.tsx')

      // Render our app HTML
      const out = await renderRequest({
        url: req.raw.url,
        method: req.raw.method,
        headers: req.headers,
      })
      // Ask Vite to transform the HTML (inject preloads, CSS, module scripts)
      const transformed = await vite.transformIndexHtml(req.raw.url, out.body)
      // Apply returned headers and status code
      for (const [k, v] of out.headers) {
        reply.header(k, v)
      }

      // Show moduleGraph of the root file:
      // console.log('moduleGraph', await vite.environments.ssr.moduleGraph.getModuleByUrl('/app/root.tsx'))
      reply.code(out.status).send(transformed)
    } catch (err) {
      // Fix stack trace to map back to source modules using Vite utilities
      vite.ssrFixStacktrace(err)
      reply.code(500).send(String(err?.stack || err))
    }
  })

  // When server-only modules (loaders/actions/root/router) change, force a full reload
  const shouldFullReload = (file) => {
    const rel = path.relative(process.cwd(), file).split('\\').join('/')
    return rel.startsWith('app/')
    // || rel === 'app/root.tsx' ||
    // rel === 'app/router.ts' ||
    // rel === 'app/entry-server.tsx'
  }
  vite.watcher.on('change', (file) => {
    if (shouldFullReload(file)) vite.ws.send({ type: 'full-reload' })
  })
  vite.watcher.on('add', (file) => {
    if (shouldFullReload(file)) vite.ws.send({ type: 'full-reload' })
  })
  vite.watcher.on('unlink', (file) => {
    if (shouldFullReload(file)) vite.ws.send({ type: 'full-reload' })
  })

  const port = Number(process.env.PORT || 5173)
  await app.listen({ port })
  console.log(`dev ready on http://localhost:${port}`)

  if (openFlag) {
    const target = `http://localhost:${port}${openPath ? (openPath.startsWith('/') ? openPath : '/' + openPath) : ''}`
    // Cross-platform open
    const cmd =
      process.platform === 'darwin'
        ? `open "${target}"`
        : process.platform === 'win32'
          ? `start ${target}`
          : `xdg-open "${target}"`
    exec(cmd, (err) => err && console.error('Failed to open browser:', err.message))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
