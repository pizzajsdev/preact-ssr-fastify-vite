# Preact + Fastify SSR + Vite Environment API

A template for a Preact + Fastify + SSR + Vite Environment API project. This is more a Proof of Concept to showcase what
can you do with Vite's Environment API, e.g. having an entrypoint and different build per environment.

This repository contains a **minimal full‑stack Preact SSR scaffold** built on top of the latest Vite _Environment API_
(Vite 6/7). It demonstrates how to create a small Remix-like (aka. React Router v7) framework with file‑based routing,
server‑side rendering, data loaders/actions and a unified dev/build pipeline. Fastify is used as the HTTP server instead
of Express for improved performance.

The project uses Vite’s Environment API to define separate _client_ and _SSR_ environments that share a single dev
server with HMR and are built together for production. Each file under `app/routes/` becomes a page that can export
server‑only `loader`, `action` and `meta` functions in addition to a default Preact component.

Heavily inspired by [React Router v7](https://reactrouter.com/home), aka. Remix, and Next.js App Router directory
structure.

> NOTE: This project is experimental and not production ready. What's not supported yet: Static-site generation (SSG),
> API routes, loader data revalidation and client re-hydration, throwing Response objects, .server/client.ts file
> boundaries, not found page, error boundaries, and other features.

## Prerequisites

- Node.js 22.17+ with `pnpm`.

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the development server:

   ```bash
   pnpm dev --open
   ```

   Dev runs the Vite server and a custom dev plugin (`server/dev-server.ts`) that SSRs unmatched HTML routes using the
   SSR environment. Vite handles assets, HMR and open-in-browser for you.
   - Set `APP_URL` to control the server URL base used during SSR (defaults to `http://localhost`).

3. Build for production:

   ```bash
   pnpm build
   ```

   This runs a unified build defined in `vite.config.ts`, outputting the client bundle to `dist/client` and the SSR
   bundle to `dist/ssr`. To preview the production server:

   ```bash
   pnpm preview
   # open http://localhost:4173
   ```

   The production server (`server/prod-server.ts`) uses Fastify with `@fastify/static` to serve static assets and the
   compiled SSR entry.

## Project Structure

```
preact-ssr-fastify-vite/
│
├─ package.json          # scripts and dependencies
├─ vite.config.ts        # Vite config using Environment API
├─ tsconfig.json         # TypeScript config
├─ server/
│  └─ dev-server.ts     # Vite dev plugin (SSR fallback + HMR integration)
│  └─ prod-server.ts    # Production Fastify server
└─ app/
   ├─ root.tsx           # HTML document/layout (with optional loader/action)
   ├─ router.ts          # File-based router & dynamic path matching
   ├─ styles.css         # Global styles (auto-imported by Vite)
   ├─ entry-client.tsx   # Hydration entry (client)
   ├─ entry-server.tsx   # SSR entry (server)
   └─ routes/
      ├─ index.tsx       # Home page (default export, meta & loader)
      └─ about.tsx       # Example second page
```

### Pages and Routing

Files inside `app/routes/` map to URL paths:

- `index.tsx` → `/`
- `about.tsx` → `/about`
- Nested folders become nested paths, and dynamic segments like `[id].tsx` map to `/users/:id` patterns (`params.id`).
- Catch‑all `[...name].tsx` captures the remaining path segments into `params[name]` as a `string[]`.

Each route file exports:

- `default`: a Preact component that will be server‑rendered and then hydrated on the client.
- `loader?`: a function `(ctx) => data` that runs on the server before rendering, returning props for the page.
- `action?`: a function `(ctx) => data` that handles POST/PUT/DELETE/PATCH submissions server‑side (e.g., form actions).
- `meta?`: a function `(ctx) => { title: string, description?: string }` providing document meta tags.

Notes:

- `loader`/`action` may return a `Response` object to short‑circuit rendering (e.g., redirects). Throwing `Response` is
  not yet supported.

### Root Document

`app/root.tsx` defines the HTML skeleton of every page. It exports `Layout(props)` which returns the `<html>` document
and may also export a `loader`/`action` like route modules. The default export is an optional wrapper used inside
`<body>` that renders around the current page. Global styles are imported here via `import './styles.css'`; Vite
automatically processes CSS imports and extracts them into the client bundle.

### Environment API & Server Integration

`vite.config.ts` defines the project’s environments:

- **Client**: builds the browser bundle to `dist/client`.
- **SSR**: defined under `environments.ssr` with `consumer: 'server'` and `build.ssr` pointing to
  `app/entry-server.tsx`. The `resolve.conditions` field can be adjusted to customise module resolution for server code.

The `builder.buildApp` hook (available in Vite 7) coordinates building both environments together. In dev, a Vite plugin
(`server/dev-server.ts`) handles SSR for HTML routes and lets Vite serve assets/HMR. The plugin dynamically imports the
SSR entry on each request and calls the exported `renderRequest(request: Request) => Promise<Response>`.

In production, `server/prod-server.ts` imports the compiled SSR handler from `dist/ssr/entry-server.js` and serves the
client assets from `dist/client` via `@fastify/static`. This separation mirrors the dev environment but without the HMR
and transform overhead.

### Implementation Decisions

- **Preact instead of React** – Preact offers a smaller footprint while maintaining a similar API. Server rendering is
  handled via `preact-render-to-string`.
- **Fastify over Express** – Fastify is chosen for performance and its plugin system. Dev uses a Vite middleware plugin
  instead of mounting Vite on Fastify; prod uses Fastify.
- **File‑based routing** – Simplifies adding pages: any `.tsx`/`.ts` file in `app/routes` becomes a route. The router
  supports dynamic segments and wildcard routes.
- **Environment API** – Using Vite’s Environment API aligns dev and prod pipelines and allows running multiple
  environments from a single dev server. The SSR environment defines its own build config and runner.
- **Minimal dependencies** – Beyond Vite, Preact and Fastify, there are no extra libraries. Routing, data fetching and
  actions are implemented manually to keep the scaffold lean and instructive.

### Environment Variables

- `APP_URL`: Base URL used during SSR to resolve relative request URLs. Defaults to `http://localhost`.
