import { cn } from '../lib/utils'

export function meta() {
  return {
    title: 'Actions demo — Preact SSR',
    description: 'Showcase of server actions and using actionData in the page',
  }
}

export function loader() {
  return { note: 'Submit the form to see actionData populated from the server action.' }
}

export async function action(ctx: Route.Context) {
  const formData = await ctx.request.formData()
  const name = String(formData.get('name') || '').trim()
  const submittedAt = new Date().toISOString()
  return { name, submittedAt }
}

export default function Page(props: Route.PageProps<typeof loader, typeof action>) {
  const { loaderData, actionData } = props
  const hasSubmission = actionData?.name && actionData.name.length > 0

  return (
    <div class="space-y-4">
      <p class="sub">{loaderData.note}</p>

      <form method="post" class="space-y-3 rounded-md border border-white/10 bg-white/5 p-4">
        <label class="block text-white/80">
          <span class="mr-2">Your name:</span>
          <input
            class={cn(
              'mt-1 w-full rounded border border-white/10 bg-white/5 px-2 py-1',
              'text-white placeholder-white/40 ring-1 ring-transparent transition outline-none',
              'focus:border-white/20 focus:ring-white/20',
              hasSubmission && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
            )}
            type="text"
            name="name"
            placeholder="Ada Lovelace"
            defaultValue={actionData?.name}
          />
        </label>
        <button class="button" type="submit">
          Submit
        </button>
      </form>

      {hasSubmission ? (
        <div class="rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-200">
          <p class="font-semibold">Thanks, {actionData.name}!</p>
          <p class="text-sm opacity-80">Submitted at: {new Date(actionData.submittedAt).toLocaleString()}</p>
        </div>
      ) : (
        <p class="text-sm opacity-70">No submission yet.</p>
      )}
    </div>
  )
}
