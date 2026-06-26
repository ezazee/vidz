'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Film,
  Loader2,
  CheckCircle2,
  XCircle,
  WandSparkles,
  Video,
  ExternalLink,
  LayoutDashboard,
  Library,
  Search,
  Clock,
  Coins,
  TrendingUp,
  ChevronRight,
  Menu,
  X,
  RefreshCw,
  Activity,
  Youtube,
  Key,
  Plug,
  Link2,
  AlertCircle
} from 'lucide-react'

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

interface Project {
  id: string
  topic: string
  project_status: 'draft' | 'rendered' | 'uploaded'
  created_at: string
  render_status?: RenderStatus
  video_url?: string | null
  error?: string | null
}

interface AnalyticsData {
  totalProjects: number
  totalCompleted: number
  totalRenderTime: number
  timeSavedSeconds: number
  platformCost: number
  statusBreakdown: Record<string, number>
  youtubeConnected: boolean
  youtubeStats: {
    subscribers: number
    views: number
    watchTimeSeconds: number
    likes: number
  } | null
}

interface IntegrationStatus {
  zernioConnected: boolean
  youtubeConnected: boolean
  zernioApiKey: string
  youtubeChannelName: string | null
  youtubeChannelThumbnail: string | null
  youtubeAccountId: string | null
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
          {stage.status === 'running' && <Loader2 className="size-4 animate-spin text-indigo-600" />}
          {stage.status === 'done' && <CheckCircle2 className="size-4 text-emerald-600" />}
          {stage.status === 'error' && <XCircle className="size-4 text-rose-500" />}
          {stage.status === 'idle' && <div className="size-4 rounded-full border-2 border-slate-200" />}
        </div>
        <span className={`text-sm flex-1 font-medium ${stage.status === 'idle' ? 'text-slate-400 font-normal' : 'text-slate-700'}`}>
          {stage.label}
        </span>
        {stage.duration && stage.status === 'done' && (
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{stage.duration}s</span>
        )}
      </div>
      {stage.log && stage.status === 'running' && (
        <p className="text-xs text-indigo-600 pl-8 animate-pulse font-mono">{stage.log}</p>
      )}
      {stage.status === 'error' && (
        <p className="text-xs text-rose-500 pl-8 font-mono bg-rose-50 p-2 rounded-md mt-1 border border-rose-100">{stage.error}</p>
      )}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'studio' | 'library' | 'analytics' | 'integrations'>('studio')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Banner States (dari OAuth redirect)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Studio States
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

