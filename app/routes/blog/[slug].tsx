export const meta = (ctx: Route.Context) => ({ title: `Blog Post example: ${ctx.params.slug} • Preact SSR ` })

export default function Page({ params }: Route.PageProps) {
  return (
    <div>
      <p class="sub">Blog Post example. Slug: {params.slug}</p>
      <a class="button" href="/">
        ← Home
      </a>
    </div>
  )
}
