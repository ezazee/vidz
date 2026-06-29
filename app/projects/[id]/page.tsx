'use client'
import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
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
  Youtube,
  Trash2
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
  seo_title?: string | null
  seo_description?: string | null
  seo_tags?: string[] | null
  seo_hashtags?: string[] | null
  thumbnail_url?: string | null
  scheduled_at?: string | null
}

interface Scene {
  id: string
  order_index: number
  narration: string
  duration: number
  image_url?: string
  voice_url?: string
  pexels_video_urls?: string[]
  updated_at?: string
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
    const base = url.startsWith('http') ? url : '/' + url
    const ts = scene.updated_at ? new Date(scene.updated_at).getTime() : Date.now()
    return `${base}?t=${ts}`
  }

  const getVoiceUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return '/' + url
  }

  const isRendering = renderStatus === 'processing' || renderStatus === 'pending'
  const hasPexels = scene.pexels_video_urls && scene.pexels_video_urls.length > 0

  return (
    <div className="bg-white border border-slate-200/60 rounded-xl p-4 space-y-4 hover:border-indigo-100 hover:shadow-sm transition-all duration-200">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-indigo-600 font-bold">Adegan {scene.order_index + 1}</span>
          {scene.image_url && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${hasPexels ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-violet-50 text-violet-600 border border-violet-200'}`}>
              {hasPexels ? `🎬 Video Pexels (${scene.pexels_video_urls!.length})` : '🎨 AI Image'}
            </span>
          )}
        </div>
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
  const router = useRouter()
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
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<string>('')

  type TabState = 'video' | 'storyboard' | 'seo'
  const [activeTab, setActiveTab] = useState<TabState>('video')

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
      const payload: Record<string, any> = {}
      if (scheduleEnabled && scheduledAt) {
        payload.scheduledAt = new Date(scheduledAt).toISOString()
      }
      const res = await fetch(`/api/projects/${id}/publish`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
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

  const handleDeleteProject = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus proyek ini beserta seluruh asetnya (gambar, audio, video di cloud) secara permanen dan membatalkan proses render yang sedang berjalan?')) {
      return
    }

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Gagal menghapus proyek: ${data.error || 'Terjadi kesalahan'}`)
        return
      }

      router.push('/?tab=library')
    } catch (err) {
      console.error('Error deleting project:', err)
      alert('Gagal menghubungi server untuk menghapus proyek')
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
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-0 overflow-hidden max-w-6xl mx-auto flex flex-col">
              {/* Sticky Header Section */}
              <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-10 flex flex-col gap-4">
                
                {/* Top: Navigation & Actions */}
                <div className="flex items-center justify-between">
                  <Link
                    href="/?tab=library"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 transition-all bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    &larr; Kembali ke Library
                  </Link>
                  <div className="flex items-center gap-3">
                    {project.project_status === 'uploaded' && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-bold border border-red-100 flex items-center gap-1">
                        <Youtube className="size-3" /> Published
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2.5 py-1 border border-slate-100 rounded-full">ID: {project.id}</span>
                    
                    <button
                      onClick={handleDeleteProject}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold transition-all shadow-sm"
                      title="Hapus Proyek Secara Permanen"
                    >
                      <Trash2 className="size-3" />
                      Hapus
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-snug">{project.topic}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Dibuat pada {new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 pt-2 -mb-5">
                  <button
                    onClick={() => setActiveTab('video')}
                    className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === 'video' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Video className="size-3.5" /> Video & Cover</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('storyboard')}
                    className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === 'storyboard' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Library className="size-3.5" /> Storyboard & Aset</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('seo')}
                    className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                      activeTab === 'seo' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Activity className="size-3.5" /> SEO & Publish</span>
                  </button>
                </div>
              </div>

              {/* Tab Content Container */}
              <div className="p-6 bg-slate-50/30">
                
                {/* TAB 1: VIDEO & COVER */}
                {activeTab === 'video' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Video Player */}
                    <div className="lg:col-span-7 space-y-5">
                      {project.video_url ? (
                        <div className="space-y-4">
                          <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200/50 bg-black">
                            <video src={project.video_url} controls className="w-full aspect-video" />
                          </div>
                          
                          <div className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                            <a
                              href={project.video_url}
                              download
                              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold hover:bg-slate-800 transition-all"
                            >
                              Download MP4
                            </a>
                            <button
                              onClick={() => setActiveTab('seo')}
                              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2.5 text-xs font-semibold hover:bg-indigo-100 transition-all"
                            >
                              Ke Halaman Publish &rarr;
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl bg-white p-8 shadow-sm">
                          {project.render_status === 'pending' || project.render_status === 'processing' ? (
                            <div className="w-full text-left space-y-6">
                              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <Loader2 className="size-6 animate-spin text-indigo-600" />
                                <div>
                                  <p className="font-bold text-slate-800 text-base">Sedang Memproses Video</p>
                                  <p className="text-xs text-slate-400 mt-0.5">Sistem memproses aset dan merender di cloud.</p>
                                </div>
                              </div>

                              <div className="space-y-5">
                                {/* Langkah 1 */}
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-700">Tahap 1: Visual AI</span>
                                    <span className="text-indigo-600">{completedImages} / {totalScenes}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                                    <div 
                                      className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                                      style={{ width: `${totalScenes > 0 ? (completedImages / totalScenes) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Langkah 2 */}
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-700">Tahap 2: Voiceover TTS</span>
                                    <span className="text-indigo-600">{completedVoices} / {totalScenes}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                                    <div 
                                      className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                                      style={{ width: `${totalScenes > 0 ? (completedVoices / totalScenes) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Langkah 3 */}
                                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                                  <div className="flex items-center gap-2 text-xs font-bold">
                                    <div className={`size-2.5 rounded-full shadow-sm ${completedImages === totalScenes && completedVoices === totalScenes ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
                                    <span className={completedImages === totalScenes && completedVoices === totalScenes ? 'text-indigo-700' : 'text-slate-400'}>
                                      Tahap 3: Cloud Rendering (Matrix)
                                    </span>
                                  </div>
                                  {completedImages === totalScenes && completedVoices === totalScenes ? (
                                    <p className="text-xs text-indigo-600 pl-4.5 font-mono bg-indigo-50 border border-indigo-100/50 p-3 rounded-lg">
                                      8 runner memproses potongan klip di cloud...
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-slate-400 pl-4.5 italic">
                                      Menunggu aset gambar dan suara selesai...
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <a
                                  href={`https://github.com/${GITHUB_REPO}/actions`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold transition-all bg-indigo-50 px-3 py-1.5 rounded-md"
                                >
                                  <ExternalLink className="size-3.5" />
                                  Live Action Logs
                                </a>
                                <span className="text-[10px] text-slate-500 font-mono font-medium">Status: {project.render_status}</span>
                              </div>
                            </div>
                          ) : project.render_status === 'failed' ? (
                            <div className="text-center space-y-3 py-6">
                              <XCircle className="size-10 text-rose-500 mx-auto" />
                              <div className="space-y-1">
                                <p className="font-bold text-rose-600 text-lg">Rendering Gagal</p>
                                <p className="text-xs text-slate-500">Gagal merender video.</p>
                                {project.error && (
                                  <div className="mt-4 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-left text-xs font-mono max-w-md max-h-40 overflow-y-auto shadow-inner mx-auto">
                                    {project.error}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center space-y-2 py-8">
                              <AlertCircle className="size-10 text-amber-500 mx-auto" />
                              <div className="space-y-1">
                                <p className="font-bold text-slate-700 text-lg">Menunggu Rendering</p>
                                <p className="text-xs text-slate-500">Video belum dirender dari storyboard ini.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Thumbnail Generator */}
                    <div className="lg:col-span-5">
                      {project.video_url ? (
                        <div className="-mt-6">
                          <ThumbnailGenerator projectId={id} defaultText={project.topic} initialImageUrl={project.thumbnail_url} />
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center shadow-sm flex flex-col items-center justify-center gap-3 opacity-60">
                          <Youtube className="size-8 text-slate-300" />
                          <div>
                            <p className="font-bold text-slate-700 text-sm">Thumbnail Generator</p>
                            <p className="text-[10px] text-slate-400 mt-1">Akan tersedia setelah video dan gambar adegan selesai diproduksi.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: STORYBOARD & ASET */}
                {activeTab === 'storyboard' && (
                  <div className="space-y-6">
                    {/* Visual Style Info Cards */}
                    {sb && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 mb-4">
                          <Film className="size-4 text-indigo-600" />
                          Visual & Narration Bible
                        </span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Genre', value: sb.director?.genre },
                            { label: 'Style Visual', value: sb.director?.visual_style },
                            { label: 'Style Suara', value: sb.director?.voice_style },
                            { label: 'Style Kamera', value: sb.director?.camera_style },
                          ].map((item, idx) => (
                            <div key={idx} className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg shadow-sm">
                              <span className="text-slate-400 block font-bold text-[10px] uppercase tracking-wide">{item.label}</span>
                              <span className="font-semibold text-slate-700 mt-1 block truncate text-sm">{String(item.value ?? 'Standard')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                      <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center justify-between">
                        <span>Daftar Skrip & Adegan</span>
                        {sb && (
                          <span className="text-[11px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold border border-indigo-100 shadow-sm">
                            {totalScenes} Scenes
                          </span>
                        )}
                      </h4>

                      {sb && totalScenes > 0 ? (
                        <div className="space-y-5 max-h-[800px] overflow-y-auto pr-2 pb-4">
                          {scenes.map(scene => (
                            <SceneCard
                              key={scene.id}
                              scene={scene}
                              renderStatus={project.render_status || 'idle'}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic text-center py-10">Data naskah storyboard tidak ditemukan.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: SEO & PUBLISH */}
                {activeTab === 'seo' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left: YouTube Publish Box */}
                    <div className="md:col-span-4 space-y-4">
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                          <Youtube className="size-5 text-red-600" />
                          <h4 className="font-extrabold text-slate-800 text-sm">YouTube Publisher</h4>
                        </div>

                        {youtubeConnected ? (
                          project.project_status === 'uploaded' || project.youtube_url ? (
                            <div className="space-y-3">
                              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm">
                                <CheckCircle2 className="size-4" />
                                Video telah dipublikasikan!
                              </div>
                              <a
                                href={project.youtube_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 text-white px-4 py-3 text-xs font-bold transition-all shadow-md hover:bg-red-700"
                              >
                                <ExternalLink className="size-4" />
                                Buka di YouTube
                              </a>
                            </div>
                          ) : project.render_status === 'completed' && project.video_url ? (
                            <div className="space-y-4">
                              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                Video telah dirender dan siap dipublikasikan ke Channel YouTube Anda menggunakan deskripsi SEO yang teroptimasi.
                              </p>
                              
                              {/* Opsi Penjadwalan */}
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={scheduleEnabled}
                                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="text-xs font-semibold text-slate-700">Jadwalkan Publikasi</span>
                                </label>
                                
                                {scheduleEnabled && (
                                  <div className="pt-1">
                                    <input 
                                      type="datetime-local" 
                                      value={scheduledAt}
                                      onChange={(e) => setScheduledAt(e.target.value)}
                                      min={new Date().toISOString().slice(0, 16)}
                                      className="w-full text-xs rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1.5">Pilih waktu kapan video akan dipublish (Minimal 15 menit dari sekarang).</p>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={publishToYoutube}
                                disabled={publishing || (scheduleEnabled && !scheduledAt)}
                                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-3 text-xs font-bold transition-all shadow-md disabled:opacity-50"
                              >
                                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Youtube className="size-4" />}
                                {publishing ? 'Mengunggah...' : scheduleEnabled ? 'Jadwalkan ke YouTube' : 'Publish ke YouTube Sekarang'}
                              </button>
                              
                              {project.scheduled_at && (
                                <div className="mt-3 text-center bg-indigo-50 border border-indigo-100 rounded-lg p-2">
                                  <p className="text-[10px] font-semibold text-indigo-700">
                                    Status: Terjadwal pada {new Date(project.scheduled_at).toLocaleString('id-ID')}
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-center shadow-inner">
                              <AlertCircle className="size-6 text-slate-400 mx-auto mb-2" />
                              <p className="text-[10px] text-slate-500 font-medium">Video belum dirender, selesaikan render video terlebih dahulu sebelum publish.</p>
                            </div>
                          )
                        ) : (
                          <div className="bg-red-50/50 border border-red-100 p-4 rounded-lg text-center space-y-3 shadow-inner">
                            <AlertCircle className="size-6 text-red-400 mx-auto" />
                            <p className="text-[10px] text-red-800 font-medium leading-relaxed">
                              Hubungkan akun YouTube Anda di halaman "Integrations" untuk memublikasikan video dengan satu klik.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: SEO Metadata */}
                    <div className="md:col-span-8">
                      {project && (
                        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                            <Activity className="size-5 text-indigo-600" />
                            <h4 className="font-extrabold text-slate-800 text-sm">Metadata SEO Teroptimasi AI</h4>
                          </div>

                          {project.seo_title ? (
                            <div className="space-y-5">
                              {/* Title */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Judul YouTube</span>
                                <div className="flex gap-2">
                                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-4 py-3 text-sm font-bold text-slate-800 flex-1 shadow-sm">
                                    {project.seo_title}
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(project.seo_title || '')
                                      alert('Judul tersalin!')
                                    }}
                                    className="px-4 py-2 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 rounded-lg border border-indigo-100 transition-all shrink-0 self-start shadow-sm"
                                  >
                                    Salin
                                  </button>
                                </div>
                              </div>

                              {/* Description */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Deskripsi Kaya Informasi</span>
                                <div className="flex gap-2">
                                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 text-xs text-slate-600 flex-1 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans shadow-inner">
                                    {project.seo_description}
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(project.seo_description || '')
                                      alert('Deskripsi tersalin!')
                                    }}
                                    className="px-4 py-2 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 rounded-lg border border-indigo-100 transition-all shrink-0 self-start shadow-sm"
                                  >
                                    Salin
                                  </button>
                                </div>
                              </div>

                              {/* Tags */}
                              {((project.seo_hashtags && project.seo_hashtags.length > 0) || (project.seo_tags && project.seo_tags.length > 0)) && (
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                  {project.seo_hashtags && project.seo_hashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {project.seo_hashtags.map((tag, idx) => (
                                        <span key={idx} className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 shadow-sm">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {project.seo_tags && project.seo_tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                      {project.seo_tags.map((tag, idx) => (
                                        <span key={idx} className="text-[10px] font-medium text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center p-8 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                              <p className="text-sm text-slate-500 font-medium">Metadata belum tersedia</p>
                              <p className="text-[10px] text-slate-400 mt-1">SEO akan otomatis digenerate setelah tahap outline selesai.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}


interface ThumbnailGeneratorProps {
  projectId: string
  defaultText: string
  initialImageUrl?: string | null
}

function ThumbnailGenerator({ projectId, defaultText, initialImageUrl }: ThumbnailGeneratorProps) {
  const parsed = (defaultText || '').split('||')
  const [text, setText] = useState(parsed.length === 1 ? parsed[0] : (defaultText || ''))
  const [textLeft, setTextLeft] = useState(parsed.length === 3 ? parsed[0] : '')
  const [textRight, setTextRight] = useState(parsed.length === 3 ? parsed[1] : '')
  const [textBottom, setTextBottom] = useState(parsed.length === 3 ? parsed[2] : '')
  const [style, setStyle] = useState<'vox' | 'viral'>('viral')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(initialImageUrl || null)
  const [thumbnailPrompt, setThumbnailPrompt] = useState(parsed[0] || defaultText || '')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set high-res YouTube Thumbnail dimensions (16:9)
    canvas.width = 1280
    canvas.height = 720

    // Clear canvas
    ctx.clearRect(0, 0, 1280, 720)

    const drawThumbnailElements = (img?: HTMLImageElement) => {
      // 1. Draw Background
      if (img) {
        // Cover aspect ratio logic
        const imgRatio = img.width / img.height
        const canvasRatio = 1280 / 720
        let drawWidth = 1280
        let drawHeight = 720
        let offsetX = 0
        let offsetY = 0

        if (imgRatio > canvasRatio) {
          drawWidth = 720 * imgRatio
          offsetX = (1280 - drawWidth) / 2
        } else {
          drawHeight = 1280 / imgRatio
          offsetY = (720 - drawHeight) / 2
        }
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
      } else {
        // Fallback beautiful dark cinematic gradient
        const grad = ctx.createLinearGradient(0, 0, 1280, 720)
        grad.addColorStop(0, '#0f172a')
        grad.addColorStop(1, '#020617')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, 1280, 720)
      }

      // 2. Cinematic Vignette
      const vignette = ctx.createRadialGradient(640, 360, 200, 640, 360, 800)
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0.1)')
      vignette.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)')
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.8)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, 1280, 720)

      // 4. Draw Typography Text
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'

      const xMargin = 90
      const maxWidth = 720 
      const yCenter = 360

      const cleanText = text.trim() || 'Judul Thumbnail'
      const words = cleanText.split(' ')

      if (style === 'vox') {
        ctx.font = "italic 700 64px 'Georgia', 'Garamond', serif"
        ctx.fillStyle = '#fdfdfa'
        
        const lines: string[] = []
        let currentLine = ''
        
        for (let n = 0; n < words.length; n++) {
          const testLine = currentLine + words[n] + ' '
          const metrics = ctx.measureText(testLine)
          if (metrics.width > maxWidth && n > 0) {
            lines.push(currentLine.trim())
            currentLine = words[n] + ' '
          } else {
            currentLine = testLine
          }
        }
        lines.push(currentLine.trim())

        const lineHeight = 86
        const totalHeight = lines.length * lineHeight
        let startY = yCenter - (totalHeight / 2) + (lineHeight / 2)

        lines.forEach(line => {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
          ctx.shadowBlur = 18
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 5

          ctx.fillText(line, xMargin, startY)
          startY += lineHeight
        })

        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

      } else {
        // Style: Viral Split
        ctx.font = "italic 900 72px 'Montserrat', 'Arial Black', sans-serif"
        
        const drawViralText = (txt: string, x: number, y: number, color1: string, color2: string, align: 'left'|'right') => {
          ctx.textAlign = align
          ctx.textBaseline = 'top'
          
          const maxWidthSplit = 550
          const words = txt.toUpperCase().split(' ')
          const lines: string[][] = []
          let currentLine: string[] = []
          
          for (let n = 0; n < words.length; n++) {
            const testLine = [...currentLine, words[n]].join(' ')
            if (ctx.measureText(testLine).width > maxWidthSplit && n > 0) {
              lines.push(currentLine)
              currentLine = [words[n]]
            } else {
              currentLine.push(words[n])
            }
          }
          lines.push(currentLine)

          let startY = y
          const lineHeight = 80

          lines.forEach(line => {
            const lineText = line.join(' ')
            let drawX = x
            
            ctx.strokeStyle = '#000000'
            ctx.lineWidth = 18
            ctx.lineJoin = 'round'
            
            ctx.shadowColor = 'rgba(0, 0, 0, 1)'
            ctx.shadowBlur = 10
            ctx.shadowOffsetX = 5
            ctx.shadowOffsetY = 5

            ctx.strokeText(lineText, drawX, startY)
            
            ctx.shadowColor = 'transparent'
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 0
            ctx.fillStyle = (lines.indexOf(line) % 2 === 0) ? color1 : color2
            ctx.fillText(lineText, drawX, startY)
            
            startY += lineHeight
          })
        }

        drawViralText(textLeft, 40, 40, '#ffffff', '#ff6b00', 'left')
        drawViralText(textRight, 1240, 40, '#ffffff', '#ffd500', 'right')

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const bottomText = textBottom.toUpperCase()
        
        ctx.font = "italic 900 58px 'Montserrat', 'Arial Black', sans-serif"
        const bTextMetrics = ctx.measureText(bottomText)
        const bWidth = bTextMetrics.width + 80
        const bHeight = 85
        
        const bX = 640
        const bY = 640
        
        ctx.fillStyle = '#ffea00'
        ctx.shadowColor = 'rgba(0,0,0,0.8)'
        ctx.shadowBlur = 15
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 10
        
        ctx.beginPath()
        ctx.moveTo(bX - bWidth/2 - 20, bY - bHeight/2)
        ctx.lineTo(bX + bWidth/2, bY - bHeight/2)
        ctx.lineTo(bX + bWidth/2 + 20, bY + bHeight/2)
        ctx.lineTo(bX - bWidth/2, bY + bHeight/2)
        ctx.closePath()
        ctx.fill()
        
        ctx.shadowColor = 'transparent'
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
        ctx.fillStyle = '#000000'
        ctx.fillText(bottomText, bX, bY)
      }
    }

    const bgUrl = customImageUrl || ''
    
    if (bgUrl) {
      const fullUrl = bgUrl.startsWith('http') ? bgUrl : '/' + bgUrl
      let srcUrl = fullUrl
      
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = srcUrl
      img.onload = () => {
        drawThumbnailElements(img)
      }
      img.onerror = () => {
        drawThumbnailElements()
      }
    } else {
      drawThumbnailElements()
    }
  }, [text, textLeft, textRight, textBottom, style, customImageUrl])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `thumbnail-${(style === 'viral' ? textLeft : text).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    link.href = dataUrl
    link.click()
  }

  const handleGenerateAIBackground = async () => {
    setGenerating(true)
    setSaveMessage(null)
    
    // Clear hardcoded text while generating to indicate progress
    setTextLeft('MERENDER...')
    setTextRight('HARAP TUNGGU')
    setTextBottom('AI SEDANG BERPIKIR')
    
    try {
      const res = await fetch(`/api/projects/${projectId}/thumbnail/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: thumbnailPrompt })
      })

      const data = await res.json()
      if (res.ok && data.imageUrl) {
        setCustomImageUrl(data.imageUrl)
        setTextLeft(data.textLeft || 'WAJIB TONTON')
        setTextRight(data.textRight || 'FAKTA MENCENGANGKAN')
        setTextBottom(data.textBottom || 'TONTON SEKARANG!')
        setSaveMessage({ type: 'success', text: 'Background dan Teks Clickbait berhasil digenerate oleh AI!' })
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Gagal generate gambar AI.' })
      }
    } catch (e) {
      setSaveMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat generate gambar.' })
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveToCloud = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setSaving(true)
    setSaveMessage(null)

    try {
      const dataUrl = canvas.toDataURL('image/png')
      const response = await fetch(`/api/projects/${projectId}/thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: dataUrl,
          overlay_text: style === 'viral' ? `${textLeft}||${textRight}||${textBottom}` : text,
          style: style
        })
      })

      const data = await response.json()
      if (response.ok && data.success) {
        setSaveMessage({ type: 'success', text: 'Thumbnail beserta teks berhasil disimpan dan diterapkan sebagai cover proyek!' })
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Gagal menyimpan thumbnail ke cloud.' })
      }
    } catch (e) {
      setSaveMessage({ type: 'error', text: 'Terjadi kesalahan jaringan saat menyimpan thumbnail.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-6 shadow-2xl text-slate-200 relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6 relative z-10">
        <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <WandSparkles className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-widest">AI Thumbnail Generator</h4>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Hasilkan cover YouTube dengan AI dan tambahkan Clickbait Teks</p>
        </div>
      </div>

      {saveMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 relative mb-6 backdrop-blur-md ${
          saveMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          <div className="flex-1">
            <span className="font-bold">{saveMessage.type === 'success' ? 'SUKSES:' : 'ERROR:'}</span> {saveMessage.text}
          </div>
          <button onClick={() => setSaveMessage(null)} className="text-slate-500 hover:text-white transition-colors">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Full Image Preview Container (Canvas) */}
      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-700 shadow-[0_0_40px_rgba(0,0,0,0.5)] relative flex items-center justify-center mb-6 group">
        <canvas ref={canvasRef} className={`w-full h-full object-contain ${!customImageUrl && !generating ? 'hidden' : ''}`} />
        {!customImageUrl && !generating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-3 z-10">
            <Youtube className="size-10 opacity-20" />
            <span className="text-xs font-semibold uppercase tracking-widest">Preview Kosong</span>
          </div>
        )}
        <div className="absolute inset-0 border-2 border-white/5 rounded-xl pointer-events-none z-20" />
      </div>

      <div className="space-y-5 text-xs relative z-10">
        
        {/* AI Generator Input */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Topik / Judul Video (AI Prompt)</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={thumbnailPrompt}
              onChange={e => setThumbnailPrompt(e.target.value)}
              placeholder="e.g. Ilmuwan Syok Ternyata Black Hole..."
              className="flex-1 bg-slate-800 border border-slate-700 px-4 py-3 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 font-medium text-white placeholder:text-slate-600 transition-all text-sm shadow-inner"
            />
            <button
              onClick={handleGenerateAIBackground}
              disabled={generating || !thumbnailPrompt.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:shadow-none"
            >
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Merender AI...</span>
                </>
              ) : (
                <>
                  <WandSparkles className="size-4" />
                  <span>Generate AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <button
            onClick={handleSaveToCloud}
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] disabled:shadow-none flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                MENYIMPAN...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                TERAPKAN COVER
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all border border-slate-700 flex items-center justify-center gap-2"
          >
            <ExternalLink className="size-4" />
            UNDUH PNG
          </button>
        </div>
      </div>
    </div>
  )
}
