import { createRequest } from '@remix-run/node-fetch-server'
import fs from 'node:fs'
import path from 'node:path'
import { isRunnableDevEnvironment, type Plugin, type ResolvedConfig } from 'vite'

const APP_URL = process.env.APP_URL || 'http://localhost'

/**
 * A generic SSR dev server plugin for Vite.
 *
 * It requires a server entry point (at app/entry-server.tsx) with a `renderRequest` export
 * function with signature `(req: Request) => Promise<Response>`
 */
export default function vitePluginSsrDevServer(): Plugin {
  let resolvedConfig: ResolvedConfig
  return {
    name: 'ssr-dev-server',
    apply: 'serve',
    enforce: 'post',
    configResolved(config) {
      resolvedConfig = config
    },
    handleHotUpdate({ server, modules }) {
      const touchesSSR = modules.some((m: any) => (m as any)?._ssrModule)
      if (touchesSSR) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
      return modules
    },
    configureServer(server) {
      const isAppFile = (file: string) => file.split('\\').join('/').includes('/app/')
      server.watcher.on('change', (file) => isAppFile(file) && server.ws.send({ type: 'full-reload' }))
      server.watcher.on('add', (file) => isAppFile(file) && server.ws.send({ type: 'full-reload' }))
      server.watcher.on('unlink', (file) => isAppFile(file) && server.ws.send({ type: 'full-reload' }))

      server.middlewares.use(async (req, res, next) => {
        try {
          if (!req.url) return next()
          const url = req.url
          const method = (req.method || 'GET').toUpperCase()

          // If the requested file exists under public/, let Vite serve it
          if ((resolvedConfig as any)?.publicDir) {
            const rawPath = url.split('?')[0] || '/'
            const rel = rawPath.replace(/^\/+/, '')
            const pubRoot = path.resolve((resolvedConfig as any).publicDir)
            const abs = path.resolve(pubRoot, rel)
            if (abs.startsWith(pubRoot) && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
              return next()
            }
          }

          // Skip Vite internals and common asset routes (any method)
          if (
            [
              /^\/@.+$/,
              /.*\.(ts|tsx|vue)($|\?)/,
              /.*\.(s?css|less)($|\?)/,
              /^\/favicon\.ico$/,
              /.*\.(svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|eot|mp4|mp3|ogg|webm|txt|webmanifest)($|\?)/,
              /^\/(public|assets|static)\/.+/,
              /^\/node_modules\/.*/,
            ].some((re) => re.test(url))
          ) {
            return next()
          }

          // For GET/HEAD only SSR HTML document requests; non-GET methods always SSR so actions run
          if (method === 'GET' || method === 'HEAD') {
            const accept = (req.headers['accept'] || '') as string
            const isHtmlRequest = accept.includes('text/html') || accept === ''
            if (!isHtmlRequest) return next()
          }

          const env = server.environments.ssr
          if (!isRunnableDevEnvironment(env)) {
            throw new Error('SSR environment must be runnable in dev')
          }
          if (!env || env.name !== 'ssr' || !env.runner) return next()
          const { renderRequest }: { renderRequest: SSRServer.RenderRequest } =
            await env.runner.import('/app/entry-server.tsx')

          const fullReqUrl = new URL(url, APP_URL)
          const nativeRequest = createRequest(req, res, { host: fullReqUrl.host, protocol: fullReqUrl.protocol })
          const renderResponse = await renderRequest(nativeRequest)

          let html = await server.transformIndexHtml(url, await renderResponse.text())

          // Ensure Vite client is present for HMR when rendering custom HTML
          if (!html.includes('/@vite/client')) {
            const csp = String(
              renderResponse.headers.get('content-security-policy') ||
                renderResponse.headers.get('Content-Security-Policy') ||
                '',
            )
            const nonceMatch = csp.match(/'nonce-([^']+)'/)
            const nonceAttr = nonceMatch ? ` nonce="${nonceMatch[1]}"` : ''
            const clientTag = `<script type="module"${nonceAttr}>import('/@vite/client')</script>`
            html = html.replace(/<\/body>/i, `${clientTag}</body>`) || html + clientTag
          }

          renderResponse.headers.forEach((v, k) => res.setHeader(k, v as any))
          res.statusCode = renderResponse.status
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
        } catch (err) {
          server.ssrFixStacktrace(err as Error)
          next(err as any)
        }
      })
    },
  }
}
