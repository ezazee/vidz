'use client'
import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Film,
  Loader2,
  CheckCircle2,
  XCircle,
  Video,
  ExternalLink,
  LayoutDashboard,
  Library,
  WandSparkles,
  Menu,
  X,
  RefreshCw,
  AlertCircle,
  Activity,
  Youtube
} from 'lucide-react'

type RenderStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

interface Project {
  id: string
  topic: string
  project_status: 'draft' | 'rendered' | 'uploaded'
  created_at: string
  render_status?: RenderStatus
  video_url?: string | null
  error?: string | null
  youtube_url?: string | null
  upload_status?: string | null
}

interface Scene {
  id: string
  order_index: number
  narration: string
  duration: number
  image_url?: string
  voice_url?: string
}

const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'ezazee/vidz'

const RENDER_LOGS: Record<string, string> = {
  pending: 'GitHub Actions triggered — menunggu runner tersedia...',
  processing: 'Generating images, voices, dan rendering video...',
  completed: 'Video berhasil dirender!',
  failed: 'Render gagal — cek GitHub Actions logs.',
}

function SceneCard({ scene, renderStatus }: { scene: Scene; renderStatus: RenderStatus }) {
  const getImageUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return '/' + url
  }

  const getVoiceUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return '/' + url
  }

  const isRendering = renderStatus === 'processing' || renderStatus === 'pending'

  return (
    <div className="bg-white border border-slate-200/60 rounded-xl p-4 space-y-4 hover:border-indigo-100 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span className="text-indigo-600 font-bold">Adegan {scene.order_index + 1}</span>
        <span className="bg-slate-100 px-2.5 py-0.5 rounded-md text-slate-500 font-medium">Durasi: {scene.duration}s</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
        {/* Left: Image / Visual */}
        <div className="sm:col-span-4">
          {scene.image_url ? (
            <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 relative group bg-slate-950 shadow-sm">
              <img
                src={getImageUrl(scene.image_url)}
                alt={`Visual Adegan ${scene.order_index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : isRendering ? (
            <div className="aspect-video bg-slate-50 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 gap-1.5 animate-pulse">
              <Loader2 className="size-4 animate-spin text-indigo-500" />
              <span className="text-[10px] font-semibold tracking-wide">Membuat Visual...</span>
            </div>
          ) : (
            <div className="aspect-video bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-300">
              <Video className="size-6" />
            </div>
          )}
        </div>

        {/* Right: Narration & Voiceover Player */}
        <div className="sm:col-span-8 flex flex-col space-y-3 justify-start">
          <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
            {scene.narration}
          </p>

          {/* Voiceover player */}
          {scene.voice_url ? (
            <div className="flex items-center bg-indigo-50/40 border border-indigo-100/50 rounded-lg p-1.5">
              <audio
                src={getVoiceUrl(scene.voice_url)}
                controls
                className="w-full h-7 text-xs accent-indigo-600"
              />
            </div>
          ) : isRendering ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-2.5 flex items-center gap-2 animate-pulse">
              <Loader2 className="size-3 animate-spin text-indigo-500" />
              <span className="text-[10px] font-semibold text-slate-400">Membuat Voiceover...</span>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center text-[10px] text-slate-400 italic font-medium">
              Voiceover tidak tersedia
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Data States
  const [project, setProject] = useState<Project | null>(null)
  const [storyboard, setStoryboard] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Integrations & Publishing States
  const [youtubeConnected, setYoutubeConnected] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch project details, storyboard, and integrations status
  const fetchProjectData = async () => {
    try {
      const projRes = await fetch(`/api/projects/${id}`)
      if (!projRes.ok) {
        if (projRes.status === 404) {
          throw new Error('Proyek tidak ditemukan')
        }
        throw new Error('Gagal memuat data proyek')
      }
      const projData = await projRes.json()
      setProject(projData.project)

      const sbRes = await fetch(`/api/projects/${id}/storyboard`)
      if (sbRes.ok) {
        const sbData = await sbRes.json()
        setStoryboard(sbData.storyboard)
      }

      const integRes = await fetch('/api/integrations')
      if (integRes.ok) {
        const integData = await integRes.json()
        setYoutubeConnected(integData.youtubeConnected)
      }
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjectData()
  }, [id])

  // Polling render status and storyboard changes if pending or processing
  useEffect(() => {
    if (!project || project.render_status === 'completed' || project.render_status === 'failed') {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${id}`)
        if (!res.ok) return
        const data = await res.json()
        const updatedProj = data.project
        setProject(updatedProj)
        
        const sbRes = await fetch(`/api/projects/${id}/storyboard`)
        if (sbRes.ok) {
          const sbData = await sbRes.json()
          setStoryboard(sbData.storyboard)
        }

        if (updatedProj.render_status === 'completed' || updatedProj.render_status === 'failed') {
          clearInterval(pollRef.current!)
        }
      } catch {}
    }, 4000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [project?.render_status, id])

  // Publish video to YouTube via Zernio API
  const publishToYoutube = async () => {
    if (publishing) return
    setPublishing(true)
    setPublishSuccess(null)
    setPublishError(null)
    try {
      const res = await fetch(`/api/projects/${id}/publish`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setPublishSuccess(data.message)
        // Refresh project data to show new published status
        fetchProjectData()
      } else {
        setPublishError(data.error || 'Gagal memublikasikan video ke YouTube.')
      }
    } catch (e) {
      setPublishError('Terjadi kesalahan koneksi saat mengunggah ke YouTube.')
    } finally {
      setPublishing(false)
    }
  }

  const sb = storyboard as {
    title?: string
    director?: Record<string, unknown>
    scenes?: Scene[]
  } | null

  // Hitung jumlah aset gambar dan suara yang telah selesai secara real-time
  const scenes = sb?.scenes ?? []
  const totalScenes = scenes.length
  
  const completedImages = scenes.filter(
    s => s.image_url && s.image_url.trim() !== ''
  ).length
  
  const completedVoices = scenes.filter(
    s => s.voice_url && s.voice_url.trim() !== ''
  ).length

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
            <Link
              href="/?tab=studio"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all duration-200"
            >
              <WandSparkles className="size-4" />
              AI Video Studio
            </Link>
            <Link
              href="/?tab=library"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition-all duration-200"
            >
              <Library className="size-4" />
              Video Library
            </Link>
            <Link
              href="/?tab=analytics"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-all duration-200"
            >
              <LayoutDashboard className="size-4" />
              Analytics Dashboard
            </Link>
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
                <Link
                  href="/?tab=studio"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800/60 transition-all"
                >
                  <WandSparkles className="size-4" />
                  AI Video Studio
                </Link>
                <Link
                  href="/?tab=library"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg bg-indigo-600 text-white shadow-md transition-all"
                >
                  <Library className="size-4" />
                  Video Library
                </Link>
                <Link
                  href="/?tab=analytics"
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:bg-slate-800/60 transition-all"
                >
                  <LayoutDashboard className="size-4" />
                  Analytics Dashboard
                </Link>
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
              <h2 className="text-base font-semibold text-slate-800">
                Detail Proyek Video
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProjectData}
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
          
          {/* Toast Notifikasi Penerbitan YouTube */}
          {publishSuccess && (
            <div className="max-w-6xl mx-auto mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 relative">
              <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">Publish Sukses</p>
                <p className="text-xs text-emerald-600 mt-0.5">{publishSuccess}</p>
              </div>
              <button onClick={() => setPublishSuccess(null)} className="text-emerald-400 hover:text-emerald-600 absolute top-3 right-3">
                <X className="size-4" />
              </button>
            </div>
          )}

          {publishError && (
            <div className="max-w-6xl mx-auto mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 relative">
              <XCircle className="size-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-rose-800">Publish Gagal</p>
                <p className="text-xs text-rose-500 mt-0.5">{publishError}</p>
              </div>
              <button onClick={() => setPublishError(null)} className="text-rose-400 hover:text-rose-600 absolute top-3 right-3">
                <X className="size-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm max-w-5xl mx-auto">
              <Loader2 className="size-8 animate-spin text-indigo-600" />
              <span className="text-sm font-semibold">Memuat detail proyek...</span>
            </div>
          ) : error || !project ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center max-w-xl mx-auto flex flex-col items-center justify-center gap-4">
              <XCircle className="size-10 text-rose-500" />
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Gagal Memuat Proyek</h3>
                <p className="text-sm text-slate-400 mt-1">{error || 'Proyek tidak ditemukan.'}</p>
              </div>
              <Link
                href="/?tab=library"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Kembali ke Library
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-6xl mx-auto">
              {/* Back button */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <Link
                  href="/?tab=library"
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  &larr; Kembali ke Daftar Pustaka
                </Link>
                <div className="flex items-center gap-2">
                  {project.project_status === 'uploaded' && (
                    <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-bold border border-red-100 flex items-center gap-1">
                      <Youtube className="size-3" /> YouTube Published
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">ID: {project.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Video player & stats / live progress panel */}
                <div className="lg:col-span-5 space-y-5">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">Topic</span>
                    <h3 className="text-xl font-bold text-slate-800 mt-1 leading-snug">{project.topic}</h3>
                    <p className="text-xs text-slate-400 mt-1">Dibuat pada {new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>

                  {/* Video Player or active progress */}
                  {project.video_url ? (
                    <div className="space-y-3">
                      <video src={project.video_url} controls className="w-full rounded-lg bg-black shadow-md aspect-video" />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <a
                          href={project.video_url}
                          download
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold hover:bg-slate-800 transition-all shadow-sm"
                        >
                          Download MP4
                        </a>

                        {/* YouTube publishing actions */}
                        {youtubeConnected ? (
                          project.project_status === 'uploaded' || project.youtube_url ? (
                            <a
                              href={project.youtube_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 px-4 py-2.5 text-xs font-semibold transition-all shadow-sm"
                            >
                              <Youtube className="size-3.5" />
                              Tonton di YouTube
                            </a>
                          ) : project.upload_status === 'processing' || publishing ? (
                            <button
                              disabled
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 text-red-500 border border-red-200 px-4 py-2.5 text-xs font-semibold cursor-not-allowed w-full"
                            >
                              <Loader2 className="size-3.5 animate-spin" />
                              Publishing...
                            </button>
                          ) : (
                            <button
                              onClick={publishToYoutube}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 text-xs font-semibold transition-all shadow-sm shadow-red-600/10"
                            >
                              <Youtube className="size-3.5" />
                              Publish ke YouTube
                            </button>
                          )
                        ) : (
                          <div className="col-span-2 p-3 bg-slate-100 rounded-lg text-[10px] text-slate-500 text-center leading-relaxed">
                            Hubungkan channel YouTube Anda di tab **Integrasi** halaman utama untuk memublikasikan video otomatis ke YouTube.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-6 shadow-inner">
                      {project.render_status === 'pending' || project.render_status === 'processing' ? (
                        <div className="w-full text-left space-y-5">
                          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-3">
                            <Loader2 className="size-5 animate-spin text-indigo-600" />
                            <div>
                              <p className="font-bold text-slate-800 text-sm">Video Sedang Diproses</p>
                              <p className="text-xs text-slate-400">Sistem sedang memproses aset dan merender video secara paralel di cloud.</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Langkah 1: Gambar Visual */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-600">Langkah 1: Membuat Gambar Visual (AI)</span>
                                <span className="text-indigo-600 font-bold">{completedImages} / {totalScenes} Selesai</span>
                              </div>
                              <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                                  style={{ width: `${totalScenes > 0 ? (completedImages / totalScenes) * 100 : 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Langkah 2: Audio Voiceover */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-600">Langkah 2: Membuat Rekaman Suara (TTS)</span>
                                <span className="text-indigo-600 font-bold">{completedVoices} / {totalScenes} Selesai</span>
                              </div>
                              <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                                  style={{ width: `${totalScenes > 0 ? (completedVoices / totalScenes) * 100 : 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Langkah 3: Rendering & Penggabungan */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-2 text-xs font-semibold">
                                <div className={`size-2 rounded-full ${completedImages === totalScenes && completedVoices === totalScenes ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
                                <span className={completedImages === totalScenes && completedVoices === totalScenes ? 'text-indigo-600 font-bold' : 'text-slate-400'}>
                                  Langkah 3: Rendering & Penggabungan Video (Matrix)
                                </span>
                              </div>
                              {completedImages === totalScenes && completedVoices === totalScenes ? (
                                <p className="text-[11px] text-indigo-600 pl-4 animate-pulse font-mono bg-indigo-50 border border-indigo-100/50 p-2.5 rounded-md leading-relaxed">
                                  8 runner sedang merender potongan video secara paralel di cloud...
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 pl-4">
                                  Menunggu seluruh aset gambar dan suara selesai diproduksi.
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between">
                            <a
                              href={`https://github.com/${GITHUB_REPO}/actions`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-all"
                            >
                              <ExternalLink className="size-3.5" />
                              Lihat Runner GitHub
                            </a>
                            <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md font-mono border border-slate-200/60">
                              {project.render_status}
                            </span>
                          </div>
                        </div>
                      ) : project.render_status === 'failed' ? (
                        <div className="text-center space-y-3 py-4">
                          <XCircle className="size-8 text-rose-500 mx-auto" />
                          <div className="space-y-1">
                            <p className="font-semibold text-rose-500">Rendering Gagal</p>
                            <p className="text-xs text-slate-400">Gagal memuat render video. Cek rincian kesalahan di bawah.</p>
                            {project.error && (
                              <div className="mt-3 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-md text-left text-xs font-mono max-w-md max-h-32 overflow-y-auto">
                                {project.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-2 py-6">
                          <AlertCircle className="size-8 text-amber-500 mx-auto" />
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-700">Video Belum Dirender</p>
                            <p className="text-xs text-slate-400">Proyek ini berupa draf storyboard dan belum dirender.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visual Style Info Cards */}
                  {sb && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3 text-xs">
                      <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">Visual & Narration Bible</span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Genre', value: sb.director?.genre },
                          { label: 'Style Visual', value: sb.director?.visual_style },
                          { label: 'Style Suara', value: sb.director?.voice_style },
                          { label: 'Style Kamera', value: sb.director?.camera_style },
                        ].map((item, idx) => (
                          <div key={idx} className="bg-white border border-slate-200/40 p-2 rounded-lg">
                            <span className="text-slate-400 block font-medium text-[10px]">{item.label}</span>
                            <span className="font-bold text-slate-700 mt-0.5 block truncate">{String(item.value ?? 'Standard')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side: Storyboard script scenes list (Media rich) */}
                <div className="lg:col-span-7 space-y-4">
                  <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>Daftar Adegan Storyboard</span>
                    {sb && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full font-bold border border-indigo-100">
                        {totalScenes} Scenes
                      </span>
                    )}
                  </h4>

                  {sb && totalScenes > 0 ? (
                    <div className="space-y-4 max-h-[620px] overflow-y-auto pr-3">
                      {scenes.map(scene => (
                        <SceneCard
                          key={scene.id}
                          scene={scene}
                          renderStatus={project.render_status || 'idle'}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Data naskah storyboard tidak ditemukan.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
