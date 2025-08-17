import { h, hydrate, render } from 'preact'
import RootPage from './root'
import { matchRoute } from './router'

// Important to import styles in your client entry file, otherwise Vite won't generate the CSS file.
import './styles.css'

// import 'vite/modulepreload-polyfill' // required when using a non‑HTML vite build entry (which is index.html by default)

// Read the serialized data injected during SSR from the script tag.  If
// parsing fails or the element is missing, fall back to basic defaults.
function getHydrationData(): Route.PageProps {
  const el = document.getElementById('__DATA')
  if (el && el.textContent) {
    try {
      return JSON.parse(el.textContent)
    } catch (err) {
      console.error('Failed to parse hydration data', err)
    }
  }
  return {
    url: { pathname: location.pathname, search: location.search },
    meta: {},
    loaderData: undefined,
    actionData: undefined,
    params: {},
    children: <div>Hydration failed</div>,
  }
}

const data = getHydrationData()
const dataWithoutChildren = { ...data, children: undefined }
const url = new URL(data.url.pathname + (data.url.search ? `?${data.url.search}` : ''), location.origin)
const match = matchRoute(url)
const CurrentPage = match?.route.mod.default ?? (() => h('div', null, 'Not Found'))

// Hydrate the whole document.  We call hydrate() when the server has
// pre-rendered DOM nodes, otherwise fall back to render() for CSR.
const node = document.documentElement
if (node.hasChildNodes()) {
  hydrate(h(RootPage, dataWithoutChildren, h(CurrentPage, dataWithoutChildren)), node)
} else {
  render(h(RootPage, dataWithoutChildren, h(CurrentPage, dataWithoutChildren)), node)
}

// Basic client-side navigation: intercept anchor clicks that lead to a
// relative URL and reload the page via history.pushState.  This is
// intentionally minimal; replace with SPA router for full client routing.
addEventListener('click', (e) => {
  const a = (e.target as HTMLElement)?.closest?.('a[href]') as HTMLAnchorElement | null
  if (!a) return
  const href = a.getAttribute('href')
  if (!href || !href.startsWith('/') || href.startsWith('//')) return
  e.preventDefault()
  history.pushState({}, '', href)
  location.reload()
})

if (import.meta.hot) {
  import.meta.hot.accept()
}
