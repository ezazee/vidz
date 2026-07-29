'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { SkeletonStats, SkeletonTable, LoadingLabel } from '@/components/Skeleton'
import '../app.css'

type ChannelId = 'cabang-sejarah' | 'brainwhy' | 'cerita-tetangga'

const CHANNELS: { id: ChannelId; label: string }[] = [
  { id: 'cabang-sejarah', label: 'Cabang Sejarah' },
  { id: 'brainwhy', label: 'BrainWhy' },
  { id: 'cerita-tetangga', label: 'Cerita Tetangga' },
]

// 1=Senin … 6=Sabtu (Minggu dipakai untuk evaluasi, bukan produksi)
const DAYS = [
  { n: 1, label: 'Senin' },
  { n: 2, label: 'Selasa' },
  { n: 3, label: 'Rabu' },
  { n: 4, label: 'Kamis' },
  { n: 5, label: 'Jumat' },
  { n: 6, label: 'Sabtu' },
]

interface PlanEntry {
  day: number
  topic: string
  theme?: string
  uploadTime?: string
}

interface Recommendations {
  plan: PlanEntry[]
  titleStyle?: string
  uploadTime?: string
  updatedAt?: string
}

export default function PlannerPage() {
  const [channel, setChannel] = useState<ChannelId>('cabang-sejarah')
  const [rec, setRec] = useState<Recommendations | null>(null)
  const [stale, setStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async (id: ChannelId) => {
    setLoading(true)
    setFailed(false)
    setStale(false)
    try {
      const res = await fetch('/api/recommendations', { headers: { 'x-channel-id': id } })
      if (!res.ok) throw new Error('gagal')
      const json = await res.json()
      setRec(json.recommendations ?? null)
      setStale(Boolean(json.stale))
    } catch {
      setFailed(true)
      setRec(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(channel)
  }, [channel, load])

  const planByDay = new Map((rec?.plan ?? []).map((p) => [p.day, p]))
  const filled = rec?.plan?.length ?? 0

  return (
    <AppShell
      title="Content Planner"
      subtitle="Rencana topik mingguan dari evaluasi AI"
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

      {loading ? (
        <>
          <LoadingLabel>Memuat rencana konten</LoadingLabel>
          <SkeletonStats count={3} />
          <SkeletonTable rows={6} cols={4} />
        </>
      ) : failed ? (
        <div className="empty">
          <p className="empty__title">Gagal memuat rencana</p>
          <p className="empty__note">Endpoint rekomendasi tidak merespons untuk channel ini.</p>
          <button className="btn" onClick={() => load(channel)}>
            Coba lagi
          </button>
        </div>
      ) : (
        <>
          <section className="stats">
            <div className="stat">
              <span className="stat__label">Hari terisi</span>
              <span className={`stat__value${filled ? '' : ' stat__value--empty'}`}>
                {filled ? `${filled} / 6` : '—'}
              </span>
              <span className="stat__foot">Senin sampai Sabtu</span>
            </div>
            <div className="stat">
              <span className="stat__label">Jam unggah default</span>
              <span className={`stat__value${rec?.uploadTime ? '' : ' stat__value--empty'}`}>
                {rec?.uploadTime ?? '—'}
              </span>
              <span className="stat__foot">dipakai kalau hari itu tidak punya jam sendiri</span>
            </div>
            <div className="stat">
              <span className="stat__label">Status rencana</span>
              <span className="stat__value" style={{ fontSize: 'var(--text-md)' }}>
                {!rec ? (
                  <span className="badge badge--muted">
                    <span className="badge__dot" aria-hidden="true" />
                    Kosong
                  </span>
                ) : stale ? (
                  <span className="badge badge--warn">
                    <span className="badge__dot" aria-hidden="true" />
                    Kedaluwarsa
                  </span>
                ) : (
                  <span className="badge badge--ok">
                    <span className="badge__dot" aria-hidden="true" />
                    Aktif
                  </span>
                )}
              </span>
              <span className="stat__foot">disegarkan tiap Minggu oleh n8n</span>
            </div>
          </section>

          {rec?.titleStyle && (
            <section className="card">
              <h2 className="card__title">Arahan gaya judul minggu ini</h2>
              <p className="card__note">{rec.titleStyle}</p>
            </section>
          )}

          <section className="card card--flush">
            <div className="card__head" style={{ padding: 'var(--space-md)', marginBottom: 0 }}>
              <div>
                <h2 className="card__title">Jadwal topik</h2>
                <p className="card__note">
                  Hari tanpa topik akan memakai topik cadangan dari konfigurasi channel.
                </p>
              </div>
            </div>

            {!rec || filled === 0 ? (
              <div style={{ padding: 'var(--space-md)' }}>
                <div className="empty">
                  <p className="empty__title">Belum ada rencana mingguan</p>
                  <p className="empty__note">
                    Rencana dibuat otomatis tiap hari Minggu oleh workflow evaluasi n8n. Sampai
                    itu jalan, produksi memakai topik cadangan per channel.
                  </p>
                </div>
              </div>
            ) : (
              <div className="tablewrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Hari</th>
                      <th>Topik</th>
                      <th>Tema</th>
                      <th className="table__num">Jam unggah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((d) => {
                      const entry = planByDay.get(d.n)
                      return (
                        <tr key={d.n}>
                          <td className="table__strong">{d.label}</td>
                          <td>
                            {entry ? (
                              entry.topic
                            ) : (
                              <span className="mono">— topik cadangan</span>
                            )}
                          </td>
                          <td>
                            {entry?.theme ? (
                              <span className="badge badge--muted">{entry.theme}</span>
                            ) : (
                              <span className="mono">—</span>
                            )}
                          </td>
                          <td className="table__num mono">
                            {entry?.uploadTime ?? rec.uploadTime ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
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
