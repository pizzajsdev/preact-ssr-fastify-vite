import { cn } from './lib/utils'
import styles from './styles.css?inline'

// Data returned from the root loader.  You can extend this with more fields
// as your application grows.

// Server-only loader invoked during SSR to fetch global data for the app.
export function loader() {
  return { appName: 'EnvAPI • Preact SSR' }
}

// The Layout component defines the overall HTML document.  It wraps every
// page component and provides a placeholder for serialized data used to
// hydrate the client.  The `meta` prop comes from your page's `meta` export.
// This export is required.
export function Layout(props: Route.PageProps<typeof loader>) {
  const { meta, loaderData, url } = props
  const pathname = url.pathname
  const linkBase = cn('rounded-md px-3 py-2 text-sm')
  const isActive = (href: string) => (pathname === '/' && href === '/') || (href !== '/' && pathname.startsWith(href))
  const linkClass = (href: string) =>
    cn(linkBase, isActive(href) ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5')

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
        <link rel="icon" href="/favicon.ico" />
        {/* Inline the CSS to prevent FOUC on the dev server */}
        <style dangerouslySetInnerHTML={{ __html: styles }} />
      </head>
      <body>
        <header class="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur">
          <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
            <a href="/" class="font-semibold tracking-tight">
              {loaderData.appName}
            </a>
            <nav class="flex items-center gap-1">
              <a href="/" class={linkClass('/')}>
                Home
              </a>
              <a href="/about" class={linkClass('/about')}>
                About
              </a>
              <a href="/nested/example" class={linkClass('/nested')}>
                Nested
              </a>
              <a href="/blog/helloworld" class={linkClass('/blog')}>
                Blog
              </a>
              <a href="/actions" class={linkClass('/actions')}>
                Actions
              </a>
            </nav>
          </div>
        </header>
        {/* Similar to RR <Outlet />: */}
        <div id="root">{props.children}</div>
        {/* Similar to RR <Scripts />: */}
        <script type="module" src="/app/entry-client.tsx"></script>
      </body>
    </html>
  )
}

// The Page component acts like a wrapper for all pages. It is optional and you can out everything inside the Layout.
export default function Page(props: Route.PageProps<typeof loader>) {
  const { url, loaderData } = props
  return (
    <div class="container">
      <h1 class="h1">{loaderData.appName}</h1>
      <p class="sub">
        Hello from <strong>{url.pathname}</strong>
      </p>
      {props.children}
    </div>
  )
}
