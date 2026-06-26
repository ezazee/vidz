'use client'
import { useEffect, useRef, useState } from 'react'
import { Film, Loader2, CheckCircle2, XCircle, WandSparkles, Video, ExternalLink } from 'lucide-react'

type StageStatus = 'idle' | 'running' | 'done' | 'error'
type RenderStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface Stage {
  key: string
  label: string
  status: StageStatus
  log?: string
  error?: string
  duration?: number
}

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'ezazee/vidz'

const STAGE_LOGS: Record<string, string[]> = {
  research: [
    'Mengumpulkan data dan fakta...',
    'Menyusun timeline kejadian...',
    'Merangkum referensi...',
  ],
  director: [
    'Menentukan genre dan visual style...',
    'Menyusun character & environment bible...',
    'Mengatur camera & motion style...',
  ],
  outline: [
    'Menyusun struktur video...',
    'Membagi chapter...',
    'Finalisasi outline...',
  ],
  scenes: [
    'Menulis narasi per scene...',
    'Menyusun image prompt...',
    'Mengatur camera movement...',
  ],
  storyboard: [
    'Mengambil data dari database...',
    'Menyusun storyboard final...',
  ],
}

const RENDER_LOGS: Record<string, string> = {
  pending: 'GitHub Actions triggered — menunggu runner tersedia...',
  processing: 'Generating images, voices, dan rendering video...',
  completed: 'Video berhasil dirender!',
  failed: 'Render gagal — cek GitHub Actions logs.',
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
    <div className="py-3 space-y-1">
      <div className="flex items-center gap-3">
        <div className="w-5 shrink-0 flex justify-center">
          {stage.status === 'running' && <Loader2 className="size-4 animate-spin text-primary" />}
          {stage.status === 'done' && <CheckCircle2 className="size-4 text-green-600" />}
          {stage.status === 'error' && <XCircle className="size-4 text-red-500" />}
          {stage.status === 'idle' && <div className="size-4 rounded-full border-2 border-border" />}
        </div>
        <span className={`text-sm flex-1 font-medium ${stage.status === 'idle' ? 'text-muted-foreground font-normal' : ''}`}>
          {stage.label}
        </span>
        {stage.duration && stage.status === 'done' && (
          <span className="text-xs text-muted-foreground">{stage.duration}s</span>
        )}
      </div>
      {stage.log && stage.status === 'running' && (
        <p className="text-xs text-primary pl-8 animate-pulse">{stage.log}</p>
      )}
      {stage.status === 'error' && (
        <p className="text-xs text-red-500 pl-8">{stage.error}</p>
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
  const [renderLog, setRenderLog] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // cycling log messages per stage
  function startLogCycle(key: string) {
    const messages = STAGE_LOGS[key] ?? []
    if (!messages.length) return
    let i = 0
    setStage(key, { log: messages[0] })
    logTimerRef.current = setInterval(() => {
      i = (i + 1) % messages.length
      setStage(key, { log: messages[i] })
    }, 2500)
  }

  function stopLogCycle() {
    if (logTimerRef.current) clearInterval(logTimerRef.current)
  }

  // polling render job
  useEffect(() => {
    if (!renderJobId || renderStatus === 'completed' || renderStatus === 'failed') return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/render-jobs/${renderJobId}`)
        if (!res.ok) return
        const job = (await res.json()).render_job
        setRenderStatus(job.status)
        setRenderLog(RENDER_LOGS[job.status] ?? '')
        if (job.status === 'completed' && job.video_url) {
          setVideoUrl(job.video_url)
          clearInterval(pollRef.current!)
        }
        if (job.status === 'failed') clearInterval(pollRef.current!)
      } catch {}
    }, 4000)
    return () => clearInterval(pollRef.current!)
  }, [renderJobId, renderStatus])

  function setStage(key: string, patch: Partial<Stage>) {
    setStages(s => s.map(st => st.key === key ? { ...st, ...patch } : st))
  }

  async function generate() {
    if (!topic.trim() || running) return
    setRunning(true)
    setStoryboard(null)
    setRenderJobId(null)
    setRenderStatus('idle')
    setRenderLog('')
    setVideoUrl(null)
    setStages(buildStages())

    let pid: string
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      pid = (await res.json()).project.id
      setProjectId(pid)
    } catch {
      setRunning(false)
      return
    }

    for (const stage of buildStages()) {
      const start = Date.now()
      setStage(stage.key, { status: 'running' })
      startLogCycle(stage.key)
      try {
        const data = await runStageRequest(stage.key, pid)
        stopLogCycle()
        setStage(stage.key, { status: 'done', log: undefined, duration: Math.round((Date.now() - start) / 1000) })
        if (stage.key === 'storyboard') setStoryboard(data.storyboard)
      } catch (e) {
        stopLogCycle()
        setStage(stage.key, { status: 'error', log: undefined, error: (e as Error).message })
        setRunning(false)
        return
      }
    }

    // dispatch render ke GitHub Actions
    try {
      const res = await fetch(`/api/projects/${pid}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' }),
      })
      const job = (await res.json()).render_job
      setRenderJobId(job.id)
      setRenderStatus('pending')
      setRenderLog(RENDER_LOGS.pending)
    } catch {
      setRenderStatus('failed')
      setRenderLog(RENDER_LOGS.failed)
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
              <div className="py-3 space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-5 shrink-0 flex justify-center">
                    {(renderStatus === 'pending' || renderStatus === 'processing') && <Loader2 className="size-4 animate-spin text-primary" />}
                    {renderStatus === 'completed' && <CheckCircle2 className="size-4 text-green-600" />}
                    {renderStatus === 'failed' && <XCircle className="size-4 text-red-500" />}
                  </div>
                  <span className={`text-sm font-medium flex-1 ${renderStatus === 'failed' ? 'text-red-500' : ''}`}>
                    Render Video
                  </span>
                  <a
                    href={`https://github.com/${GITHUB_REPO}/actions`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-3" />
                    Actions log
                  </a>
                </div>
                {renderLog && (
                  <p className={`text-xs pl-8 ${renderStatus === 'failed' ? 'text-red-500' : renderStatus === 'completed' ? 'text-green-600' : 'text-primary animate-pulse'}`}>
                    {renderLog}
                  </p>
                )}
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
