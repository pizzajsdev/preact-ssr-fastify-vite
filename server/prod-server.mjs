import fastifyStatic from '@fastify/static'
import fastify from 'fastify'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distClient = path.resolve(__dirname, '../dist/client')
const distSSR = path.resolve(__dirname, '../dist/ssr')

async function main() {
  const app = fastify()

  // Serve static assets – disable wildcard to avoid registering GET /*
  await app.register(fastifyStatic, {
    root: distClient,
    prefix: '/', // serve client files at the root
    decorateReply: false,
    wildcard: false, // <- this prevents the duplicate GET /* route
  })

  // Lazy‑import the SSR handler
  const { renderRequest } = await import(path.join(distSSR, 'entry-server.js'))

  // Use a custom 404 handler to render SSR for anything not served above
  app.setNotFoundHandler(async (req, reply) => {
    try {
      const out = await renderRequest({
        url: req.raw.url,
        method: req.raw.method,
        headers: req.headers,
      })
      for (const [k, v] of out.headers) reply.header(k, v)
      reply.code(out.status).send(out.body)
    } catch (err) {
      reply.code(500).send(String(err?.stack || err))
    }
  })

  const port = Number(process.env.PORT || 4173)
  await app.listen({ port })
  console.log(`prod preview http://localhost:${port}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
