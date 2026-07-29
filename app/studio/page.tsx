'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import '@/app/app.css'
import {
  Menu,
  Loader2,
  CheckCircle2,
  XCircle,
  WandSparkles,
  Video,
  ExternalLink,
  RefreshCw,
  Compass,
  Globe2,
  Rocket,
  Swords,
  Flame,
  Plus,
  Users
} from 'lucide-react'

const THEMES = [
  { id: 'What-If Sejarah Nusantara', label: 'What-If Sejarah Nusantara', icon: Compass, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'What-If Sejarah Dunia', label: 'What-If Sejarah Dunia', icon: Globe2, color: 'text-[var(--color-accent)]', bg: 'bg-brand-50', border: 'border-brand-200' },
  { id: 'What-If Tokoh Terkenal', label: 'What-If Tokoh Terkenal', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'What-If Sains & Teknologi', label: 'What-If Sains & Teknologi', icon: Rocket, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'What-If Perang & Konflik', label: 'What-If Perang & Konflik', icon: Swords, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'What-If Bencana Alam', label: 'What-If Bencana Alam', icon: Flame, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' }
]

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
    '[GitHub Actions] Scraping DuckDuckGo untuk referensi terkini...',
    '[GitHub Actions] Mengekstrak fakta & timeline dari sumber web...',
    '[GitHub Actions] AI merangkum riset & memvalidasi data...',
    '[GitHub Actions] Menyimpan hasil riset ke database...',
  ],
  director: [
    '[GitHub Actions] AI menganalisis tone & genre video...',
    '[GitHub Actions] Menyusun visual bible & character guide...',
    '[GitHub Actions] Menentukan camera style & color palette...',
    '[GitHub Actions] Finalisasi director output...',
  ],
  outline: [
    '[GitHub Actions] AI menyusun struktur video (intro + 3 chapter + ending)...',
    '[GitHub Actions] Mendistribusikan materi riset ke setiap chapter...',
    '[GitHub Actions] Finalisasi outline & transisi antar bab...',
  ],
  scenes: [
    '[GitHub Actions] Menulis narasi 42 scene (target 8-10 menit)...',
    '[GitHub Actions] Menyusun image prompt per scene...',
    '[GitHub Actions] Mengatur camera movement & visual effect...',
    '[GitHub Actions] Menentukan Pexels query untuk B-roll footage...',
    '[GitHub Actions] Menyimpan semua scene ke database...',
  ],
  storyboard: [
    '[GitHub Actions] Menyusun storyboard final...',
    '[GitHub Actions] Mengumpulkan semua scene & director data...',
    '[GitHub Actions] AI pipeline selesai — siap render!',
  ],
}

const RENDER_STAGE_LOGS: Record<string, string[]> = {
  pending: [
    '[GitHub Actions] Workflow render_video triggered...',
    '[GitHub Actions] Menunggu runner Ubuntu tersedia...',
    '[GitHub Actions] Checkout repo & install dependencies...',
  ],
  processing: [
    '[GitHub Actions] Fetching storyboard dari database...',
    '[GitHub Actions] Downloading B-roll footage dari Pexels...',
    '[GitHub Actions] Generating AI images untuk setiap scene...',
    '[GitHub Actions] Generating voice TTS (Edge TTS) per scene...',
    '[GitHub Actions] Menghitung durasi audio dengan ffprobe...',
    '[GitHub Actions] Membagi render menjadi 8 chunk paralel...',
    '[GitHub Actions] Rendering video chunks dengan Remotion...',
    '[GitHub Actions] Menggabungkan semua chunk dengan FFmpeg...',
    '[GitHub Actions] Uploading video final ke Cloudflare R2...',
  ],
  completed: ['[GitHub Actions] Video berhasil dirender & diupload ke R2!'],
  failed: ['[GitHub Actions] Render gagal — lihat log di GitHub Actions untuk detail.'],
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
          {stage.status === 'running' && <Loader2 className="size-4 animate-spin text-[var(--color-accent)]" />}
          {stage.status === 'done' && <CheckCircle2 className="size-4 text-emerald-600" />}
          {stage.status === 'error' && <XCircle className="size-4 text-rose-500" />}
          {stage.status === 'idle' && <div className="size-4 rounded-full border-2 border-[var(--color-rule)]" />}
        </div>
        <span className={`text-sm flex-1 font-medium ${stage.status === 'idle' ? 'text-[var(--color-ink-3)] font-normal' : 'text-[var(--color-ink-2)]'}`}>
          {stage.label}
        </span>
        {stage.duration && stage.status === 'done' && (
          <span className="text-xs text-[var(--color-ink-3)] bg-[var(--color-paper-3)] px-2 py-0.5 rounded-full">{stage.duration}s</span>
        )}
      </div>
      {stage.log && stage.status === 'running' && (
        <p className="text-xs text-[var(--color-accent)] pl-8 animate-pulse font-mono">{stage.log}</p>
      )}
      {stage.status === 'error' && (
        <p className="text-xs text-rose-500 pl-8 font-mono bg-rose-50 p-2 rounded-md mt-1 border border-rose-100">{stage.error}</p>
      )}
    </div>
  )
}

