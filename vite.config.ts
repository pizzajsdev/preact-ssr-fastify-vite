import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type UserConfig } from 'vite'

// Vite configuration using the new Environment API.  This defines a client
// build and an additional SSR build, and coordinates both in production.
export default defineConfig(<UserConfig>{
  plugins: [tailwindcss(), preact()],
  appType: 'custom',
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
        ssr: 'app/entry-server.tsx',
        outDir: 'dist/ssr',
        copyPublicDir: false,
        sourcemap: true,
      },
      resolve: { conditions: ['node', 'import', 'default'] },
    },
  },
  builder: {
    // Build client and SSR outputs together when running `vite build`
    async buildApp(b) {
      await Promise.all([b.build(b.environments.client), b.build(b.environments.ssr)])
    },
  },
})
