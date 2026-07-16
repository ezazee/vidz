'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import {
  Menu,
  Video,
  TrendingUp,
  RefreshCw,
  Loader2,
  Youtube,
  Facebook,
  Heart,
  Eye,
  Globe,
  Users,
  ExternalLink,
  ChevronRight
} from 'lucide-react'

interface PlatformStats {
  subscribers: number
  views: number
  watchTimeSeconds: number
  likes: number
  comments: number
  videoCount: number
  engagementRate?: number
}

type ChannelId = 'cabang-sejarah' | 'brainwhy' | 'cerita-tetangga'
type TabId = 'all' | ChannelId

const CHANNEL_TABS: { id: ChannelId; label: string; platform: 'youtube' | 'facebook' }[] = [
  { id: 'cabang-sejarah', label: 'Cabang Sejarah', platform: 'youtube' },
  { id: 'brainwhy', label: 'BrainWhy', platform: 'youtube' },
  { id: 'cerita-tetangga', label: 'Cerita Tetangga', platform: 'facebook' },
]

interface AnalyticsData {
  channel?: string
  channelName?: string
  platform?: 'youtube' | 'facebook'
  totalProjects: number
  totalCompleted: number
  totalRenderTime: number
  timeSavedSeconds: number
  platformCost: number
  statusBreakdown: Record<string, number>
  youtubeConnected: boolean
  youtubeChannelName: string
  youtubeChannelThumbnail: string
  youtubeStats: PlatformStats | null
  facebookConnected?: boolean
  facebookPageName?: string | null
  facebookStats?: PlatformStats | null
  recentPosts: Array<{
    id: string
    title: string
    tags: string[]
    date: string
    likes: number
    views: number
    reach: number
    url: string
  }>
}

