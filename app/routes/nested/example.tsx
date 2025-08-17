export const meta = () => ({ title: 'Nested route example • Preact SSR' })

export default function Page() {
  return (
    <div>
      <p class="sub">Nested route example.</p>
      <a class="button" href="/">
        ← Home
      </a>
    </div>
  )
}
