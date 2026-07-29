'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Loader2, ExternalLink } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { SkeletonTable, LoadingLabel } from '@/components/Skeleton'
import '../app.css'

type ChannelId = 'cabang-sejarah' | 'brainwhy' | 'cerita-tetangga'

const CHANNELS: { id: ChannelId; label: string }[] = [
  { id: 'cabang-sejarah', label: 'Cabang Sejarah' },
  { id: 'brainwhy', label: 'BrainWhy' },
  { id: 'cerita-tetangga', label: 'Cerita Tetangga' },
]

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

interface RenderJob {
  id: string
  project_id: string
  mode: 'full' | 'short'
  status: JobStatus
  video_url: string | null
  gh_run_id: string | null
  error: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  topic: string | null
}

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: 'Antre',
  processing: 'Berjalan',
  completed: 'Selesai',
  failed: 'Gagal',
}

const STATUS_TONE: Record<JobStatus, string> = {
  pending: 'muted',
  processing: 'warn',
  completed: 'ok',
  failed: 'danger',
}

const GH_REPO = 'ezazee/vidz'

function when(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function elapsed(job: RenderJob): string {
  const start = job.started_at ?? job.created_at
  const end = job.completed_at ?? (job.status === 'processing' ? new Date().toISOString() : null)
  if (!start || !end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const min = Math.floor(ms / 60000)
  return min < 60 ? `${min}m` : `${Math.floor(min / 60)}j ${min % 60}m`
}

export default function RenderQueuePage() {
  const [channel, setChannel] = useState<ChannelId>('cabang-sejarah')
  const [jobs, setJobs] = useState<RenderJob[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async (id: ChannelId) => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await fetch('/api/render-jobs?limit=40', { headers: { 'x-channel-id': id } })
      if (!res.ok) throw new Error('gagal')
      const json = await res.json()
      setJobs(json.jobs ?? [])
    } catch {
      setFailed(true)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(channel)
  }, [channel, load])

  const active = jobs.filter((j) => j.status === 'pending' || j.status === 'processing')
  const failedJobs = jobs.filter((j) => j.status === 'failed')

  return (
    <AppShell
      title="Render Queue"
      subtitle="Antrean dan riwayat render job"
      actions={
        <button
          className="btn btn--icon"
          onClick={() => load(channel)}
          disabled={loading}
          aria-label="Muat ulang"
        >
          {loading ? <Loader2 className="size-4 spin" /> : <RefreshCw className="size-4" />}
        </button>
      }
    >
      <div className="tabs" role="tablist" aria-label="Pilih channel">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={channel === c.id}
            className="tab"
            onClick={() => setChannel(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section className="stats">
        <div className="stat">
          <span className="stat__label">Sedang berjalan</span>
          <span className={`stat__value${active.length ? '' : ' stat__value--empty'}`}>
            {loading ? '—' : active.length}
          </span>
          <span className="stat__foot">antre + proses</span>
        </div>
        <div className="stat">
          <span className="stat__label">Gagal</span>
          <span className={`stat__value${failedJobs.length ? '' : ' stat__value--empty'}`}>
            {loading ? '—' : failedJobs.length}
          </span>
          <span className="stat__foot">dari {jobs.length} job terakhir</span>
        </div>
        <div className="stat">
          <span className="stat__label">Total tercatat</span>
          <span className="stat__value">{loading ? '—' : jobs.length}</span>
          <span className="stat__foot">maksimal 40 terbaru</span>
        </div>
      </section>

      <section className="card card--flush">
        <div className="card__head" style={{ padding: 'var(--space-md)', marginBottom: 0 }}>
          <div>
            <h2 className="card__title">Riwayat job</h2>
            <p className="card__note">
              Status dilaporkan GitHub Actions lewat webhook saat render berjalan.
            </p>
          </div>
        </div>

        {loading ? (
          <>
            <LoadingLabel>Memuat render job</LoadingLabel>
            <SkeletonTable rows={6} cols={5} />
          </>
        ) : failed ? (
          <div style={{ padding: 'var(--space-md)' }}>
            <div className="empty">
              <p className="empty__title">Gagal memuat render job</p>
              <p className="empty__note">
                Endpoint tidak merespons untuk channel ini. Bisa jadi database channel belum
                dikonfigurasi.
              </p>
              <button className="btn" onClick={() => load(channel)}>
                Coba lagi
              </button>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: 'var(--space-md)' }}>
            <div className="empty">
              <p className="empty__title">Belum ada render job</p>
              <p className="empty__note">
                Job muncul di sini setelah sebuah project dikirim ke tahap render.
              </p>
              <Link className="btn" href="/studio">
                Buka Studio
              </Link>
            </div>
          </div>
        ) : (
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th className="table__num">Mulai</th>
                  <th className="table__num">Durasi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link
                        className="table__strong"
                        href={`/projects/${j.project_id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        {j.topic ?? 'Project tanpa judul'}
                      </Link>
                      {j.error && <p className="failnote">{j.error}</p>}
                    </td>
                    <td>
                      <span className={`badge badge--${STATUS_TONE[j.status]}`}>
                        <span className="badge__dot" aria-hidden="true" />
                        {STATUS_LABEL[j.status]}
                      </span>
                    </td>
                    <td>
                      <span className="mono">{j.mode}</span>
                    </td>
                    <td className="table__num mono">{when(j.started_at ?? j.created_at)}</td>
                    <td className="table__num mono">{elapsed(j)}</td>
                    <td className="table__num">
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        {j.gh_run_id && (
                          <a
                            className="btn btn--icon"
                            href={`https://github.com/${GH_REPO}/actions/runs/${j.gh_run_id}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Buka run GitHub Actions"
                            title="Log GitHub Actions"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  )
}
