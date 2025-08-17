import { createServer, isRunnableDevEnvironment } from 'vite'
import fastify from 'fastify'
import middie from '@fastify/middie'

/**
 * This script starts a development server using Fastify and Vite's Environment
 * API.  It runs a single Vite dev server hosting both the client and the
 * SSR environment, mounts Vite's middlewares on Fastify via middie for
 * HMR and asset serving, and delegates all requests to the SSR renderer.
 */
async function main() {
  // Create a Vite dev server in middleware mode.  We declare an additional
  // environment named `ssr` so that Vite builds an SSR graph alongside the
  // client graph.  Vite's middlewares handle transforming and serving files.
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    environments: { ssr: {} },
  })

  const ssrEnv = vite.environments.ssr
  if (!isRunnableDevEnvironment(ssrEnv)) {
    throw new Error('SSR environment must be runnable in dev')
  }

  // Spin up a Fastify server
  const app = fastify()
  // Register middie to enable Express/Connect-style middleware usage
  await app.register(middie)

  // Mount Vite's connect middleware.  This must be registered before any route
  // handlers to ensure that HMR and static file requests are handled.
  app.use(vite.middlewares)

  // Catch-all route: for any incoming request, call the SSR renderer.
  app.all('*', async (req, reply) => {
    try {
      const { renderRequest } = await ssrEnv.runner.import('/app/entry-server.tsx')
      const out = await renderRequest({
        url: req.raw.url,
        method: req.raw.method,
        headers: req.headers,
      })
      // Apply returned headers and status code
      for (const [k, v] of out.headers) {
        reply.header(k, v)
      }
      reply.code(out.status).send(out.body)
    } catch (err) {
      // Fix stack trace to map back to source modules using Vite utilities
      vite.ssrFixStacktrace(err)
      reply.code(500).send(String(err?.stack || err))
    }
  })

  const port = Number(process.env.PORT || 5173)
  await app.listen({ port })
  console.log(`dev ready on http://localhost:${port}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
