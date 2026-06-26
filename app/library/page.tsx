'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import {
  Menu,
  Search,
  Video,
  ChevronRight,
  Youtube,
  Trash2,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  XCircle
} from 'lucide-react'

interface Project {
  id: string
  topic: string
  project_status: 'draft' | 'rendered' | 'uploaded'
  created_at: string
  render_status?: 'idle' | 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string | null
  error?: string | null
  thumbnail_url?: string | null
}

export default function LibraryPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Data States
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'rendering' | 'failed' | 'draft'>('all')

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (e) {
      console.error('Gagal memuat daftar proyek', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab')
        if (tab === 'library') {
          // Keep normal behavior
        }
      }
    }
    fetchProjects()
    checkTab()
  }, [])

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus proyek ini beserta seluruh asetnya (gambar, audio, video) secara permanen?')) {
      return
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(`Gagal menghapus proyek: ${data.error || 'Terjadi kesalahan'}`)
        return
      }

      // Update local state
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (err) {
      console.error('Error deleting project:', err)
      alert('Gagal menghubungi server untuk menghapus proyek')
    }
  }

  const inspectProject = (project: Project) => {
    router.push(`/projects/${project.id}`)
  }

  // Filter logic
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.topic.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (statusFilter === 'all') return true
    if (statusFilter === 'ready') return project.render_status === 'completed'
    if (statusFilter === 'rendering') return project.render_status === 'pending' || project.render_status === 'processing'
    if (statusFilter === 'failed') return project.render_status === 'failed'
    if (statusFilter === 'draft') return !project.render_status
    return true
  })

  // Count helper
  const getCountByStatus = (status: 'all' | 'ready' | 'rendering' | 'failed' | 'draft') => {
    if (status === 'all') return projects.length
    if (status === 'ready') return projects.filter(p => p.render_status === 'completed').length
    if (status === 'rendering') return projects.filter(p => p.render_status === 'pending' || p.render_status === 'processing').length
    if (status === 'failed') return projects.filter(p => p.render_status === 'failed').length
    if (status === 'draft') return projects.filter(p => !p.render_status).length
    return 0
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Desktop & Mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
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
            <h2 className="text-base font-semibold text-slate-800">Historical Video Library</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProjects}
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
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Search and status filters bar */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari topik video..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 mr-1.5 flex items-center gap-1">
                  <SlidersHorizontal className="size-3.5" />
                  Filter:
                </span>
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'ready', label: 'Ready' },
                  { key: 'rendering', label: 'Rendering' },
                  { key: 'failed', label: 'Failed' },
                  { key: 'draft', label: 'Draft' },
                ].map(item => {
                  const active = statusFilter === item.key
                  const count = getCountByStatus(item.key as any)
                  return (
                    <button
                      key={item.key}
                      onClick={() => setStatusFilter(item.key as any)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        active
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.label} <span className={`ml-1 px-1 rounded-md text-[10px] ${active ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* projects table/grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
                <Loader2 className="size-8 animate-spin text-indigo-600" />
                <span className="text-sm font-semibold">Memuat riwayat proyek...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl bg-white p-20 text-center flex flex-col items-center justify-center gap-3">
                <Video className="size-10 text-slate-300" />
                <div>
                  <p className="font-bold text-slate-700">Tidak Ada Proyek Ditemukan</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Coba gunakan kata kunci pencarian atau filter status yang lain.' 
                      : 'Mulai buat video baru pada menu AI Video Studio.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredProjects.map(project => (
                  <div
                    key={project.id}
                    onClick={() => inspectProject(project)}
                    className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 p-4 cursor-pointer transition-all duration-200 group flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3.5">
                      {/* Beautiful 16:9 Thumbnail Cover */}
                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200/80 bg-slate-950 relative shadow-sm shrink-0">
                        {project.thumbnail_url ? (
                          <img
                            src={project.thumbnail_url.startsWith('http') ? project.thumbnail_url : '/' + project.thumbnail_url}
                            alt={project.topic}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                        ) : project.render_status === 'pending' || project.render_status === 'processing' ? (
                          // Rendering dynamic placeholder
                          <div className="w-full h-full bg-gradient-to-br from-indigo-950 to-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2.5 animate-pulse">
                            <Loader2 className="size-6 animate-spin text-indigo-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rendering Video & Cover...</span>
                          </div>
                        ) : project.render_status === 'failed' ? (
                          // Failed placeholder
                          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-500 gap-1">
                            <XCircle className="size-6 text-rose-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Render Gagal</span>
                          </div>
                        ) : (
                          // Draft placeholder
                          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-1">
                            <Video className="size-6 text-slate-300" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Draf Storyboard</span>
                          </div>
                        )}

                        {/* Floating Status Badges Overlaid on top-left of the cover */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none z-10">
                          {project.render_status === 'completed' && (
                            <span className="text-[9px] bg-emerald-500 text-white px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide shadow-md">Ready</span>
                          )}
                          {project.project_status === 'uploaded' && (
                            <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide shadow-md flex items-center gap-1">
                              <Youtube className="size-3 fill-white" /> Published
                            </span>
                          )}
                          {(project.render_status === 'pending' || project.render_status === 'processing') && (
                            <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide shadow-md animate-pulse">Rendering</span>
                          )}
                          {project.render_status === 'failed' && (
                            <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide shadow-md">Failed</span>
                          )}
                          {!project.render_status && (
                            <span className="text-[9px] bg-slate-600 text-white px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide shadow-md">Draft</span>
                          )}
                        </div>

                        {/* Floating Delete Button on top-right of the cover */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProject(project.id)
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-slate-950/70 hover:bg-rose-600 hover:text-white text-slate-300 rounded-lg transition-all z-20 shadow-md backdrop-blur-sm"
                          title="Hapus Proyek"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      {/* Info & Title */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">
                          {new Date(project.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <h3 className="font-extrabold text-slate-800 text-sm leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {project.topic}
                        </h3>
                      </div>
                    </div>

                    {/* Footer link details */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 font-mono text-[9px] font-bold">ID: {project.id.slice(0, 8)}...</span>
                      <span className="text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-extrabold uppercase tracking-wide text-[10px]">
                        Buka Halaman Detail <ChevronRight className="size-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
