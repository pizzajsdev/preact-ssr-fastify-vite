export const meta = () => ({
  title: 'Hello World — Preact SSR',
  description: 'Minimal full‑stack with Vite Environment API and Fastify',
})

export const loader = () => ({ greeting: 'Hello, world 👋' })

export default function Page({ loaderData }: Route.PageProps<typeof loader>) {
  return (
    <div>
      <p class="sub">{loaderData.greeting}, this is a server‑rendered page, hydrated on the client.</p>
      <a class="button" href="/about">
        About →
      </a>
      <a class="button" href="/nested/example">
        Nested route example →
      </a>
      <a class="button" href="/blog/helloworld">
        Dynamic route example →
      </a>
      <a class="button" href="/catchall/hello/world/test">
        Catch-all route example →
      </a>
      <button
        class="button"
        onClick={() => {
          alert('clicked.')
        }}
      >
        Click me
      </button>
    </div>
  )
}
