'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
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
  MoonStar,
  Rocket,
  HelpCircle,
  Swords,
  Plus,
  Cpu
} from 'lucide-react'

const THEMES = [
  { id: 'Ancient History', label: 'Sejarah Kuno', icon: Compass, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'Unsolved Mysteries', label: 'Misteri & Kriminal', icon: MoonStar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'Space & Astronomy', label: 'Luar Angkasa', icon: Rocket, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'What-If Scenarios', label: 'Skenario "What-If"', icon: HelpCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'Mythology & Folklore', label: 'Mitologi & Legenda', icon: Swords, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'Technology & IT', label: 'Teknologi & IT', icon: Cpu, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' }
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
    'Menjalankan Web Scraper (DuckDuckGo Lite)...',
    'Mengekstrak snippet berita/artikel terkini...',
    'RAG: Menginjeksi referensi real-time ke memori AI...',
    'Merangkum fakta-fakta anti-halusinasi...',
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

export default function StudioPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Studio States
  const [topic, setTopic] = useState('')
  const [selectedTheme, setSelectedTheme] = useState('Unsolved Mysteries')
  const [running, setRunning] = useState(false)
  const [stages, setStages] = useState<Stage[]>(buildStages())
  const [projectId, setProjectId] = useState<string | null>(null)
  const [storyboard, setStoryboard] = useState<Record<string, any> | null>(null)
  const [renderJobId, setRenderJobId] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('idle')
  const [renderLog, setRenderLog] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Polling unified pipeline status
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
          // map DB status to UI status
          let uiStatus: StageStatus = 'idle'
          if (dbStatus === 'completed') uiStatus = 'done'
          if (dbStatus === 'processing' || dbStatus === 'pending') uiStatus = 'running'
          if (dbStatus === 'failed') uiStatus = 'error'
          
          if (uiStatus === 'running' && !st.log) {
            startLogCycle(st.key)
          } else if (uiStatus === 'done' || uiStatus === 'error') {
             // Let log remain or clear it if handled elsewhere
          }
          return { ...st, status: uiStatus }
        }))
        
        setRenderStatus(s.render)
        if (s.render !== 'idle') {
           setRenderLog(RENDER_LOGS[s.render] ?? '')
        }
        
        if (s.render === 'completed' && data.videoUrl) {
          setVideoUrl(data.videoUrl)
          setRunning(false)
          clearInterval(pollRef.current!)
          localStorage.removeItem('activeProjectId')
        }
        if (s.render === 'failed' || s.research === 'failed' || s.director === 'failed') {
          setRunning(false)
          clearInterval(pollRef.current!)
          localStorage.removeItem('activeProjectId')
        }
      } catch {}
    }, 3000)
    return () => clearInterval(pollRef.current!)
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
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Desktop & Mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
            <h2 className="text-base font-semibold text-slate-800">AI Production Studio</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-1.5">
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-700">Pilih Tema & Topik Utama</h3>
                <p className="text-xs text-slate-400">Pilih genre visual dan BGM sebelum memasukkan topik untuk hasil terbaik.</p>
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
                          : 'border-slate-200 bg-white hover:bg-slate-50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Icon className={`size-5 ${isSelected ? theme.color : 'text-slate-400'}`} />
                      <span className={`text-[10px] font-bold leading-tight ${isSelected ? theme.color : 'text-slate-500'}`}>
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

              {/* AI Recommendations */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <WandSparkles className="size-3.5 text-indigo-500" /> 
                    Butuh Ide Topik?
                  </h3>
                  <p className="text-xs text-slate-500">Klik tombol di bawah untuk meminta AI memberikan ide topik yang sangat clickbait dan edukatif berdasarkan tema <span className="font-bold text-slate-700">"{THEMES.find(t => t.id === selectedTheme)?.label}"</span>.</p>
                </div>
                
                {recommendations.length === 0 && !loadingRecs ? (
                  <button
                    onClick={fetchRecommendations}
                    disabled={running}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className="size-3.5" /> Generate Ide Topik
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-md">
                        Rekomendasi Tema {THEMES.find(t => t.id === selectedTheme)?.label}
                      </span>
                      <button
                        onClick={fetchRecommendations}
                        disabled={loadingRecs || running}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 disabled:opacity-50 transition-all"
                      >
                        {loadingRecs ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                        Generate Ulang
                      </button>
                    </div>
                    
                    {loadingRecs ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 py-4 justify-center bg-slate-50 rounded-xl border border-slate-100 border-dashed animate-pulse font-medium">
                        <Loader2 className="size-4 animate-spin text-indigo-600" />
                        Menganalisis algoritma & meracik topik clickbait...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {recommendations.map((rec: string, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setTopic(rec)}
                            disabled={running}
                            className="text-xs bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-600 px-4 py-3 rounded-xl border border-slate-200 transition-all font-medium text-left shadow-sm group"
                          >
                            <span className="text-slate-400 group-hover:text-indigo-400 mr-2 font-bold">{idx + 1}.</span>
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{sb.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">Daftar skrip adegan ({(sb.scenes ?? []).length} adegan) yang disusun untuk visualisasi.</p>
                  </div>
                  {projectId && (
                    <button
                      onClick={() => router.push(`/projects/${projectId}`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      Buka Detail Adegan &rarr;
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-xs border border-slate-100 bg-slate-50/50 p-3.5 rounded-lg">
                  {(['genre', 'visual_style', 'voice_style'] as const).map(k => (
                    <div key={k} className="space-y-0.5">
                      <span className="text-slate-400 block capitalize font-medium">{k.replace('_', ' ')}</span>
                      <span className="font-semibold text-slate-700 block">{String((sb.director as Record<string, unknown>)?.[k] ?? 'Standard')}</span>
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/20">
                  {(sb.scenes ?? []).map((scene) => (
                    <div key={scene.id} className="p-4 flex gap-4 text-xs">
                      <span className="font-bold text-indigo-600 shrink-0">#{scene.order_index + 1}</span>
                      <div className="space-y-1">
                        <p className="text-slate-700 font-medium leading-relaxed">{scene.narration}</p>
                        <p className="text-[10px] text-slate-400 font-mono italic">Prompt: {scene.image_prompt}</p>
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
                  {projectId && (
                    <button
                      onClick={() => router.push(`/projects/${projectId}`)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 text-sm font-medium transition-all shadow-sm"
                    >
                      Buka Detail & Publish Storyboard
                    </button>
                  )}
                </div>
                  <button
                    onClick={resetStudio}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-3 text-sm font-bold transition-all border border-indigo-200 shadow-sm"
                  >
                    <Plus className="size-4" /> Bikin Video Topik Baru
                  </button>
              </div>
            )}

            
              {/* pipeline progress */}
            {hasStarted && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                <div className="px-5 py-3.5 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Pipeline Progress</span>
                  {running && <span className="text-xs text-indigo-600 font-medium animate-pulse flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Sedang memproses...</span>}
                </div>
                
                <div className="px-6 py-3 divide-y divide-slate-100">
                  {stages.map((stage: Stage) => <StageRow key={stage.key} stage={stage} />)}

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

            
            </div>
          </div>
        </main>

      </div>
    </div>
  )
}
