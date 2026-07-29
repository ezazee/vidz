'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Loader2, Youtube, Facebook, ExternalLink } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { SkeletonStats, SkeletonCards, LoadingLabel } from '@/components/Skeleton'
import '../app.css'

type ChannelId = 'cabang-sejarah' | 'brainwhy' | 'cerita-tetangga'

const CHANNELS: { id: ChannelId; label: string; platform: 'youtube' | 'facebook' }[] = [
  { id: 'cabang-sejarah', label: 'Cabang Sejarah', platform: 'youtube' },
  { id: 'brainwhy', label: 'BrainWhy', platform: 'youtube' },
  { id: 'cerita-tetangga', label: 'Cerita Tetangga', platform: 'facebook' },
]

interface PlatformStats {
  subscribers: number
  views: number
  watchTimeSeconds: number
  likes: number
  comments: number
  videoCount: number
  engagementRate?: number
}

interface AnalyticsData {
  platform?: 'youtube' | 'facebook'
  totalProjects: number
  totalCompleted: number
  youtubeConnected: boolean
  youtubeChannelName: string
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

/** Angka besar diringkas. null/undefined TIDAK pernah jadi angka contoh —
 *  design.md § Kejujuran data. */
function num(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export default function OverviewPage() {
  const [data, setData] = useState<Partial<Record<ChannelId, AnalyticsData>>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const results = await Promise.all(
        CHANNELS.map(async (c) => {
          const res = await fetch('/api/analytics', { headers: { 'x-channel-id': c.id } })
          const json = res.ok ? await res.json() : null
          return [c.id, json?.analytics as AnalyticsData | undefined] as const
        }),
      )
      const merged: Partial<Record<ChannelId, AnalyticsData>> = {}
      for (const [id, a] of results) if (a) merged[id] = a
      setData(merged)
      if (Object.keys(merged).length === 0) setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const loaded = Object.values(data).filter(Boolean) as AnalyticsData[]
  const statsOf = (a: AnalyticsData | undefined) =>
    a ? (a.platform === 'facebook' ? a.facebookStats : a.youtubeStats) : null

  // Total lintas channel — hanya dari channel yang datanya benar-benar ada.
  const totals = loaded.length
    ? {
        projects: loaded.reduce((n, a) => n + (a.totalProjects ?? 0), 0),
        completed: loaded.reduce((n, a) => n + (a.totalCompleted ?? 0), 0),
        views: loaded.reduce((n, a) => n + (statsOf(a)?.views ?? 0), 0),
        followers: loaded.reduce((n, a) => n + (statsOf(a)?.subscribers ?? 0), 0),
      }
    : null

  const recent = loaded
    .flatMap((a) => a.recentPosts ?? [])
    .sort((x, y) => (y.date > x.date ? 1 : -1))
    .slice(0, 10)

  return (
    <AppShell
      title="Overview"
      subtitle="Ringkasan performa tiga channel"
      actions={
        <button className="btn btn--icon" onClick={load} disabled={loading} aria-label="Muat ulang">
          {loading ? <Loader2 className="size-4 spin" /> : <RefreshCw className="size-4" />}
        </button>
      }
    >
      {loading ? (
        <>
          <LoadingLabel>Memuat data channel</LoadingLabel>
          <SkeletonStats count={4} />
          <SkeletonCards count={3} />
        </>
      ) : failed ? (
        <div className="empty">
          <p className="empty__title">Data tidak bisa dimuat</p>
          <p className="empty__note">
            Endpoint analitik tidak merespons. Cek koneksi integrasi di halaman Integrations,
            lalu muat ulang.
          </p>
          <button className="btn" onClick={load}>
            Coba lagi
          </button>
        </div>
      ) : (
        <>
          <section className="stats">
            <div className="stat">
              <span className="stat__label">Total project</span>
              <span className="stat__value">{num(totals?.projects)}</span>
              <span className="stat__foot">{num(totals?.completed)} selesai render</span>
            </div>
            <div className="stat">
              <span className="stat__label">Total views</span>
              <span className="stat__value">{num(totals?.views)}</span>
              <span className="stat__foot">gabungan tiga channel</span>
            </div>
            <div className="stat">
              <span className="stat__label">Total pengikut</span>
              <span className="stat__value">{num(totals?.followers)}</span>
              <span className="stat__foot">subscriber + follower</span>
            </div>
            <div className="stat">
              <span className="stat__label">Channel terhubung</span>
              <span className="stat__value">
                {loaded.filter((a) =>
                  a.platform === 'facebook' ? a.facebookConnected : a.youtubeConnected,
                ).length}
                <span className="stat__foot" style={{ display: 'inline' }}>
                  {' '}
                  / {CHANNELS.length}
                </span>
              </span>
              <span className="stat__foot">status integrasi</span>
            </div>
          </section>

          <section className="grid-2">
            {CHANNELS.map((c) => {
              const a = data[c.id]
              const s = statsOf(a)
              const isFb = c.platform === 'facebook'
              const connected = a ? (isFb ? a.facebookConnected : a.youtubeConnected) : false
              const account = a ? (isFb ? a.facebookPageName : a.youtubeChannelName) : null

              return (
                <article className="card" key={c.id}>
                  <div className="card__head">
                    <div className="row">
                      <span className={`pmark pmark--${isFb ? 'facebook' : 'youtube'}`}>
                        {isFb ? <Facebook className="size-4" /> : <Youtube className="size-4" />}
                      </span>
                      <div className="truncate">
                        <h2 className="card__title">{c.label}</h2>
                        <p className="card__note">{account || 'Belum terhubung'}</p>
                      </div>
                    </div>
                    <span className={`badge badge--${connected ? 'ok' : 'muted'}`}>
                      <span className="badge__dot" aria-hidden="true" />
                      {connected ? 'Terhubung' : 'Terputus'}
                    </span>
                  </div>

                  {!a ? (
                    <p className="card__note">Data channel ini tidak tersedia.</p>
                  ) : (
                    <div className="stats">
                      <div>
                        <span className="stat__label">Pengikut</span>
                        <span className="stat__value">{num(s?.subscribers)}</span>
                      </div>
                      <div>
                        <span className="stat__label">Views</span>
                        <span className="stat__value">{num(s?.views)}</span>
                      </div>
                      <div>
                        <span className="stat__label">Video</span>
                        <span className="stat__value">{num(s?.videoCount)}</span>
                      </div>
                      <div>
                        <span className="stat__label">Project</span>
                        <span className="stat__value">{num(a.totalProjects)}</span>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </section>

          <section className="card card--flush">
            <div className="card__head" style={{ padding: 'var(--space-md)', marginBottom: 0 }}>
              <div>
                <h2 className="card__title">Publikasi terbaru</h2>
                <p className="card__note">Sepuluh unggahan terakhir dari semua channel</p>
              </div>
              <Link className="btn" href="/library">
                Buka Library
              </Link>
            </div>

            {recent.length === 0 ? (
              <div style={{ padding: 'var(--space-md)' }}>
                <div className="empty">
                  <p className="empty__title">Belum ada publikasi</p>
                  <p className="empty__note">
                    Begitu ada video yang tayang, daftarnya muncul di sini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="tablewrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Judul</th>
                      <th className="table__num">Views</th>
                      <th className="table__num">Likes</th>
                      <th className="table__num">Tanggal</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p, i) => (
                      <tr key={`${p.id}-${i}`}>
                        <td>
                          <span className="table__strong">{p.title}</span>
                        </td>
                        <td className="table__num">{num(p.views)}</td>
                        <td className="table__num">{num(p.likes)}</td>
                        <td className="table__num mono">{p.date}</td>
                        <td className="table__num">
                          {p.url && p.url !== '#' ? (
                            <a
                              className="btn btn--icon"
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Buka ${p.title}`}
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          ) : (
                            <span className="mono">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  )
}