  // Library & Analytics States
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)

  // Integrations States
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null)
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)
  const [zernioInputKey, setZernioInputKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [connectingYoutube, setConnectingYoutube] = useState(false)

  // Load all library and analytics data
  const loadData = async () => {
    try {
      const projRes = await fetch('/api/projects')
      if (projRes.ok) {
        const data = await projRes.json()
        setProjects(data.projects || [])
      }

      const analRes = await fetch('/api/analytics')
      if (analRes.ok) {
        const data = await analRes.json()
        setAnalytics(data.analytics)
      }

      const integRes = await fetch('/api/integrations')
      if (integRes.ok) {
        const data = await integRes.json()
        setIntegrations(data)
        if (data.zernioConnected && !zernioInputKey) {
          setZernioInputKey(data.zernioApiKey)
        }
      }
    } catch (e) {
      console.error('Gagal memuat data', e)
    } finally {
      setLoadingProjects(false)
      setLoadingAnalytics(false)
      setLoadingIntegrations(false)
    }
  }

  // Read URL search parameter on mount (client-side only to prevent Next.js Suspense warnings)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab')
      const success = params.get('success')
      const error = params.get('error')

      if (tab === 'studio' || tab === 'library' || tab === 'analytics' || tab === 'integrations') {
        setActiveTab(tab)
      }

      if (success === 'youtube_connected') {
        setSuccessMessage('Channel YouTube Anda berhasil terhubung secara aman melalui Zernio!')
        // Bersihkan parameter query dari URL tanpa memicu reload halaman penuh
        router.replace('/?tab=integrations')
      }

      if (error) {
        if (error === 'oauth_failed') {
          setErrorMessage('Otorisasi YouTube dibatalkan atau gagal. Silakan coba lagi.')
        } else {
          setErrorMessage('Terjadi kesalahan saat memproses koneksi YouTube.')
        }
        router.replace('/?tab=integrations')
      }
    }
    loadData()
  }, [])

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
          loadData() // refresh database data
        }
        if (job.status === 'failed') {
          clearInterval(pollRef.current!)
          loadData() // refresh database data
        }
      } catch {}
    }, 4000)
    return () => clearInterval(pollRef.current!)
  }, [renderJobId, renderStatus])

  function stopLogCycle() {
    if (logTimerRef.current) clearInterval(logTimerRef.current)
  }

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

  // Save Zernio API Key
  const saveZernioKey = async () => {
    if (!zernioInputKey.trim() || savingKey) return
    setSavingKey(true)
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zernio_api_key: zernioInputKey.trim() }),
      })
      if (res.ok) {
        setSuccessMessage('Zernio API Key berhasil disimpan!')
        loadData() // reload integrations status
      } else {
        const data = await res.json()
        setErrorMessage(data.error || 'Gagal menyimpan Zernio API Key.')
      }
    } catch (e) {
      setErrorMessage('Terjadi kesalahan koneksi saat menyimpan kunci.');
    } finally {
      setSavingKey(false)
    }
  }

  // Initiate YouTube connection OAuth via Zernio
  const connectYoutube = async () => {
    if (connectingYoutube) return
    setConnectingYoutube(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/integrations/youtube/connect')
      const data = await res.json()
      if (res.ok && data.url) {
        console.log(`Redirecting user to Zernio OAuth connect URL: ${data.url}`)
        window.location.href = data.url // redirect ke jabat tangan Google OAuth
      } else {
        setErrorMessage(data.error || 'Gagal membuat URL koneksi YouTube dari Zernio.')
      }
    } catch (e) {
      setErrorMessage('Terjadi kesalahan saat memulai koneksi YouTube.');
    } finally {
      setConnectingYoutube(false)
    }
  }

  // Navigate to dedicated project page
  const inspectProject = (project: Project) => {
    router.push(`/projects/${project.id}`)
  }

  // Format seconds to Indonesian duration string
  function formatDuration(seconds: number): string {
    if (seconds <= 0) return '0d'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.round(seconds % 60)
    
    const parts = []
    if (h > 0) parts.push(`${h}j`)
    if (m > 0) parts.push(`${m}m`)
    if (s > 0 || parts.length === 0) parts.push(`${s}d`)
    
    return parts.join(' ')
  }

  const hasStarted = stages.some(s => s.status !== 'idle')
  const pipelineDone = stages.every(s => s.status === 'done')
  const sb = storyboard as {
    title?: string
    director?: Record<string, unknown>
    scenes?: { id: string; order_index: number; narration: string; duration: number }[]
  } | null

  // Filter projects by search query
  const filteredProjects = projects.filter(p =>
    p.topic.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-100 flex-col justify-between shrink-0 border-r border-slate-800">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 bg-slate-950/40">
            <div className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Film className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none tracking-wide text-white">StoryZ</h1>
              <p className="text-xs text-slate-400 mt-1">AI Video Studio</p>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1.5">
            <button
              onClick={() => setActiveTab('studio')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'studio'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <WandSparkles className="size-4" />
              AI Video Studio
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'library'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Library className="size-4" />
              Video Library
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="size-4" />
              Analytics Dashboard
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'integrations'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Plug className="size-4" />
              Integrations
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="rounded-lg bg-slate-800/40 p-3.5 border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">Render Engine</span>
            <span className="text-xs font-semibold text-slate-200 mt-1 block">GitHub Parallel Matrix</span>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-slate-400">8 runner active</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-sm">
          <aside className="w-64 bg-slate-900 text-slate-100 flex-col justify-between h-full shadow-2xl flex">
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white shadow-lg">
                    <Film className="size-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold leading-none tracking-wide text-white">StoryZ</h1>
                    <p className="text-xs text-slate-400 mt-1">AI Video Studio</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="size-5" />
                </button>
              </div>

              <nav className="px-4 py-6 space-y-1.5">
                <button
                  onClick={() => { setActiveTab('studio'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <WandSparkles className="size-4" />
                  AI Video Studio
                </button>
                <button
                  onClick={() => { setActiveTab('library'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'library' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Library className="size-4" />
                  Video Library
                </button>
                <button
                  onClick={() => { setActiveTab('analytics'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutDashboard className="size-4" />
                  Analytics Dashboard
                </button>
                <button
                  onClick={() => { setActiveTab('integrations'); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'integrations' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Plug className="size-4" />
                  Integrations
                </button>
              </nav>
            </div>
            
            <div className="p-4 border-t border-slate-800 bg-slate-950/20">
              <div className="rounded-lg bg-slate-800/40 p-3.5 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">Render Engine</span>
                <span className="text-xs font-semibold text-slate-200 mt-1 block">GitHub Parallel Matrix</span>
                <div className="mt-2 flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-slate-400">8 runner active</span>
                </div>
              </div>
            </div>
          </aside>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-all"
            >
              <Menu className="size-5" />
            </button>
            
            <div>
              <h2 className="text-base font-semibold text-slate-800 capitalize">
                {activeTab === 'studio' && 'AI Production Studio'}
                {activeTab === 'library' && 'Historical Video Library'}
                {activeTab === 'analytics' && 'Platform Performance Analytics'}
                {activeTab === 'integrations' && 'Platform Integrations & Connections'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200"
              title="Refresh data"
            >
              <RefreshCw className="size-4" />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Cloud Connected
            </span>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* Toast/Banner Pemberitahuan */}
          {successMessage && (
            <div className="max-w-3xl mx-auto mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 relative">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">Berhasil</p>
                <p className="text-xs text-emerald-600 mt-0.5">{successMessage}</p>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 absolute top-3 right-3">
                <X className="size-4" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="max-w-3xl mx-auto mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 relative">
              <XCircle className="size-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-rose-800">Gagal</p>
                <p className="text-xs text-rose-500 mt-0.5">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 absolute top-3 right-3">
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* TAB 1: STUDIO */}
          {activeTab === 'studio' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* input card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-700">Mulai Produksi Video Baru</h3>
                  <p className="text-xs text-slate-400">Masukkan topik sejarah, sains, atau dokumenter untuk menyusun storyboard dan merender video otomatis.</p>
                </div>
                
                <div className="flex gap-2">
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && generate()}
                    disabled={running}
                    placeholder="misal: Sejarah Kerajaan Majapahit, Detik-detik Proklamasi 1945"
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <button
                    onClick={generate}
                    disabled={topic.trim().length < 3 || running}
                    className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 shadow-lg shadow-indigo-600/15 disabled:shadow-none transition-all flex items-center gap-2 shrink-0"
                  >
                    {running ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                    Generate
                  </button>
                </div>
              </div>

              {/* pipeline progress */}
              {hasStarted && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  <div className="px-5 py-3.5 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Pipeline Progress</span>
                    {running && <span className="text-xs text-indigo-600 font-medium animate-pulse flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Sedang memproses...</span>}
                  </div>
                  
                  <div className="px-6 py-3 divide-y divide-slate-100">
                    {stages.map(stage => <StageRow key={stage.key} stage={stage} />)}

                    {/* render row */}
                    {pipelineDone && renderStatus !== 'idle' && (
                      <div className="py-3 space-y-1.5">
                        <div className="flex items-center gap-3">
                          <div className="w-5 shrink-0 flex justify-center">
                            {(renderStatus === 'pending' || renderStatus === 'processing') && <Loader2 className="size-4 animate-spin text-indigo-600" />}
                            {renderStatus === 'completed' && <CheckCircle2 className="size-4 text-emerald-600" />}
                            {renderStatus === 'failed' && <XCircle className="size-4 text-rose-500" />}
                          </div>
                          <span className={`text-sm font-medium flex-1 ${renderStatus === 'failed' ? 'text-rose-500 font-semibold' : 'text-slate-700'}`}>
                            GitHub Parallel Rendering (Matrix)
                          </span>
                          <a
                            href={`https://github.com/${GITHUB_REPO}/actions`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-all"
                          >
                            <ExternalLink className="size-3" />
                            Live Actions Log
                          </a>
                        </div>
                        {renderLog && (
                          <p className={`text-xs pl-8 font-mono ${renderStatus === 'failed' ? 'text-rose-500' : renderStatus === 'completed' ? 'text-emerald-600 font-semibold' : 'text-indigo-600 animate-pulse'}`}>
                            {renderLog}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* video result */}
              {videoUrl && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                        <Video className="size-4" />
                      </div>
                      <h3 className="font-semibold text-slate-800">Hasil Video Siap Ditonton</h3>
                    </div>
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-medium">Rendered successfully</span>
                  </div>
                  
                  <video src={videoUrl} controls className="w-full rounded-lg bg-black shadow-inner aspect-video" />
                  
                  <div className="flex gap-3">
                    <a
                      href={videoUrl}
                      download
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 transition-all shadow-sm"
                    >
                      Download MP4
                    </a>
                  </div>
                </div>
              )}

              {/* storyboard scenes */}
              {sb && (sb.scenes ?? []).length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-bold text-slate-800 text-lg">{sb.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">Daftar skrip adegan ({(sb.scenes ?? []).length} adegan) yang disusun untuk visualisasi.</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-xs border border-slate-100 bg-slate-50/50 p-3.5 rounded-lg">
                    {(['genre', 'visual_style', 'voice_style'] as const).map(k => (
                      <div key={k} className="space-y-0.5">
                        <span className="text-slate-400 block capitalize font-medium">{k.replace('_', ' ')}</span>
                        <span className="font-semibold text-slate-700 block">{String((sb.director as Record<string, unknown>)?.[k] ?? 'Standard')}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 divide-y divide-slate-50">
                    {(sb.scenes ?? []).map(scene => (
                      <div key={scene.id} className="pt-3 first:pt-0 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-indigo-600">Scene {scene.order_index + 1}</span>
                          <span>Durasi: {scene.duration}s</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100/50">{scene.narration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIBRARY / HISTORY */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {/* Search and filters bar */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari topik video..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Menampilkan {filteredProjects.length} dari {projects.length} proyek
                </span>
              </div>

              {/* projects table/grid */}
              {loadingProjects ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl">
                  <Loader2 className="size-8 animate-spin text-indigo-600" />
                  <span className="text-sm font-semibold">Memuat riwayat proyek...</span>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-xl bg-white p-16 text-center flex flex-col items-center justify-center gap-3">
                  <Video className="size-8 text-slate-300" />
                  <div>
                    <p className="font-semibold text-slate-700">Tidak Ada Proyek Ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">{searchQuery ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Mulai buat video baru pada tab AI Video Studio.'}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => inspectProject(project)}
                      className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 p-5 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        {/* status badges */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          
                          {/* Status render badge */}
                          {project.render_status === 'completed' && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">Ready</span>
                          )}
                          {project.project_status === 'uploaded' && (
                            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100 flex items-center gap-1">
                              <Youtube className="size-2.5" /> Published
                            </span>
                          )}
                          {(project.render_status === 'pending' || project.render_status === 'processing') && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100 animate-pulse">Rendering</span>
                          )}
                          {project.render_status === 'failed' && (
                            <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold border border-rose-100">Failed</span>
                          )}
                          {!project.render_status && (
                            <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full font-bold border border-slate-200">Draft</span>
                          )}
                        </div>
                        
                        <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {project.topic}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-xs">
                        <span className="text-slate-400 font-mono text-[10px]">ID: {project.id.slice(0, 8)}...</span>
                        <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-semibold">
                          Buka Halaman Detail <ChevronRight className="size-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              
              {loadingAnalytics ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <Loader2 className="size-8 animate-spin text-indigo-600" />
                  <span className="text-sm font-semibold">Menganalisis performa platform...</span>
                </div>
              ) : analytics ? (
                <>
                  {/* YouTube Analytics Section jika terhubung */}
                  {analytics.youtubeConnected && analytics.youtubeStats && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-50 text-red-600 rounded-md">
                          <Youtube className="size-4" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">YouTube Channel Live Metrics</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {/* YouTube Subscribers */}
                        <div className="bg-gradient-to-br from-red-500/5 to-pink-500/5 border border-red-100 rounded-xl p-5 shadow-sm flex items-start justify-between relative overflow-hidden group">
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500 block font-medium">YouTube Subscribers</span>
                            <span className="text-2xl font-black text-red-600 block">{analytics.youtubeStats.subscribers.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Live dari YouTube API</span>
                          </div>
                          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <Plug className="size-4" />
                          </div>
                        </div>

                        {/* YouTube Views */}
                        <div className="bg-gradient-to-br from-red-500/5 to-pink-500/5 border border-red-100 rounded-xl p-5 shadow-sm flex items-start justify-between relative overflow-hidden group">
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500 block font-medium">Total Penayangan Channel</span>
                            <span className="text-2xl font-black text-slate-800 block">{analytics.youtubeStats.views.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Akumulasi views video</span>
                          </div>
                          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <Video className="size-4" />
                          </div>
                        </div>

                        {/* YouTube Likes */}
                        <div className="bg-gradient-to-br from-red-500/5 to-pink-500/5 border border-red-100 rounded-xl p-5 shadow-sm flex items-start justify-between relative overflow-hidden group">
                          <div className="space-y-1">
                            <span className="text-xs text-slate-500 block font-medium">Total Likes</span>
                            <span className="text-2xl font-black text-slate-800 block">{analytics.youtubeStats.likes.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] text-slate-400 block mt-1">Interaksi & apresiasi pemirsa</span>
                          </div>
                          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                            <TrendingUp className="size-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grid Cards Metrik Platform */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                        <Activity className="size-4" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">StoryZ Studio Platform Metrics</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      {/* Card 1: Total Completed Videos */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start justify-between relative overflow-hidden group">
                        <div className="space-y-1">
                          <span className="text-xs text-slate-400 block font-medium">Total Video Selesai</span>
                          <span className="text-2xl font-bold text-slate-800 block">{analytics.totalCompleted}</span>
                          <span className="text-[10px] text-slate-400 block mt-1">Dari total {analytics.totalProjects} proyek</span>
                        </div>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform duration-200">
                          <Video className="size-5" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600" />
                      </div>

                      {/* Card 2: Parallel Render Time Saved */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start justify-between relative overflow-hidden group">
                        <div className="space-y-1">
                          <span className="text-xs text-slate-400 block font-medium">Waktu Tunggu Dihemat</span>
                          <span className="text-2xl font-bold text-emerald-600 block">{formatDuration(analytics.timeSavedSeconds)}</span>
                          <span className="text-[10px] text-emerald-600/80 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1 font-semibold border border-emerald-100">~85% Lebih Cepat</span>
                        </div>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform duration-200">
                          <TrendingUp className="size-5" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                      </div>

                      {/* Card 3: Total Render Duration */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start justify-between relative overflow-hidden group">
                        <div className="space-y-1">
                          <span className="text-xs text-slate-400 block font-medium">Akumulasi Waktu Render</span>
                          <span className="text-2xl font-bold text-slate-800 block">{formatDuration(analytics.totalRenderTime)}</span>
                          <span className="text-[10px] text-slate-400 block mt-1">Durasi proses mesin riil</span>
                        </div>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-105 transition-transform duration-200">
                          <Clock className="size-5" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-600" />
                      </div>

                      {/* Card 4: Platform Costs */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start justify-between relative overflow-hidden group">
                        <div className="space-y-1">
                          <span className="text-xs text-slate-400 block font-medium">Biaya Platform Cloud</span>
                          <span className="text-2xl font-bold text-indigo-600 block">$0.00</span>
                          <span className="text-[10px] text-indigo-600/80 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1 font-semibold border border-indigo-100">100% Gratis Selamanya</span>
                        </div>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-105 transition-transform duration-200">
                          <Coins className="size-5" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Penjelasan Performa Matriks Paralel */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                      <div className="border-b border-slate-100 pb-3.5">
                        <h3 className="font-bold text-slate-800 text-sm">Analisis Perbandingan Durasi Render</h3>
                        <p className="text-xs text-slate-400 mt-1">Bagaimana integrasi 8-runner paralel matrix memotong waktu tunggu rendering Anda secara signifikan.</p>
                      </div>
                      
                      <div className="space-y-4 text-xs">
                        {/* Render Sekuensial bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-slate-500">
                            <span>Sistem Render Sekuensial Standar (1 Runner)</span>
                            <span className="font-semibold">43 menit</span>
                          </div>
                          <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden flex items-center px-3 relative">
                            <div className="bg-slate-400 h-full absolute left-0 top-0 w-[85%] transition-all rounded-full opacity-25" />
                            <span className="z-10 text-[10px] text-slate-600 font-bold">Terlalu lama (pembatasan vCPU runner)</span>
                          </div>
                        </div>

                        {/* Render Paralel Matrix bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-indigo-600 font-semibold">
                            <span>Sistem Render Paralel Matrix StoryZ (8 Runner)</span>
                            <span>5 menit</span>
                          </div>
                          <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden flex items-center relative border border-indigo-100">
                            <div className="bg-indigo-600 h-full absolute left-0 top-0 w-[11.6%] transition-all rounded-full shadow-sm" />
                            <span className="z-10 text-[10px] text-indigo-600 font-extrabold pl-[14%]">8x Lebih Cepat!</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 text-xs text-indigo-700 leading-relaxed">
                        <strong>Metodologi Perhitungan:</strong> Video dokumenter berdurasi 10-15 menit (rata-rata 23,370 frame) memerlukan waktu tunggu render sebesar 43 menit jika menggunakan mesin tunggal. Dengan memotong video menjadi 8 bagian (chunks) secara dinamis, orkestrasi matriks kami menyebarkan rendering ke 8 mesin virtual GitHub gratis yang bekerja secara paralel, kemudian menyatukannya secara instan dalam 1 detik menggunakan FFmpeg demuxer tanpa kompresi ulang.
                      </div>
                    </div>

                    {/* Status Breakdown card */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Distribusi Status Render</h3>
                        
                        <div className="mt-5 space-y-3">
                          {[
                            { key: 'completed', label: 'Completed (Ready)', color: 'bg-emerald-500', text: 'text-emerald-600' },
                            { key: 'processing', label: 'Processing', color: 'bg-indigo-500', text: 'text-indigo-600' },
                            { key: 'pending', label: 'Pending (Queue)', color: 'bg-amber-400', text: 'text-amber-500' },
                            { key: 'failed', label: 'Failed', color: 'bg-rose-500', text: 'text-rose-500' },
                          ].map(status => {
                            const count = analytics.statusBreakdown[status.key] || 0
                            const percentage = analytics.totalProjects > 0 ? (count / analytics.totalProjects) * 100 : 0
                            
                            return (
                              <div key={status.key} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-500 flex items-center gap-1.5">
                                    <span className={`size-2 rounded-full ${status.color}`} />
                                    {status.label}
                                  </span>
                                  <span className={status.text}>{count} ({Math.round(percentage)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div className={`${status.color} h-full transition-all`} style={{ width: `${percentage}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-slate-50 text-[11px] text-slate-400 flex items-center gap-1.5 mt-4">
                        <Activity className="size-3.5 text-indigo-500" />
                        <span>Statistik terenkripsi di Neon DB Cloud</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-sm text-slate-400 italic">Data statistik tidak tersedia.</p>
              )}
            </div>
          )}

          {/* TAB 4: INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div className="max-w-3xl mx-auto space-y-6">
              
              {loadingIntegrations ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <Loader2 className="size-8 animate-spin text-indigo-600" />
                  <span className="text-sm font-semibold">Memuat status integrasi...</span>
                </div>
              ) : integrations ? (
                <div className="space-y-6">
                  
                  {/* Card 1: Zernio API Connection */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Plug className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">1. Koneksi Platform Zernio</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Zernio digunakan sebagai unified API untuk OAuth YouTube dan penarikan metrik analitik.</p>
                        </div>
                      </div>
                      
                      {integrations.zernioConnected ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-100">Connected</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold border border-slate-200">Not Connected</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600">Zernio Secret API Key</label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={zernioInputKey}
                            onChange={e => setZernioInputKey(e.target.value)}
                            placeholder="sk_live_..."
                            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                          />
                          <button
                            onClick={saveZernioKey}
                            disabled={!zernioInputKey.trim() || savingKey}
                            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40 transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 shrink-0"
                          >
                            {savingKey ? <Loader2 className="size-4 animate-spin" /> : <Key className="size-4" />}
                            Simpan Key
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Dapatkan API Key Anda di dasbor akun Zernio Anda.</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: YouTube Integration */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                          <Youtube className="size-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">2. Koneksi Channel YouTube</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Hubungkan akun Google/YouTube Anda untuk publikasi otomatis dari StoryZ.</p>
                        </div>
                      </div>
                      
                      {integrations.youtubeConnected ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold border border-emerald-100">Linked</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold border border-slate-200">Unlinked</span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {!integrations.zernioConnected ? (
                        <div className="rounded-lg bg-slate-50 border border-slate-200/60 p-4 flex items-start gap-2.5 text-xs text-slate-500">
                          <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>Anda harus memasukkan dan menyimpan Zernio API Key terlebih dahulu di atas sebelum dapat menghubungkan channel YouTube Anda.</span>
                        </div>
                      ) : integrations.youtubeConnected ? (
                        /* Tampilan detail Channel YouTube terhubung */
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200/60 p-5 rounded-xl">
                          <div className="flex items-center gap-4">
                            {integrations.youtubeChannelThumbnail ? (
                              <img
                                src={integrations.youtubeChannelThumbnail}
                                alt="YouTube avatar"
                                className="size-12 rounded-full border border-slate-200 shadow-sm"
                              />
                            ) : (
                              <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center border border-red-200">
                                <Youtube className="size-6" />
                              </div>
                            )}
                            <div>
                              <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold border border-red-100 inline-block">Active Channel</span>
                              <h4 className="font-bold text-slate-800 text-sm mt-1">{integrations.youtubeChannelName}</h4>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">Account ID: {integrations.youtubeAccountId}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={connectYoutube}
                              disabled={connectingYoutube}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition-all flex items-center gap-1.5"
                            >
                              {connectingYoutube ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
                              Ganti Channel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Tampilan jika belum terhubung */
                        <div className="space-y-3 py-2">
                          <p className="text-xs text-slate-500">Zernio menggunakan OAuth Google resmi dan terenkripsi untuk mengamankan kredensial Anda. Anda tidak perlu memasukkan sandi di aplikasi ini.</p>
                          <button
                            onClick={connectYoutube}
                            disabled={connectingYoutube}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-6 py-3 text-sm font-semibold transition-all shadow-md shadow-red-600/10 disabled:opacity-50"
                          >
                            {connectingYoutube ? <Loader2 className="size-4 animate-spin" /> : <Youtube className="size-4" />}
                            Hubungkan Channel YouTube Sekarang
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-slate-400 italic">Gagal memuat status integrasi.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
