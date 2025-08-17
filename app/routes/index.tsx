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
    </div>
  )
}
