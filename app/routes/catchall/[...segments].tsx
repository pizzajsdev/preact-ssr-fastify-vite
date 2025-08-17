export const meta = () => ({ title: `Catch-all route example • Preact SSR ` })

export default function Page({ params }: Route.PageProps) {
  return (
    <div>
      <p class="sub">Catch-all route example. Segments: {JSON.stringify(params.segments)}</p>
      <a class="button" href="/">
        ← Home
      </a>
    </div>
  )
}
