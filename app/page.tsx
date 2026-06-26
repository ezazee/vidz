'use client'
import { useEffect, useRef, useState } from 'react'
import { Film, Loader2, CheckCircle2, XCircle, WandSparkles, Video } from 'lucide-react'

type StageStatus = 'idle' | 'running' | 'done' | 'error'
type RenderStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface Stage {
  key: string
  label: string
  status: StageStatus
  error?: string
}

function buildStages(): Stage[] {
  return [
    { key: 'research', label: 'Research', status: 'idle' },
    { key: 'director', label: 'Director', status: 'idle' },
    { key: 'outline', label: 'Outline', status: 'idle' },
    { key: 'scenes', label: 'Scenes', status: 'idle' },
    { key: 'storyboard', label: 'Storyboard', status: 'idle' },
  ]
}

async function runStageRequest(key: string, projectId: string) {
  const url = key === 'storyboard'
    ? `/api/projects/${projectId}/storyboard`
    : `/api/projects/${projectId}/${key}`
  const res = key === 'storyboard'
    ? await fetch(url)
    : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as Record<string, string>).error ?? res.statusText)
  }
  return res.json()
}

function StageRow({ stage }: { stage: Stage }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-5 shrink-0 flex justify-center">
        {stage.status === 'running' && <Loader2 className="size-4 animate-spin text-primary" />}
        {stage.status === 'done' && <CheckCircle2 className="size-4 text-green-600" />}
        {stage.status === 'error' && <XCircle className="size-4 text-red-500" />}
        {stage.status === 'idle' && <div className="size-4 rounded-full border-2 border-border" />}
      </div>
      <span className={`text-sm flex-1 ${stage.status === 'idle' ? 'text-muted-foreground' : 'font-medium'}`}>
        {stage.label}
      </span>
      {stage.status === 'error' && (
        <span className="text-xs text-red-500">{stage.error}</span>
      )}
    </div>
  )
}

export default function HomePage() {
  const [topic, setTopic] = useState('')
  const [running, setRunning] = useState(false)
  const [stages, setStages] = useState<Stage[]>(buildStages())
  const [projectId, setProjectId] = useState<string | null>(null)
  const [storyboard, setStoryboard] = useState<Record<string, unknown> | null>(null)
  const [renderJobId, setRenderJobId] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // polling render job
  useEffect(() => {
    if (!renderJobId || renderStatus === 'completed' || renderStatus === 'failed') return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/render-jobs/${renderJobId}`)
        if (!res.ok) return
        const data = await res.json()
        const job = data.render_job
        setRenderStatus(job.status)
        if (job.status === 'completed' && job.video_url) {
          setVideoUrl(job.video_url)
          clearInterval(pollRef.current!)
        }
        if (job.status === 'failed') clearInterval(pollRef.current!)
      } catch {}
    }, 4000)
    return () => clearInterval(pollRef.current!)
  }, [renderJobId, renderStatus])

  function setStageStatus(key: string, status: StageStatus, error?: string) {
    setStages(s => s.map(st => st.key === key ? { ...st, status, error } : st))
  }

  async function generate() {
    if (!topic.trim() || running) return
    setRunning(true)
    setStoryboard(null)
    setRenderJobId(null)
    setRenderStatus('idle')
    setVideoUrl(null)
    setStages(buildStages())

    let pid: string
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const data = await res.json()
      pid = data.project.id
      setProjectId(pid)
    } catch {
      setRunning(false)
      return
    }

    for (const stage of buildStages()) {
      setStageStatus(stage.key, 'running')
      try {
        const data = await runStageRequest(stage.key, pid)
        setStageStatus(stage.key, 'done')
        if (stage.key === 'storyboard') setStoryboard(data.storyboard)
      } catch (e) {
        setStageStatus(stage.key, 'error', (e as Error).message)
        setRunning(false)
        return
      }
    }

    // auto-dispatch render
    try {
      const res = await fetch(`/api/projects/${pid}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      })
      const data = await res.json()
      setRenderJobId(data.render_job.id)
      setRenderStatus('pending')
    } catch (e) {
      setRenderStatus('failed')
    }

    setRunning(false)
  }

  const hasStarted = stages.some(s => s.status !== 'idle')
  const pipelineDone = stages.every(s => s.status === 'done')
  const sb = storyboard as {
    title?: string
    director?: Record<string, unknown>
    scenes?: { id: string; order_index: number; narration: string; duration: number }[]
  } | null

  const renderLabel: Record<RenderStatus, string> = {
    idle: '',
    pending: 'Menunggu render...',
    processing: 'Rendering video...',
    completed: 'Video siap!',
    failed: 'Render gagal',
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Film className="size-4" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">StoryZ</h1>
            <p className="text-xs text-muted-foreground">AI Production Studio</p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-10 space-y-6">
        {/* input */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Topik video</label>
          <div className="flex gap-2">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              disabled={running}
              placeholder="mis: Sejarah Kerajaan Majapahit"
              className="flex-1 rounded-md border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
            <button
              onClick={generate}
              disabled={topic.trim().length < 3 || running}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40 flex items-center gap-2 shrink-0"
            >
              {running ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
              Generate
            </button>
          </div>
        </div>

        {/* pipeline progress */}
        {hasStarted && (
          <div className="rounded-lg border border-border bg-white px-5 divide-y divide-border">
            {stages.map(stage => <StageRow key={stage.key} stage={stage} />)}

            {/* render row */}
            {pipelineDone && renderStatus !== 'idle' && (
              <div className="flex items-center gap-3 py-2.5">
                <div className="w-5 shrink-0 flex justify-center">
                  {(renderStatus === 'pending' || renderStatus === 'processing') && <Loader2 className="size-4 animate-spin text-primary" />}
                  {renderStatus === 'completed' && <CheckCircle2 className="size-4 text-green-600" />}
                  {renderStatus === 'failed' && <XCircle className="size-4 text-red-500" />}
                </div>
                <span className={`text-sm font-medium ${renderStatus === 'failed' ? 'text-red-500' : ''}`}>
                  Render · {renderLabel[renderStatus]}
                </span>
              </div>
            )}
          </div>
        )}

        {/* video result */}
        {videoUrl && (
          <div className="rounded-lg border border-border bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Video className="size-4 text-primary" />
              <h2 className="font-semibold">Video siap</h2>
            </div>
            <video src={videoUrl} controls className="w-full rounded-md bg-black" />
            <a
              href={videoUrl}
              download
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Download MP4
            </a>
          </div>
        )}

        {/* storyboard scenes */}
        {sb && (sb.scenes ?? []).length > 0 && (
          <div className="rounded-lg border border-border bg-white p-5 space-y-4">
            <div>
              <h2 className="font-semibold">{sb.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{(sb.scenes ?? []).length} scenes</p>
            </div>
            <dl className="grid gap-1.5 text-sm border-t border-border pt-3">
              {(['genre', 'visual_style', 'voice_style'] as const).map(k => (
                <div key={k} className="flex gap-2">
                  <dt className="text-muted-foreground w-24 shrink-0 capitalize">{k.replace('_', ' ')}</dt>
                  <dd>{String((sb.director as Record<string, unknown>)?.[k] ?? '')}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2 border-t border-border pt-3">
              {(sb.scenes ?? []).map(scene => (
                <div key={scene.id} className="rounded-md bg-muted/40 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Scene {scene.order_index + 1} · {scene.duration}s</span>
                  <p className="text-sm mt-0.5">{scene.narration}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
