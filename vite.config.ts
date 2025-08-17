/// <reference types="vite/client" />
import preact from '@preact/preset-vite'
import { defineConfig, type UserConfig } from 'vite'

// Vite configuration using the new Environment API.  This defines a client
// build and an additional SSR build, and coordinates both in production.
export default defineConfig(<UserConfig>{
  plugins: [preact()],
  appType: 'custom',
  build: {
    // Client bundle output directory
    outDir: 'dist/client',
    rollupOptions: {
      // Use the client entry instead of index.html
      input: 'app/entry-client.tsx',
    },
    sourcemap: true,
    // optional: disable the auto‑injected modulepreload polyfill
    // if you plan to import it manually
    // modulePreload: { polyfill: true },
  },
  environments: {
    // Define an SSR environment that runs in a Node consumer
    ssr: {
      consumer: 'server',
      build: {
        ssr: 'app/entry-server.tsx',
        outDir: 'dist/ssr',
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