export default function StudioPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Studio States
  const [topic, setTopic] = useState('')
  const [selectedTheme, setSelectedTheme] = useState('What-If Sejarah Nusantara')
  const [running, setRunning] = useState(false)
  const [stages, setStages] = useState<Stage[]>(buildStages())
  const [projectId, setProjectId] = useState<string | null>(null)
  const [storyboard, setStoryboard] = useState<Record<string, any> | null>(null)
  const [renderJobId, setRenderJobId] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('idle')
  const [renderLog, setRenderLog] = useState('')
  const [renderDetail, setRenderDetail] = useState<{ totalScenes: number; imagesDone: number; voicesDone: number; githubRunId: string | null }>({ totalScenes: 0, imagesDone: 0, voicesDone: 0, githubRunId: null })
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const renderLogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore state from localStorage on mount
  useEffect(() => {
    const activePid = localStorage.getItem('activeProjectId')
    if (activePid) {
      setProjectId(activePid)
      setRunning(true)
    }
  }, [])

  // AI Topic Recommendations States
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)

  const fetchRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const res = await fetch(`/api/topics/recommendations?theme=${encodeURIComponent(selectedTheme)}`)
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.topics || [])
      }
    } catch (e) {
      console.error('Gagal mengambil rekomendasi topik', e)
    } finally {
      setLoadingRecs(false)
    }
  }

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

  // Start cycling render log messages
  function startRenderLogCycle(status: RenderStatus) {
    if (renderLogTimerRef.current) clearInterval(renderLogTimerRef.current)
    const messages = RENDER_STAGE_LOGS[status] ?? []
    if (!messages.length) return
    let i = 0
    setRenderLog(messages[0])
    if (messages.length > 1) {
      renderLogTimerRef.current = setInterval(() => {
        i = (i + 1) % messages.length
        setRenderLog(messages[i])
      }, 3000)
    }
  }

  // Polling unified pipeline status
  const prevRenderStatus = useRef<RenderStatus>('idle')
  useEffect(() => {
    if (!projectId || !running) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/pipeline/status`)
        if (!res.ok) return
        const data = await res.json()
        const s = data.stages

        setStages(prev => prev.map(st => {
          const dbStatus = s[st.key]
          let uiStatus: StageStatus = 'idle'
          if (dbStatus === 'completed') uiStatus = 'done'
          if (dbStatus === 'processing' || dbStatus === 'pending') uiStatus = 'running'
          if (dbStatus === 'failed') uiStatus = 'error'
          if (uiStatus === 'running' && !st.log) startLogCycle(st.key)
          return { ...st, status: uiStatus }
        }))

        const newRender: RenderStatus = s.render ?? 'idle'
        setRenderStatus(newRender)
        if (data.renderDetail) setRenderDetail(data.renderDetail)

        // start render log cycle only when status changes
        if (newRender !== prevRenderStatus.current && newRender !== 'idle') {
          startRenderLogCycle(newRender)
        }
        prevRenderStatus.current = newRender

        if (newRender === 'completed' && data.videoUrl) {
          setVideoUrl(data.videoUrl)
          setRunning(false)
          clearInterval(pollRef.current!)
          if (renderLogTimerRef.current) clearInterval(renderLogTimerRef.current)
          localStorage.removeItem('activeProjectId')
        }
        if (newRender === 'failed' || s.research === 'failed' || s.director === 'failed') {
          setRunning(false)
          clearInterval(pollRef.current!)
          if (renderLogTimerRef.current) clearInterval(renderLogTimerRef.current)
          localStorage.removeItem('activeProjectId')
        }
      } catch {}
    }, 3000)
    return () => {
      clearInterval(pollRef.current!)
      if (renderLogTimerRef.current) clearInterval(renderLogTimerRef.current)
    }
  }, [projectId, running])

  function stopLogCycle() {
    if (logTimerRef.current) clearInterval(logTimerRef.current)
  }

  // Helper to set stage patch
  function setStage(key: string, patch: Partial<Stage>) {
    setStages((s: Stage[]) => s.map((st: Stage) => st.key === key ? { ...st, ...patch } : st))
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
      const finalTopic = `${topic.trim()} [THEME: ${selectedTheme}]`
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: finalTopic }),
      })
      pid = (await res.json()).project.id
      setProjectId(pid)
      localStorage.setItem('activeProjectId', pid)
      
      const pipeRes = await fetch(`/api/projects/${pid}/pipeline`, { method: 'POST' })
      if (!pipeRes.ok) throw new Error('Gagal memulai background pipeline')
    } catch {
      setRunning(false)
      return
    }
  }

  
  const resetStudio = () => {
    setTopic('')
    setRunning(false)
    setProjectId(null)
    setStoryboard(null)
    setRenderJobId(null)
    setRenderStatus('idle')
    setRenderLog('')
    setVideoUrl(null)
    setStages(buildStages())
    localStorage.removeItem('activeProjectId')
  }

  const hasStarted = stages.some((s: Stage) => s.status !== 'idle')
  const pipelineDone = stages.every((s: Stage) => s.status === 'done')
  const sb = storyboard as {
    title?: string
    director?: Record<string, unknown>
    scenes?: Array<{
      id: string
      order_index: number
      narration: string
      image_prompt: string
    }>
  } | null

  return (
    <div className="ap">
      {/* Sidebar Desktop & Mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="ap__body">
        {/* Header */}
        <header className="ap__topbar">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] rounded-lg md:hidden transition-all"
            >
              <Menu className="size-5" />
            </button>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">AI Production Studio</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--color-ink-3)] bg-[var(--color-paper-3)] px-3 py-1.5 rounded-full border border-[var(--color-rule)] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Cloud Connected
            </span>
          </div>
        </header>

        {/* Content Container */}
        
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Kiri: Form & Storyboard */}
            <div className="lg:col-span-7 space-y-6">
              {/* input card */}
            <div className="bg-[var(--color-paper-2)] rounded-xl border border-[var(--color-rule)] shadow-sm p-6 space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-[var(--color-ink-2)]">Pilih Tema & Topik Utama</h3>
                <p className="text-xs text-[var(--color-ink-3)]">Pilih genre visual dan BGM sebelum memasukkan topik untuk hasil terbaik.</p>
              </div>

              {/* Theme Selector */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {THEMES.map(theme => {
                  const Icon = theme.icon
                  const isSelected = selectedTheme === theme.id
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      disabled={running}
                      className={`flex flex-col items-center justify-center p-3 gap-2 rounded-xl border transition-all text-center ${
                        isSelected 
                          ? `${theme.bg} ${theme.border} ring-1 ring-${theme.border.split('-')[1]}-500 shadow-sm` 
                          : 'border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Icon className={`size-5 ${isSelected ? theme.color : 'text-[var(--color-ink-3)]'}`} />
                      <span className={`text-[10px] font-bold leading-tight ${isSelected ? theme.color : 'text-[var(--color-ink-3)]'}`}>
                        {theme.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              
              <div className="flex gap-2">
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generate()}
                  disabled={running}
                  placeholder="misal: Sejarah Kerajaan Majapahit, Detik-detik Proklamasi 1945"
                  className="flex-1 rounded-lg border border-[var(--color-rule)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:bg-[var(--color-paper-3)] disabled:text-[var(--color-ink-3)]"
                />
                <button
                  onClick={generate}
                  disabled={topic.trim().length < 3 || running}
                  className="rounded-lg bg-[var(--color-accent)] px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 shadow-lg shadow-brand-600/15 disabled:shadow-none transition-all flex items-center gap-2 shrink-0"
                >
                  {running ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                  Generate
                </button>
              </div>

              {/* AI Recommendations */}
              <div className="space-y-4 pt-6 border-t border-[var(--color-rule)]">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-black text-[var(--color-ink-3)] uppercase tracking-widest flex items-center gap-1.5">
                    <WandSparkles className="size-3.5 text-[var(--color-accent)]" /> 
                    Butuh Ide Topik?
                  </h3>
                  <p className="text-xs text-[var(--color-ink-3)]">Klik tombol di bawah untuk meminta AI memberikan ide topik yang sangat clickbait dan edukatif berdasarkan tema <span className="font-bold text-[var(--color-ink-2)]">"{THEMES.find(t => t.id === selectedTheme)?.label}"</span>.</p>
                </div>
                
                {recommendations.length === 0 && !loadingRecs ? (
                  <button
                    onClick={fetchRecommendations}
                    disabled={running}
                    className="w-full sm:w-auto bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className="size-3.5" /> Generate Ide Topik
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[var(--color-accent)] uppercase tracking-wider bg-brand-50 px-2 py-1 rounded-md">
                        Rekomendasi Tema {THEMES.find(t => t.id === selectedTheme)?.label}
                      </span>
                      <button
                        onClick={fetchRecommendations}
                        disabled={loadingRecs || running}
                        className="text-[10px] font-bold text-[var(--color-ink-3)] hover:text-[var(--color-ink)] flex items-center gap-1 disabled:opacity-50 transition-all"
                      >
                        {loadingRecs ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                        Generate Ulang
                      </button>
                    </div>
                    
                    {loadingRecs ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-3)] py-4 justify-center bg-[var(--color-paper-3)] rounded-xl border border-[var(--color-rule)] border-dashed animate-pulse font-medium">
                        <Loader2 className="size-4 animate-spin text-[var(--color-accent)]" />
                        Menganalisis algoritma & meracik topik clickbait...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recommendations.map((rec: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setTopic(rec)}
                            disabled={running}
                            className="text-xs bg-[var(--color-paper-2)] hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 text-[var(--color-ink-2)] px-4 py-3 rounded-xl border border-[var(--color-rule)] transition-all font-medium text-left shadow-sm group"
                          >
                            <span className="text-[var(--color-ink-3)] group-hover:text-brand-400 mr-2 font-bold">{idx + 1}.</span>
                            {rec}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            
              {/* storyboard scenes */}
            {sb && (sb.scenes ?? []).length > 0 && (
              <div className="bg-[var(--color-paper-2)] rounded-xl border border-[var(--color-rule)] shadow-sm p-6 space-y-4">
                <div className="border-b border-[var(--color-rule)] pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--color-ink)] text-lg">{sb.title}</h3>
                    <p className="text-xs text-[var(--color-ink-3)] mt-1">Daftar skrip adegan ({(sb.scenes ?? []).length} adegan) yang disusun untuk visualisasi.</p>
                  </div>
                  {projectId && (
                    <button
                      onClick={() => router.push(`/projects/${projectId}`)}
                      className="text-xs font-bold text-[var(--color-accent)] hover:text-brand-800 flex items-center gap-1"
                    >
                      Buka Detail Adegan &rarr;
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-xs border border-[var(--color-rule)] bg-[var(--color-paper-3)]/50 p-3.5 rounded-lg">
                  {(['genre', 'visual_style', 'voice_style'] as const).map(k => (
                    <div key={k} className="space-y-0.5">
                      <span className="text-[var(--color-ink-3)] block capitalize font-medium">{k.replace('_', ' ')}</span>
                      <span className="font-semibold text-[var(--color-ink-2)] block">{String((sb.director as Record<string, unknown>)?.[k] ?? 'Standard')}</span>
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-[var(--color-rule)] border border-[var(--color-rule)] rounded-xl overflow-hidden bg-[var(--color-paper-3)]/20">
                  {(sb.scenes ?? []).map((scene) => (
                    <div key={scene.id} className="p-4 flex gap-4 text-xs">
                      <span className="font-bold text-[var(--color-accent)] shrink-0">#{scene.order_index + 1}</span>
                      <div className="space-y-1">
                        <p className="text-[var(--color-ink-2)] font-medium leading-relaxed">{scene.narration}</p>
                        <p className="text-[10px] text-[var(--color-ink-3)] font-mono italic">Prompt: {scene.image_prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
            

            {/* Kanan: Progress & Result (Sticky) */}
            <div className="lg:col-span-5 space-y-6 sticky top-6">
              {/* video result */}
            {videoUrl && (
              <div className="bg-[var(--color-paper-2)] rounded-xl border border-[var(--color-rule)] shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-brand-50 text-[var(--color-accent)] rounded-md">
                      <Video className="size-4" />
                    </div>
                    <h3 className="font-semibold text-[var(--color-ink)]">Hasil Video Siap Ditonton</h3>
                  </div>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-medium">Rendered successfully</span>
                </div>
                
                <video src={videoUrl} controls className="w-full rounded-lg bg-black shadow-inner aspect-video" />
                
                <div className="flex gap-3">
                  <a
                    href={videoUrl}
                    download
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-paper)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-paper-3)] transition-all shadow-sm"
                  >
                    Download MP4
                  </a>
                  {projectId && (
                    <button
                      onClick={() => router.push(`/projects/${projectId}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink-2)] px-5 py-2.5 text-sm font-medium transition-all shadow-sm"
                    >
                      Buka Detail & Publish Storyboard
                    </button>
                  )}
                </div>
                  <button
                    onClick={resetStudio}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 px-5 py-3 text-sm font-bold transition-all border border-brand-200 shadow-sm"
                  >
                    <Plus className="size-4" /> Bikin Video Topik Baru
                  </button>
              </div>
            )}

            
              {/* pipeline progress */}
            {hasStarted && (
              <div className="bg-[var(--color-paper-2)] rounded-xl border border-[var(--color-rule)] shadow-sm overflow-hidden divide-y divide-[var(--color-rule)]">
                <div className="px-5 py-3.5 bg-[var(--color-paper-3)]/50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">AI Pipeline Progress</span>
                  {running && <span className="text-xs text-[var(--color-accent)] font-medium animate-pulse flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Sedang memproses...</span>}
                </div>
                
                <div className="px-6 py-3 divide-y divide-[var(--color-rule)]">
                  {stages.map((stage: Stage) => <StageRow key={stage.key} stage={stage} />)}

                  {/* render row */}
                  {renderStatus !== 'idle' && (
                    <div className="py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-5 shrink-0 flex justify-center">
                          {(renderStatus === 'pending' || renderStatus === 'processing') && <Loader2 className="size-4 animate-spin text-[var(--color-accent)]" />}
                          {renderStatus === 'completed' && <CheckCircle2 className="size-4 text-emerald-600" />}
                          {renderStatus === 'failed' && <XCircle className="size-4 text-rose-500" />}
                        </div>
                        <span className={`text-sm font-medium flex-1 ${renderStatus === 'failed' ? 'text-rose-500 font-semibold' : 'text-[var(--color-ink-2)]'}`}>
                          Render Video (GitHub Actions)
                        </span>
                        <a
                          href={renderDetail.githubRunId
                            ? `https://github.com/${GITHUB_REPO}/actions/runs/${renderDetail.githubRunId}`
                            : `https://github.com/${GITHUB_REPO}/actions`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:text-brand-800 font-medium transition-all"
                        >
                          <ExternalLink className="size-3" />
                          Live Log
                        </a>
                      </div>
                      {renderLog && (
                        <p className={`text-xs pl-8 font-mono ${renderStatus === 'failed' ? 'text-rose-500' : renderStatus === 'completed' ? 'text-emerald-600 font-semibold' : 'text-[var(--color-accent)] animate-pulse'}`}>
                          {renderLog}
                        </p>
                      )}
                      {/* progress bar images & voices */}
                      {renderStatus === 'processing' && renderDetail.totalScenes > 0 && (
                        <div className="pl-8 space-y-1.5">
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[10px] font-bold text-[var(--color-ink-3)]">
                              <span>Images</span>
                              <span>{renderDetail.imagesDone}/{renderDetail.totalScenes}</span>
                            </div>
                            <div className="h-1.5 bg-[var(--color-paper-3)] rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500" style={{ width: `${(renderDetail.imagesDone / renderDetail.totalScenes) * 100}%` }} />
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[10px] font-bold text-[var(--color-ink-3)]">
                              <span>Voices (TTS)</span>
                              <span>{renderDetail.voicesDone}/{renderDetail.totalScenes}</span>
                            </div>
                            <div className="h-1.5 bg-[var(--color-paper-3)] rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(renderDetail.voicesDone / renderDetail.totalScenes) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            
            </div>
          </div>
        </main>

      </div>
    </div>
  )
}
