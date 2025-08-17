export const meta = () => ({
  title: 'Hello World — Preact SSR',
  description: 'Minimal full‑stack with Vite Environment API and Fastify',
})

export const loader = () => ({ greeting: 'Hello, world 👋' })

export default function Page({ loaderData }: Route.PageProps<typeof loader>) {
  return (
    <div>
      <p class="sub">{loaderData.greeting}, this is a server‑rendered page, hydrated on the client.</p>
      <div class="grid grid-cols-2 gap-2">
        <a class="button justify-center" href="/about">
          About →
        </a>
        <a class="button justify-center" href="/nested/example">
          Nested route example →
        </a>
        <a class="button justify-center" href="/blog/helloworld">
          Dynamic route example →
        </a>
        <a class="button justify-center" href="/catchall/hello/world/test">
          Catch-all route example →
        </a>
        <a class="button justify-center" href="/actions">
          Actions example →
        </a>
        <button
          class="button justify-center"
          onClick={() => {
            alert('clicked.')
          }}
        >
          Click me
        </button>
      </div>
    </div>
  )
}
