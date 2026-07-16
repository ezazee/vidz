'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { Menu, Loader2, RefreshCw, Youtube, Facebook, Users, Eye, ThumbsUp, MessageCircle, Video } from 'lucide-react'

interface ChannelAnalytics {
  channel: string
  channelName: string
  platform: 'youtube' | 'facebook'
  totalProjects: number
  totalCompleted: number
  youtubeConnected: boolean
  youtubeChannelName: string | null
  youtubeStats: PlatformStats | null
  facebookConnected: boolean
  facebookPageName: string | null
  facebookStats: PlatformStats | null
}

interface PlatformStats {
  subscribers: number
  views: number
  videoCount: number
  likes: number
  comments: number
}

const CHANNEL_IDS = ['cabang-sejarah', 'brainwhy', 'cerita-tetangga'] as const

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export default function AnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState<Record<string, ChannelAnalytics>>({})
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const results = await Promise.all(
        CHANNEL_IDS.map(async (c) => {
          const res = await fetch('/api/analytics', { headers: { 'x-channel-id': c } })
          const json = await res.json()
          return [c, json.analytics] as const
        })
      )
      setData(Object.fromEntries(results))
    } catch (e) {
      console.error('Gagal memuat analytics', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-all">
              <Menu className="size-5" />
            </button>
            <h2 className="text-base font-semibold text-slate-800">Analytics — Semua Channel</h2>
          </div>
          <button onClick={fetchAll} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all duration-200" title="Refresh data">
            <RefreshCw className="size-4" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
              <Loader2 className="size-8 animate-spin text-indigo-600" />
              <span className="text-sm font-semibold">Memuat analytics semua channel...</span>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              {CHANNEL_IDS.map((c) => {
                const a = data[c]
                if (!a) return null
                const isFb = a.platform === 'facebook'
                const stats = isFb ? a.facebookStats : a.youtubeStats
                const connected = isFb ? a.facebookConnected : a.youtubeConnected
                const accountName = isFb ? a.facebookPageName : a.youtubeChannelName
                return (
                  <div key={c} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-sm">{a.channelName}</h3>
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{accountName || '(belum terhubung)'}</p>
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2.5 py-1 rounded-md flex items-center gap-1 text-white ${isFb ? 'bg-blue-600' : 'bg-red-600'}`}>
                        {isFb ? <Facebook className="size-3 fill-white" /> : <Youtube className="size-3 fill-white" />}
                        {isFb ? 'Facebook' : 'YouTube'}
                      </span>
                    </div>

                    {!connected ? (
                      <div className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
                        Belum terhubung ke {isFb ? 'Facebook' : 'YouTube'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <StatTile icon={<Users className="size-3.5" />} label="Followers" value={formatNumber(stats?.subscribers ?? 0)} />
                        <StatTile icon={<Eye className="size-3.5" />} label="Views" value={formatNumber(stats?.views ?? 0)} />
                        <StatTile icon={<ThumbsUp className="size-3.5" />} label="Likes" value={formatNumber(stats?.likes ?? 0)} />
                        <StatTile icon={<MessageCircle className="size-3.5" />} label="Comments" value={formatNumber(stats?.comments ?? 0)} />
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                        <Video className="size-3.5" /> {a.totalProjects} total project
                      </span>
                      <span className="text-emerald-600 font-bold">{a.totalCompleted} selesai render</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-lg font-black text-slate-900">{value}</span>
    </div>
  )
}
