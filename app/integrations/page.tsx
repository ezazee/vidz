'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import {
  Menu,
  Key,
  Plug,
  Youtube,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface IntegrationStatus {
  zernioConnected: boolean
  youtubeConnected: boolean
  zernioApiKey: string
  youtubeChannelName: string | null
  youtubeChannelThumbnail: string | null
  youtubeAccountId: string | null
}

export default function IntegrationsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Data States
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [zernioInputKey, setZernioInputKey] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [connectingYoutube, setConnectingYoutube] = useState(false)

  // Status/Notifications from URL parameters
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchIntegrations = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/integrations')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data)
        if (data.zernioConnected && !zernioInputKey) {
          setZernioInputKey(data.zernioApiKey)
        }
      }
    } catch (e) {
      console.error('Gagal memuat status integrasi', e)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()

    // Ambil parameter status dari URL tanpa memicu peringatan Suspense
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const success = params.get('success')
      const error = params.get('error')

      if (success === 'youtube_connected') {
        setSuccessMessage('Channel YouTube Anda berhasil diintegrasikan!')
      }
      if (error === 'missing_account_id') {
        setErrorMessage('Gagal menghubungkan YouTube: ID Akun tidak ditemukan.')
      } else if (error === 'oauth_failed') {
        setErrorMessage('Gagal menghubungkan YouTube: Proses otorisasi dibatalkan atau gagal.')
      } else if (error === 'callback_processing_failed') {
        setErrorMessage('Gagal menghubungkan YouTube: Terjadi kesalahan saat memproses data callback.')
      } else if (error) {
        setErrorMessage(`Terjadi kesalahan: ${error}`)
      }
    }
  }, [])

  const handleSaveZernioKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!zernioInputKey.trim() || savingKey) return

    setSavingKey(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zernio_api_key: zernioInputKey }),
      })
      const data = await res.json()

      if (res.ok) {
        setSuccessMessage(data.youtubeSynced 
          ? 'API Key Zernio berhasil disimpan dan akun YouTube tersinkronisasi secara otomatis!' 
          : 'API Key Zernio berhasil disimpan!')
        fetchIntegrations(true)
      } else {
        setErrorMessage(data.error || 'Gagal menyimpan API Key.')
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan koneksi saat menyimpan API Key.')
    } finally {
      setSavingKey(false)
    }
  }

  const handleConnectYoutube = async () => {
    if (connectingYoutube) return
    setConnectingYoutube(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/integrations/youtube/connect')
      const data = await res.json()

      if (res.ok && data.url) {
        console.log(`Redirecting user to Zernio OAuth: ${data.url}`)
        window.location.href = data.url
      } else {
        setErrorMessage(data.error || 'Gagal mendapatkan URL koneksi YouTube dari Zernio.')
      }
    } catch (e) {
      setErrorMessage('Terjadi kesalahan koneksi saat menghubungkan YouTube.')
    } finally {
      setConnectingYoutube(false)
    }
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
            <h2 className="text-base font-semibold text-slate-800">Integration Center</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchIntegrations()}
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
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Status Notifications */}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 relative">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800">Berhasil</p>
                  <p className="text-xs text-emerald-600 mt-0.5">{successMessage}</p>
                </div>
                <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 absolute top-3 right-3">
                  <XCircle className="size-4 hidden" /> {/* Placeholder */}
                  <span className="text-sm font-bold">&times;</span>
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 relative">
                <XCircle className="size-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-800">Gagal</p>
                  <p className="text-xs text-rose-500 mt-0.5">{errorMessage}</p>
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 absolute top-3 right-3">
                  <span className="text-sm font-bold">&times;</span>
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl shadow-sm">
                <Loader2 className="size-8 animate-spin text-indigo-600" />
                <span className="text-sm font-semibold">Memuat konfigurasi integrasi...</span>
              </div>
            ) : integrations ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Panel: Zernio API Key setup */}
                <div className="md:col-span-6 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Key className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">Zernio API Key</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Penghubung utama layanan distribusi media</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveZernioKey} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="zernio_key" className="text-xs font-bold text-slate-500">Zernio API Key</label>
                        <input
                          id="zernio_key"
                          type="password"
                          placeholder="Masukkan Zernio API Key Anda (sk_...)"
                          value={zernioInputKey}
                          onChange={e => setZernioInputKey(e.target.value)}
                          className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={savingKey || !zernioInputKey.trim()}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-semibold disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {savingKey ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          'Simpan API Key'
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Panel: YouTube Channel Connect */}
                <div className="md:col-span-6 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                        <Youtube className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">YouTube Connector</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Otorisasi publikasi video dokumenter otomatis</p>
                      </div>
                    </div>

                    {integrations.youtubeConnected ? (
                      /* Connected YouTube Channel Card */
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4.5">
                          {integrations.youtubeChannelThumbnail ? (
                            <img
                              src={integrations.youtubeChannelThumbnail}
                              alt={integrations.youtubeChannelName || 'YouTube Avatar'}
                              className="size-12 rounded-full border border-slate-200 shadow-sm"
                            />
                          ) : (
                            <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                              <Youtube className="size-6" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">TERHUBUNG</span>
                            <h4 className="font-black text-slate-800 text-sm mt-1 truncate">{integrations.youtubeChannelName}</h4>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">ID: {integrations.youtubeAccountId}</p>
                          </div>
                        </div>

                        <button
                          onClick={handleConnectYoutube}
                          disabled={connectingYoutube || !integrations.zernioConnected}
                          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold transition-all shadow-sm"
                        >
                          {connectingYoutube ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin text-red-600" />
                              Menyambungkan Ulang...
                            </>
                          ) : (
                            <>
                              <Plug className="size-3.5 text-slate-500" />
                              Ganti / Hubungkan Akun Lain
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Not Connected View */
                      <div className="space-y-4 py-3">
                        <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-100 rounded-lg p-3.5 text-amber-800">
                          <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                          <div className="text-[11px] leading-relaxed">
                            <p className="font-semibold">YouTube Belum Terhubung</p>
                            <p className="text-amber-700/80 mt-0.5">Anda belum menghubungkan akun YouTube. Otorisasikan akun YouTube untuk mempublikasikan video secara otomatis setelah render selesai.</p>
                          </div>
                        </div>

                        <button
                          onClick={handleConnectYoutube}
                          disabled={connectingYoutube || !integrations.zernioConnected}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-4 py-2.5 text-xs font-semibold transition-all shadow-sm shadow-red-600/10"
                        >
                          {connectingYoutube ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              Menghubungkan...
                            </>
                          ) : (
                            <>
                              <Youtube className="size-3.5" />
                              Hubungkan Channel YouTube
                            </>
                          )}
                        </button>
                        {!integrations.zernioConnected && (
                          <p className="text-[9px] text-slate-400 text-center">Pastikan Anda telah mengisi dan menyimpan Zernio API Key terlebih dahulu.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 shadow-sm">
                Gagal memuat status integrasi.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
