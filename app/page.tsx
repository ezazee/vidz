import { Film, RefreshCcw, WandSparkles } from 'lucide-react'

const stages = [
  'Research',
  'Director',
  'Outline',
  'Script',
  'Storyboard',
  'Prompt',
  'Image',
  'Voice',
  'Render',
  'Thumbnail',
  'SEO',
  'Upload',
]

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <Film className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">StoryZ</h1>
              <p className="text-sm text-muted-foreground">AI Production Studio</p>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <WandSparkles className="size-4" />
            New Project
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-lg border border-border bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Pipeline</h2>
              <p className="text-sm text-muted-foreground">Core engine stages from topic to YouTube upload.</p>
            </div>
            <button className="grid size-9 place-items-center rounded-md border border-border" aria-label="Refresh">
              <RefreshCcw className="size-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stages.map((stage, index) => (
              <div key={stage} className="rounded-md border border-border p-4">
                <div className="text-xs font-medium text-muted-foreground">Stage {index + 1}</div>
                <div className="mt-1 font-medium">{stage}</div>
                <div className="mt-3 h-2 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-base font-semibold">Project Init</h2>
          <dl className="mt-4 grid gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Architecture</dt>
              <dd className="mt-1 font-medium">Next.js API + Neon + GitHub Actions</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Renderer</dt>
              <dd className="mt-1 font-medium">Remotion + FFmpeg</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1 font-medium">Scaffold ready for implementation</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  )
}
