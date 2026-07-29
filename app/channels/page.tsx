'use client'

import { useEffect, useState } from 'react'
import { Youtube, Facebook } from 'lucide-react'
import AppShell from '@/components/AppShell'
import { SkeletonCards, LoadingLabel } from '@/components/Skeleton'
import '../app.css'

interface Channel {
  id: string
  name: string
  tagline: string
  language: 'id' | 'en'
  platform: 'youtube' | 'facebook'
  titlePrefix: string | null
  mascotName: string
  thumbnailStyle: 'split' | 'flat'
  categories: string[]
  openingStyleCount: number
  fallbackTopics: string[]
}

const LANG_LABEL: Record<Channel['language'], string> = {
  id: 'Bahasa Indonesia',
  en: 'English',
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/channels')
        if (!res.ok) throw new Error('gagal')
        const json = await res.json()
        setChannels(json.channels ?? [])
      } catch {
        setFailed(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <AppShell title="Channels" subtitle="Identitas dan konfigurasi tiap channel">
      {loading ? (
        <>
          <LoadingLabel>Memuat konfigurasi channel</LoadingLabel>
          <SkeletonCards count={3} />
        </>
      ) : failed ? (
        <div className="empty">
          <p className="empty__title">Gagal memuat konfigurasi</p>
          <p className="empty__note">Endpoint channel tidak merespons.</p>
        </div>
      ) : (
        <>
          <section className="card">
            <h2 className="card__title">Satu mesin, tiga identitas</h2>
            <p className="card__note">
              Konfigurasi ini hidup di <span className="mono">lib/channels.ts</span> dan
              menentukan bahasa, kategori, gaya sampul, serta platform tujuan tiap channel.
              Halaman ini menampilkannya sebagai rujukan — perubahan tetap dilakukan lewat kode
              supaya pipeline dan UI tidak pernah beda versi.
            </p>
          </section>

          {channels.map((c) => {
            const isFb = c.platform === 'facebook'
            return (
              <section className="card" key={c.id}>
                <div className="card__head">
                  <div className="row">
                    <span className={`pmark pmark--${isFb ? 'facebook' : 'youtube'}`}>
                      {isFb ? <Facebook className="size-4" /> : <Youtube className="size-4" />}
                    </span>
                    <div className="truncate">
                      <h2 className="card__title">{c.name}</h2>
                      <p className="card__note">{c.tagline}</p>
                    </div>
                  </div>
                  <span className="mono">{c.id}</span>
                </div>

                <div className="stats" style={{ marginBottom: 'var(--space-md)' }}>
                  <div>
                    <span className="stat__label">Bahasa</span>
                    <span className="stat__value" style={{ fontSize: 'var(--text-base)' }}>
                      {LANG_LABEL[c.language]}
                    </span>
                  </div>
                  <div>
                    <span className="stat__label">Platform</span>
                    <span className="stat__value" style={{ fontSize: 'var(--text-base)' }}>
                      {isFb ? 'Facebook' : 'YouTube'}
                    </span>
                  </div>
                  <div>
                    <span className="stat__label">Gaya sampul</span>
                    <span className="stat__value" style={{ fontSize: 'var(--text-base)' }}>
                      {c.thumbnailStyle === 'split' ? 'Split-screen' : 'Flat'}
                    </span>
                  </div>
                  <div>
                    <span className="stat__label">Variasi pembuka</span>
                    <span className="stat__value" style={{ fontSize: 'var(--text-base)' }}>
                      {c.openingStyleCount} gaya
                    </span>
                  </div>
                </div>

                <div className="grid-2">
                  <div>
                    <span className="stat__label">Kategori konten</span>
                    <div className="row" style={{ marginTop: 'var(--space-2xs)' }}>
                      {c.categories.map((cat) => (
                        <span className="badge badge--muted" key={cat}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="stat__label">
                      Topik cadangan{c.titlePrefix ? ` · awalan “${c.titlePrefix}”` : ''}
                    </span>
                    <ul
                      style={{
                        margin: 'var(--space-2xs) 0 0',
                        paddingInlineStart: 'var(--space-sm)',
                        color: 'var(--color-ink-2)',
                        lineHeight: 1.7,
                      }}
                    >
                      {c.fallbackTopics.slice(0, 3).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )
          })}
        </>
      )}
    </AppShell>
  )
}
