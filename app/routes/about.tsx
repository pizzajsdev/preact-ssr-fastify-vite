export const meta = () => ({ title: 'About • Preact SSR' })

export default function Page() {
  return (
    <div>
      <p class="sub">About page. Styling is plain CSS via Vite import.</p>
      <a class="button" href="/">
        ← Home
      </a>
    </div>
  )
}