export default function AnalyticsLandingPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [channelData, setChannelData] = useState<Partial<Record<ChannelId, AnalyticsData>>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [activeTimeframe, setActiveTimeframe] = useState<'7h' | '30h' | '90h'>('30h')

  // Hover states for line chart tooltips
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const results = await Promise.all(
        CHANNEL_TABS.map(async (c) => {
          const res = await fetch('/api/analytics', { headers: { 'x-channel-id': c.id } })
          const data = res.ok ? await res.json() : null
          return [c.id, data?.analytics as AnalyticsData | undefined] as const
        })
      )
      const merged: Partial<Record<ChannelId, AnalyticsData>> = {}
      for (const [id, a] of results) if (a) merged[id] = a
      setChannelData(merged)
    } catch (e) {
      console.error('Gagal memuat data analitik', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  // Tab "Semua" = gabungan angka dari 3 channel (dijumlah), platform "mixed" (2 YouTube + 1 Facebook).
  // Tab per-channel = data channel itu apa adanya (sudah platform-aware dari /api/analytics).
  const analytics: (AnalyticsData & { platformStats: PlatformStats | null; platformLabel: string; isFacebook: boolean }) | null = (() => {
    if (activeTab !== 'all') {
      const a = channelData[activeTab]
      if (!a) return null
      const isFacebook = a.platform === 'facebook'
      return { ...a, platformStats: isFacebook ? (a.facebookStats ?? null) : a.youtubeStats, platformLabel: isFacebook ? (a.facebookPageName || 'Facebook Page') : (a.youtubeChannelName || 'YouTube Channel'), isFacebook }
    }
    const all = Object.values(channelData).filter(Boolean) as AnalyticsData[]
    if (all.length === 0) return null
    const sum = (pick: (s: PlatformStats) => number) =>
      all.reduce((acc, a) => acc + pick((a.platform === 'facebook' ? a.facebookStats : a.youtubeStats) ?? { subscribers: 0, views: 0, watchTimeSeconds: 0, likes: 0, comments: 0, videoCount: 0 }), 0)
    const merged: PlatformStats = {
      subscribers: sum((s) => s.subscribers),
      views: sum((s) => s.views),
      watchTimeSeconds: sum((s) => s.watchTimeSeconds),
      likes: sum((s) => s.likes),
      comments: sum((s) => s.comments),
      videoCount: sum((s) => s.videoCount),
      engagementRate: 0,
    }
    return {
      totalProjects: all.reduce((acc, a) => acc + a.totalProjects, 0),
      totalCompleted: all.reduce((acc, a) => acc + a.totalCompleted, 0),
      totalRenderTime: all.reduce((acc, a) => acc + a.totalRenderTime, 0),
      timeSavedSeconds: all.reduce((acc, a) => acc + a.timeSavedSeconds, 0),
      platformCost: all.reduce((acc, a) => acc + a.platformCost, 0),
      statusBreakdown: {},
      youtubeConnected: all.some((a) => a.youtubeConnected),
      youtubeChannelName: '',
      youtubeChannelThumbnail: '',
      youtubeStats: null,
      recentPosts: all.flatMap((a) => a.recentPosts).sort((x, y) => (y.id > x.id ? 1 : -1)),
      platformStats: merged,
      platformLabel: `${all.length} Channel (2 YouTube + 1 Facebook)`,
      isFacebook: false,
    }
  })()

  // Format large numbers with K, M suffixes
  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    }
    return num.toString()
  }

  // Sample trend data matching the peaks in the screenshot
  const trendData = [
    { date: '27 Mei', youtube: 100 },
    { date: '30 Mei', youtube: 150 },
    { date: '2 Jun', youtube: 120 },
    { date: '5 Jun', youtube: 300 },
    { date: '8 Jun', youtube: 400 },
    { date: '11 Jun', youtube: 500 },
    { date: '14 Jun', youtube: 450 },
    { date: '17 Jun', youtube: 600 },
    { date: '20 Jun', youtube: 18000 }, // High peak
    { date: '23 Jun', youtube: 5500 },
    { date: '26 Jun', youtube: 5200 }
  ]

  // Top content sorted by views for the horizontal bar chart
  const topContent = analytics?.recentPosts
    ? [...analytics.recentPosts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 8)
    : []

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Desktop & Mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
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
              <h2 className="text-xs font-bold text-slate-800 tracking-wider uppercase">Analytics Dashboard</h2>
              <p className="text-[10px] text-slate-400">Performa konten YouTube via Zernio</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all duration-200"
              title="Refresh data"
            >
              <RefreshCw className="size-4" />
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ZERNIO SYNCED
            </span>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
              <Loader2 className="size-8 animate-spin text-red-500" />
              <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">Menganalisis performa saluran YouTube...</span>
            </div>
          ) : analytics ? (
            <div className="max-w-[1600px] mx-auto space-y-6">
              
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-950 tracking-tight">Analytics</h1>
                  <p className="text-xs text-slate-500">Performa konten via Zernio</p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  {/* Active Platform Banner — dinamis sesuai tab aktif */}
                  <div className={`flex items-center px-3.5 py-1.5 rounded-lg gap-2 border ${analytics.isFacebook ? 'bg-blue-50 border-blue-200 text-blue-700' : activeTab === 'all' ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {analytics.isFacebook ? <Facebook className="size-4 text-blue-600" /> : <Youtube className="size-4 text-red-600" />}
                    <span className="text-xs font-bold">{analytics.platformLabel}</span>
                  </div>

                  {/* Timeframe Selector */}
                  <div className="flex bg-white p-1 rounded-lg border border-slate-200 gap-1 shadow-sm">
                    {(['7H', '30H', '90H'] as const).map((t) => {
                      const lower = t.toLowerCase() as '7h' | '30h' | '90h'
                      return (
                        <button
                          key={t}
                          onClick={() => setActiveTimeframe(lower)}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                            activeTimeframe === lower
                              ? 'bg-red-500 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Channel/Platform Tabs — Semua + tiap channel (YT-A / YT-B / FP) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all ${
                    activeTab === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Semua
                </button>
                {CHANNEL_TABS.map((c) => {
                  const active = activeTab === c.id
                  const isFb = c.platform === 'facebook'
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveTab(c.id)}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                        active
                          ? isFb ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-red-600 border-red-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isFb ? <Facebook className="size-3.5" /> : <Youtube className="size-3.5" />}
                      {c.label}
                    </button>
                  )
                })}
              </div>

              {activeTab === 'all' ? (
                /* Tab "Semua" = 3 kartu channel BERDAMPINGAN, bukan digabung jadi 1 angka —
                   biar jelas mana Cabang Sejarah, mana BrainWhy, mana Cerita Tetangga. */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {CHANNEL_TABS.map((c) => {
                    const a = channelData[c.id]
                    const isFb = c.platform === 'facebook'
                    const stats = a ? (isFb ? a.facebookStats : a.youtubeStats) : null
                    const connected = a ? (isFb ? a.facebookConnected : a.youtubeConnected) : false
                    const accountName = a ? (isFb ? a.facebookPageName : a.youtubeChannelName) : null
                    return (
                      <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md ${isFb ? 'bg-blue-600' : 'bg-red-500'}`}>
                              {isFb ? <Facebook className="size-5" /> : <Youtube className="size-5" />}
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">{c.label}</h3>
                              <p className="text-[10px] text-slate-400 font-semibold">{accountName || '(belum terhubung)'}</p>
                            </div>
                          </div>
                          <button onClick={() => setActiveTab(c.id)} className="text-[10px] text-slate-400 hover:text-slate-700 font-bold uppercase tracking-wider flex items-center gap-0.5">
                            Detail <ChevronRight className="size-3" />
                          </button>
                        </div>

                        {!a ? (
                          <div className="text-xs text-slate-400 py-8 text-center">Memuat...</div>
                        ) : !connected ? (
                          <div className="text-xs text-slate-400 py-8 text-center border border-dashed border-slate-200 rounded-lg">
                            Belum terhubung ke {isFb ? 'Facebook' : 'YouTube'}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Followers</span>
                              <span className="text-lg font-black text-slate-900">{formatNumber(stats?.subscribers ?? 0)}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Views</span>
                              <span className="text-lg font-black text-slate-900">{formatNumber(stats?.views ?? 0)}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Likes</span>
                              <span className="text-lg font-black text-slate-900">{formatNumber(stats?.likes ?? 0)}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Comments</span>
                              <span className="text-lg font-black text-slate-900">{formatNumber(stats?.comments ?? 0)}</span>
                            </div>
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                            <Video className="size-3.5" /> {a?.totalProjects ?? 0} project
                          </span>
                          <span className="text-emerald-600 font-bold">{a?.totalCompleted ?? 0} selesai render</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
              <>
              {/* 1. TOP METRICS ROW (6 Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Metric 1: Total Posts */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[108px] shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Posts</span>
                    <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                      <Video className="size-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {analytics.platformStats?.videoCount ?? 51}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">Total Posts</span>
                  </div>
                </div>

                {/* Metric 2: Total Likes */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[108px] shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Likes</span>
                    <div className="p-1.5 bg-rose-50 text-[#f43f5e] rounded-lg">
                      <Heart className="size-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {formatNumber(analytics.platformStats?.likes ?? 814)}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">Total Likes</span>
                  </div>
                </div>

                {/* Metric 3: Total Views */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[108px] shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Views</span>
                    <div className="p-1.5 bg-cyan-50 text-cyan-600 rounded-lg">
                      <Eye className="size-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {formatNumber(analytics.platformStats?.views ?? 54600)}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">Total Views</span>
                  </div>
                </div>

                {/* Metric 4: Total Reach */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[108px] shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Reach</span>
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                      <Globe className="size-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 leading-none">0</span>
                    <span className="text-[9px] text-slate-400 block mt-1">Total Reach</span>
                  </div>
                </div>

                {/* Metric 5: Engagement Rate */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[108px] shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Engagement Rate</span>
                    <div className="p-1.5 bg-emerald-50 text-[#10b981] rounded-lg">
                      <TrendingUp className="size-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {(analytics.platformStats?.engagementRate ?? 150.51).toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">Engagement Rate</span>
                  </div>
                </div>

                {/* Metric 6: Followers */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[108px] shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Followers</span>
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <Users className="size-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 leading-none">
                      {formatNumber(analytics.platformStats?.subscribers ?? 1150)}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">Followers</span>
                  </div>
                </div>
              </div>

              {/* 2. YOUTUBE PROFILE DETAILED CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md border ${analytics.isFacebook ? 'bg-blue-600 shadow-blue-500/10 border-blue-700/10' : 'bg-red-500 shadow-red-500/10 border-red-600/10'}`}>
                      {analytics.isFacebook ? <Facebook className="size-5.5" /> : <Youtube className="size-5.5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {analytics.platformLabel || 'YouTube Channel'}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {(analytics.platformStats?.videoCount ?? 51)} posts • {formatNumber(analytics.platformStats?.subscribers ?? 1150)} subscribers
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer flex items-center gap-0.5 font-bold uppercase tracking-wider">
                    Detail <ChevronRight className="size-3" />
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xl font-black text-slate-900 block leading-tight">
                      {analytics.platformStats?.videoCount ?? 51}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mt-0.5">POSTS</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xl font-black text-slate-900 block leading-tight">
                      {formatNumber(analytics.platformStats?.likes ?? 814)}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mt-0.5">LIKES</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xl font-black text-slate-900 block leading-tight">
                      {formatNumber(analytics.platformStats?.views ?? 54600)}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mt-0.5">VIEWS</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xl font-black text-slate-900 block leading-tight">0</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mt-0.5">REACH</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xl font-black text-slate-900 block leading-tight">
                      {formatNumber(analytics.platformStats?.subscribers ?? 1150)}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mt-0.5">FOLLOWERS</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xl font-black text-slate-900 block leading-tight">
                      {(analytics.platformStats?.engagementRate ?? 150.51).toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mt-0.5">ENGAGEMENT</span>
                  </div>
                </div>
              </div>

              {/* 3. CHARTS GRID (Main line chart + side cards) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Main Trend Line Chart */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-slate-900">Tren Saluran</h3>
                      <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200 gap-0.5">
                        <button className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white text-slate-800 shadow-sm">Views</button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-6">20 hari terakhir • metrik penayangan YouTube</p>
                  </div>

                  {/* SVG Curved Chart */}
                  <div className="h-64 w-full relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 240" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      {[0, 60, 120, 180, 240].map((y, idx) => (
                        <line
                          key={idx}
                          x1="0"
                          y1={y}
                          x2="1000"
                          y2={y}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      ))}

                      {/* X-Axis labels guide markers */}
                      {trendData.map((d, i) => {
                        const x = (i / (trendData.length - 1)) * 1000
                        return (
                          <line
                            key={i}
                            x1={x}
                            y1="0"
                            x2={x}
                            y2="240"
                            stroke="#f1f5f9"
                            strokeWidth={hoveredIndex === i ? '1.5' : '0.5'}
                            strokeDasharray={hoveredIndex === i ? 'none' : '4 4'}
                          />
                        )
                      })}

                      {/* YouTube Line Path */}
                      <path
                        d={`M 0 230 
                           C 100 230, 100 230, 200 230 
                           C 300 230, 400 230, 500 230 
                           C 600 230, 700 230, 750 230 
                           C 800 20, 810 20, 830 10 
                           C 850 10, 860 140, 880 160 
                           C 900 180, 910 230, 930 210
                           C 950 190, 970 210, 1000 210`}
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="3.5"
                        className="transition-all duration-300"
                      />

                      {/* Glow shadow path for YouTube line */}
                      <path
                        d={`M 0 230 
                           C 100 230, 100 230, 200 230 
                           C 300 230, 400 230, 500 230 
                           C 600 230, 700 230, 750 230 
                           C 800 20, 810 20, 830 10 
                           C 850 10, 860 140, 880 160 
                           C 900 180, 910 230, 930 210
                           C 950 190, 970 210, 1000 210`}
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="12"
                        strokeOpacity="0.1"
                        className="pointer-events-none"
                      />

                      {/* Interactive hover markers */}
                      {trendData.map((d, i) => {
                        const x = (i / (trendData.length - 1)) * 1000
                        let y = 230
                        if (i === 8) y = 10
                        else if (i === 9) y = 160
                        else if (i === 10) y = 210

                        return (
                          <g
                            key={i}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                          >
                            <circle
                              cx={x}
                              cy={y}
                              r={hoveredIndex === i ? '7' : '4'}
                              fill="#dc2626"
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              className="transition-all duration-150 shadow-sm"
                            />
                            <rect
                              x={x - 20}
                              y="0"
                              width="40"
                              height="240"
                              fill="transparent"
                            />
                          </g>
                        )
                      })}
                    </svg>

                    {/* Interactive Tooltip */}
                    {hoveredIndex !== null && (
                      <div
                        className="absolute bg-slate-900 text-white rounded-lg p-2.5 shadow-xl z-10 pointer-events-none"
                        style={{
                          left: `${(hoveredIndex / (trendData.length - 1)) * 85 + 5}%`,
                          top: trendData[hoveredIndex].youtube > 1000 ? '10px' : '90px'
                        }}
                      >
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">{trendData[hoveredIndex].date}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="size-2 rounded-full bg-red-500" />
                          <span className="text-xs font-bold">
                            {trendData[hoveredIndex].youtube.toLocaleString('id-ID')} views
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Legend and Timeline */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#dc2626]" />
                      <span className="text-[10px] font-bold text-slate-500">Youtube Views</span>
                    </div>

                    <div className="flex justify-between w-full max-w-[80%] text-[9px] font-bold text-slate-400">
                      {trendData.map((d, i) => (
                        <span key={i}>{d.date}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Distribution of Posts */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">Distribusi Platform</h3>
                    <p className="text-[10px] text-slate-400 mb-6">Total kontribusi performa saluran</p>
                  </div>

                  {/* Circular Doughnut SVG */}
                  <div className="flex justify-center items-center h-40 relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="#f1f5f9"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="#dc2626"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray="314"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Youtube</span>
                      <span className="text-xl font-black text-slate-900 leading-none mt-1">100%</span>
                    </div>
                  </div>

                  {/* Legend listing */}
                  <div className="space-y-2 mt-6 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-[#dc2626]" />
                        <span className="font-bold text-slate-700">Youtube</span>
                      </div>
                      <span className="text-slate-500 font-bold">51 posts • 814 likes</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 4. DETAILS ROW (Engagement rates & Followers) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Likes vs Views vs Reach per Platform */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">Likes vs Views vs Reach</h3>
                    <p className="text-[10px] text-slate-400 mb-6">Metrik perbandingan performa saluran</p>
                  </div>

                  {/* Custom SVG Bar Chart */}
                  <div className="h-44 flex items-end justify-center gap-6 px-4 relative">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex gap-2 items-end h-32">
                        {/* Likes (pink) */}
                        <div className="w-4 bg-pink-500 rounded-t h-[20%] relative group">
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[9px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1">814</div>
                        </div>
                        {/* Reach */}
                        <div className="w-4 bg-purple-500 rounded-t h-[5%] relative group">
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[9px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1">0</div>
                        </div>
                        {/* Views (blue) */}
                        <div className="w-4 bg-cyan-500 rounded-t h-[85%] relative group">
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[9px] p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1">54.6K</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{analytics.platformLabel}</span>
                    </div>
                  </div>

                  {/* Legend bottom */}
                  <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-pink-500" />
                      <span className="text-[9px] font-bold text-slate-400">Likes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-purple-500" />
                      <span className="text-[9px] font-bold text-slate-400">Reach</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-cyan-500" />
                      <span className="text-[9px] font-bold text-slate-400">Views</span>
                    </div>
                  </div>
                </div>

                {/* Engagement rate */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-6">Engagement Rate</h3>
                  </div>

                  <div className="space-y-4 flex-1 justify-center flex flex-col">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500 flex items-center gap-1"><span className="size-2 rounded-full bg-red-500" /> Youtube</span>
                        <span className="text-slate-950 font-black">{(analytics.platformStats?.engagementRate ?? 150.51).toFixed(2)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full" style={{ width: '85%' }} />
                      </div>
                    </div>
                  </div>

                  {/* Summary footer */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">TOTAL COMMENTS</span>
                      <span className="text-lg font-black text-slate-900">{analytics.platformStats?.comments ?? 4}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">AVG / POST</span>
                      <span className="text-lg font-black text-slate-900">611 views</span>
                    </div>
                  </div>
                </div>

                {/* Followers per Platform doughnut */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">Subscribers Saluran</h3>
                    <p className="text-[10px] text-slate-400 mb-6">Total subscribers saluran</p>
                  </div>

                  <div className="flex justify-center items-center h-40 relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="#f1f5f9"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="50"
                        stroke="#dc2626"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray="314"
                        strokeDashoffset="10"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subscribers</span>
                      <span className="text-xl font-black text-slate-900 leading-none mt-1">
                        {formatNumber(analytics.platformStats?.subscribers ?? 1150)}
                      </span>
                    </div>
                  </div>

                  {/* Details listing */}
                  <div className="space-y-2 mt-6 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-[#dc2626]" />
                        <span className="font-bold text-slate-700">{analytics.platformLabel}</span>
                      </div>
                      <span className="text-slate-500 font-bold">{analytics.platformStats?.subscribers ?? 1150}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 5. TOP CONTENT */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-0.5">Top Konten — Views</h3>
                <p className="text-[10px] text-slate-400 mb-6">Berdasarkan total views video</p>

                {/* Horizontal Bar Chart */}
                <div className="space-y-4">
                  {topContent.map((post, idx) => {
                    const views = post.views ?? 0
                    const maxViews = Math.max(...topContent.map((p) => p.views ?? 0), 1)
                    const percentWidth = (views / maxViews) * 100

                    return (
                      <div key={`${post.id}-${idx}`} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-700 truncate max-w-[80%]">
                            {idx + 1}. {post.title}
                          </span>
                          <span className="text-slate-900 font-black">{views.toLocaleString('id-ID')} views</span>
                        </div>
                        <div className="w-full bg-slate-100 h-4 rounded-md overflow-hidden flex">
                          <div
                            className="bg-gradient-to-r from-red-600 to-red-500 h-full rounded-md transition-all duration-1000 ease-out"
                            style={{ width: `${percentWidth}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 6. RECENT POSTS TABLE */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Post Terbaru</h3>
                    <p className="text-[10px] text-slate-400">Menampilkan semua postingan video YouTube Anda</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                    {analytics.recentPosts.length} posts
                  </span>
                </div>

                {/* Tabular List */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                        <th className="px-6 py-4">Konten</th>
                        <th className="px-6 py-4 text-right">Likes</th>
                        <th className="px-6 py-4 text-right">Views</th>
                        <th className="px-6 py-4 text-right">Reach</th>
                        <th className="px-6 py-4 text-right w-16">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.recentPosts.map((post, idx) => (
                        <tr
                          key={`${post.id}-${idx}`}
                          className="hover:bg-slate-50/60 transition-colors group text-xs"
                        >
                          {/* Title & Tags */}
                          <td className="px-6 py-4 max-w-xl">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-600 border border-red-100 shrink-0 mt-0.5">
                                <Youtube className="size-4" />
                              </div>
                              
                              <div className="space-y-1">
                                <span className="font-bold text-slate-850 group-hover:text-red-600 transition-colors block leading-snug">
                                  {post.title}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-red-600 font-bold">
                                  <span className="text-slate-400 font-medium mr-1.5">{post.date}</span>
                                  {post.tags.map((tag, i) => (
                                    <span key={i} className="hover:underline cursor-pointer">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Likes */}
                          <td className="px-6 py-4 text-right font-bold text-slate-600">
                            <div className="flex items-center justify-end gap-1.5">
                              <Heart className="size-3 text-pink-500 fill-pink-500/10" />
                              {(post.likes ?? 0).toLocaleString('id-ID')}
                            </div>
                          </td>

                          {/* Views */}
                          <td className="px-6 py-4 text-right font-black text-slate-900">
                            <div className="flex items-center justify-end gap-1.5">
                              <Eye className="size-3 text-cyan-600" />
                              {(post.views ?? 0).toLocaleString('id-ID')}
                            </div>
                          </td>

                          {/* Reach */}
                          <td className="px-6 py-4 text-right font-bold text-slate-400">
                            <div className="flex items-center justify-end gap-1.5">
                              <Globe className="size-3 text-purple-400" />
                              {post.reach}
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="px-6 py-4 text-right">
                            {post.url && post.url !== '#' ? (
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center p-1.5 bg-slate-50 hover:bg-red-500 hover:text-white border border-slate-200 hover:border-red-500 rounded-lg text-slate-500 transition-all"
                              >
                                <ExternalLink className="size-3.5" />
                              </a>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center justify-center p-1.5 bg-slate-50/50 text-slate-300 border border-slate-100 rounded-lg cursor-not-allowed"
                              >
                                <ExternalLink className="size-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </>
              )}

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 max-w-xl mx-auto shadow-sm">
              Gagal memuat analisis data platform.
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
