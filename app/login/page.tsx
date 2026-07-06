'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Film } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Password salah')
      }
    } catch {
      setError('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="size-12 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Film className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">StoryZ Studio</h1>
              <p className="text-sm text-slate-400">Masukkan password untuk melanjutkan</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
