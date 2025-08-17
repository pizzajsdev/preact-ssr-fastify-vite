import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type UserConfig } from 'vite'
import ssrDevServer from './server/dev-server'

// Vite configuration using the new Environment API.  This defines a client
// build and an additional SSR build, and coordinates both in production.
export default defineConfig(<UserConfig>{
  appType: 'custom',
  plugins: [tailwindcss(), preact(), ssrDevServer()],
  environments: {
    client: {
      consumer: 'client',
      build: {
        // Client bundle output directory
        outDir: 'dist/client',
        manifest: true,
        rollupOptions: {
          // Use the client entry instead of index.html
          input: 'app/entry-client.tsx',
        },
        sourcemap: true,
        // optional: disable the auto‑injected modulepreload polyfill
        // if you plan to import it manually
        // modulePreload: { polyfill: true },
      },
    },
    // Define an SSR environment that runs in a Node consumer
    ssr: {
      consumer: 'server',
      build: {
        outDir: 'dist/server',
        ssr: 'app/entry-server.tsx',
        rollupOptions: {
          output: { entryFileNames: 'entry-server.js' },
        },
        copyPublicDir: false,
        sourcemap: true,
      },
      resolve: { conditions: ['node', 'import', 'default'] },
    },
    // Build the production Fastify server into dist/server/index.js
    fastify_server: {
      consumer: 'server',
      build: {
        outDir: 'dist/server',
        ssr: 'server/prod-server.ts',
        rollupOptions: {
          output: { entryFileNames: 'index.js' },
        },
        copyPublicDir: false,
        // Avoid cleaning dist/server when building the server so entry-server.js stays
        emptyOutDir: false,
        sourcemap: true,
      },
      resolve: { conditions: ['node', 'import', 'default'] },
    },
  },
  builder: {
    // Build client, SSR entry, and the Node server when running `vite build` in sequential order
    async buildApp(b) {
      await b.build(b.environments.client)
      await b.build(b.environments.ssr)
      await b.build(b.environments.fastify_server)
    },
  },
})
