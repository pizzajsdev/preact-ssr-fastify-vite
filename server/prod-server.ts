import fastifyStatic from '@fastify/static'
import { createRequest } from '@remix-run/node-fetch-server'
import fastify from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isBuild = __filename.endsWith('server/index.js')
const distPath = isBuild ? path.resolve(__dirname, '..') : path.resolve(__dirname, '../dist/server')
const distClient = path.resolve(distPath, 'client')
const distServer = path.resolve(distPath, 'server')

const APP_URL = process.env.APP_URL || 'http://localhost'

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
  const { renderRequest }: { renderRequest: SSRServer.RenderRequest } = await import(
    path.join(distServer, 'entry-server.js')
  )

  // Read Vite manifest to resolve hashed asset file names
  const manifestPath = path.join(distClient, '.vite', 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, any>
  const clientEntry = manifest['app/entry-client.tsx'] || manifest['/app/entry-client.tsx']
  const moduleEntry = clientEntry?.file || 'app/entry-client.js'
  const cssAssets = (clientEntry?.css || []) as string[]

  // Use a custom 404 handler to render SSR for anything not served above
  app.setNotFoundHandler(async (req, reply) => {
    try {
      const fullReqUrl = new URL(req.raw.url || '', APP_URL)
      const nativeReq = createRequest(req.raw, reply.raw, { host: fullReqUrl.host, protocol: fullReqUrl.protocol })
      const renderResponse = await renderRequest(nativeReq)
      let html = await renderResponse.text()

      // Inject CSS before </head> (case-insensitive)
      const cssTags = cssAssets.map((href) => `<link rel="stylesheet" href="/${href}"></link>`).join('')
      html = html.replace(/<\/head>/i, `${cssTags}</head>`) || html

      // Replace the entry script src robustly (handle formatting/attribute order)
      const scriptRe = /(\<script\b[^>]*\bsrc\s*=\s*)([\"'])\/app\/entry-client\.tsx\2([^>]*>)/i
      if (scriptRe.test(html)) {
        html = html.replace(scriptRe, `$1$2/${moduleEntry}$2$3`)
      } else {
        // Fallback: inject built entry before </body> if no dev entry script found
        html = html.replace(/<\/body>/i, `<script type="module" src="/${moduleEntry}"></script></body>`) || html
      }

      renderResponse.headers.forEach((v, k) => reply.header(k, v))
      reply.code(renderResponse.status).send(html)
    } catch (err: any) {
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
