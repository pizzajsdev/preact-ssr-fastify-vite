// import './styles.css'

// Data returned from the root loader.  You can extend this with more fields
// as your application grows.

// Server-only loader invoked during SSR to fetch global data for the app.
export function loader() {
  return { appName: 'EnvAPI • Preact SSR' }
}

// The Root component defines the overall HTML document.  It wraps every
// page component and provides a placeholder for serialized data used to
// hydrate the client.  The `meta` prop comes from your page's `meta` export.
export default function Root(props: Route.PageProps<typeof loader>) {
  const { url, meta, loaderData = {} as any } = props
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <title>{meta.title ?? loaderData.appName}</title>
        {meta.description && <meta name="description" content={meta.description} />}
        {meta.robots && <meta name="robots" content={meta.robots} />}
        {meta.canonical && <link rel="canonical" href={meta.canonical} />}
        {meta.ogTitle && <meta property="og:title" content={meta.ogTitle} />}
        {meta.ogImage && <meta property="og:image" content={meta.ogImage} />}
        <link rel="stylesheet" href="/app/styles.css" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div id="__doc">
          <div class="container">
            <h1 class="h1">{loaderData.appName}</h1>
            <p class="sub">
              Hello from <strong>{url.pathname}</strong>
            </p>
            {props.children}
          </div>
        </div>
        {/* Marker for serialized data; entry-server.tsx will replace this token */}
        <script id="__DATA" type="application/json">
          {'__SSR_DATA__'}
        </script>
        <script type="module" src="/app/entry-client.tsx"></script>
      </body>
    </html>
  )
}
