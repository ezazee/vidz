'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { CalendarClock, CalendarDays, Plus, Trash2, Loader2, Menu, CheckCircle2, Clock, X, Info, Compass, MoonStar, Rocket, HelpCircle, Swords, Cpu, Play } from 'lucide-react'

interface Schedule {
  id: string
  theme: string
  days_of_week: string
  time_of_day: string
  is_active: boolean
  auto_publish: boolean
  last_run_at: string | null
  next_run_at: string | null
}

const THEMES = [
  { id: 'Ancient History', label: 'Sejarah Kuno', icon: Compass, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'Unsolved Mysteries', label: 'Misteri & Kriminal', icon: MoonStar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'Space & Astronomy', label: 'Luar Angkasa', icon: Rocket, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'What-If Scenarios', label: 'Skenario "What-If"', icon: HelpCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'Mythology & Folklore', label: 'Mitologi & Legenda', icon: Swords, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'Technology & IT', label: 'Teknologi & IT', icon: Cpu, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' }
]

const DAYS = [
  { id: 1, label: 'Senin', short: 'Sen' },
  { id: 2, label: 'Selasa', short: 'Sel' },
  { id: 3, label: 'Rabu', short: 'Rab' },
  { id: 4, label: 'Kamis', short: 'Kam' },
  { id: 5, label: 'Jumat', short: 'Jum' },
  { id: 6, label: 'Sabtu', short: 'Sab' },
  { id: 0, label: 'Minggu', short: 'Min' },
]

export default function SchedulePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [activeDay, setActiveDay] = useState<{ id: number, label: string } | null>(null)
  const [theme, setTheme] = useState('Unsolved Mysteries')
  const [timeOfDay, setTimeOfDay] = useState('19:00')
  const [autoPublish, setAutoPublish] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  
  const [isTestingCron, setIsTestingCron] = useState(false)

  // Cron Guide Info Modal
  const [showGuide, setShowGuide] = useState(false)

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules')
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [])

  const getScheduleForDay = (dayId: number) => {
    return schedules.find(s => {
      const days = s.days_of_week.split(',').map(Number)
      return days.includes(dayId)
    })
  }

  const openModalForDay = (dayId: number, label: string) => {
    const existing = getScheduleForDay(dayId)
    setActiveDay({ id: dayId, label })
    
    if (existing) {
      setEditingScheduleId(existing.id)
      // Check if existing theme is in our THEMES array, if not default to first
      const matchedTheme = THEMES.find(t => t.id === existing.theme || t.label === existing.theme)
      setTheme(matchedTheme ? matchedTheme.id : 'Unsolved Mysteries')
      setTimeOfDay(existing.time_of_day)
      setAutoPublish(existing.auto_publish)
    } else {
      setEditingScheduleId(null)
      setTheme('Unsolved Mysteries')
      setTimeOfDay('19:00')
      setAutoPublish(true)
    }
  }

  const closeModal = () => {
    setActiveDay(null)
    setEditingScheduleId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!theme || !activeDay) return
    setIsSubmitting(true)
    
    try {
      if (editingScheduleId) {
        await fetch(`/api/schedules/${editingScheduleId}`, { method: 'DELETE' })
      }

      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: theme, // Saving the theme ID
          days_of_week: activeDay.id.toString(),
          time_of_day: timeOfDay,
          auto_publish: autoPublish
        })
      })
      if (res.ok) {
        fetchSchedules()
        closeModal()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Hapus jadwal ini?')) return
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchSchedules()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleActive = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })
      if (res.ok) {
        fetchSchedules()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleTestCron = async () => {
    setIsTestingCron(true)
    try {
      const res = await fetch('/api/cron/tick')
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Cron tick berhasil dieksekusi.')
      } else {
        alert(`Gagal: ${data.error || 'Terjadi kesalahan'}`)
      }
    } catch (err) {
      alert('Terjadi kesalahan saat memanggil cron tick.')
      console.error(err)
    } finally {
      setIsTestingCron(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Light Mode */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-all"
            >
              <Menu className="size-5" />
            </button>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="size-5 text-indigo-600" />
              Weekly Programming
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleTestCron}
              disabled={isTestingCron}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200 text-xs font-semibold disabled:opacity-50"
            >
              {isTestingCron ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              <span className="hidden sm:inline">Test Cronjob</span>
            </button>
            <button 
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200 text-xs font-semibold"
            >
              <Info className="size-4" />
              <span className="hidden sm:inline">Panduan Cron</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-24 scroll-smooth">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {DAYS.map(day => {
                  const schedule = getScheduleForDay(day.id)
                  const themeData = schedule ? THEMES.find(t => t.id === schedule.theme || t.label === schedule.theme) : null
                  const ThemeIcon = themeData?.icon || CalendarClock
                  
                  return (
                    <div 
                      key={day.id}
                      onClick={() => openModalForDay(day.id, day.label)}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer ${
                        schedule 
                          ? schedule.is_active 
                            ? 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md' 
                            : 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-transparent border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className="flex items-center p-5 gap-6">
                        {/* Day Indicator */}
                        <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-slate-100 pr-4">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${schedule ? 'text-indigo-600' : 'text-slate-400'}`}>Hari</span>
                          <span className={`text-2xl font-black ${schedule ? 'text-slate-800' : 'text-slate-400'}`}>{day.short}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          {schedule ? (
                            <>
                              <div className="flex items-center gap-4">
                                {themeData && (
                                  <div className={`p-3 rounded-xl ${themeData.bg} ${themeData.color}`}>
                                    <ThemeIcon className="size-6" />
                                  </div>
                                )}
                                <div>
                                  <h3 className="text-base font-bold text-slate-800 mb-1">{themeData?.label || schedule.theme}</h3>
                                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="size-3.5" />
                                      {schedule.time_of_day}
                                    </div>
                                    {schedule.auto_publish && (
                                      <div className="flex items-center gap-1.5 text-emerald-600">
                                        <CheckCircle2 className="size-3.5" />
                                        Auto-Publish
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => toggleActive(e, schedule.id, schedule.is_active)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                    schedule.is_active 
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  }`}
                                >
                                  {schedule.is_active ? 'Matikan' : 'Aktifkan'}
                                </button>
                                <button
                                  onClick={(e) => handleDelete(e, schedule.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-3 text-slate-400 group-hover:text-indigo-600 transition-colors">
                              <Plus className="size-5" />
                              <span className="text-sm font-semibold">Tentukan Tema & Waktu...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>

        {/* Quick Edit Modal (Light Mode) */}
        {activeDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal}></div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl relative z-10 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Setup Siaran {activeDay.label}</h3>
                  <p className="text-xs text-slate-500 mt-1">Pilih tema besar, AI akan secara otomatis memikirkan sub-topiknya.</p>
                </div>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                {/* Theme Selector (replicated from Studio) */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pilih Tema</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {THEMES.map(t => {
                      const Icon = t.icon
                      const isSelected = theme === t.id
                      return (
                        <div
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          className={`flex flex-col items-center justify-center p-3 gap-2 rounded-xl border transition-all text-center cursor-pointer ${
                            isSelected 
                              ? `${t.bg} ${t.border} ring-2 ring-indigo-500/20 shadow-sm` 
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <Icon className={`size-5 ${isSelected ? t.color : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold leading-tight ${isSelected ? t.color : 'text-slate-500'}`}>
                            {t.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Jam Tayang</label>
                    <input 
                      type="time" 
                      value={timeOfDay}
                      onChange={e => setTimeOfDay(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-center h-full pt-6">
                    <div className="relative flex items-start">
                      <div className="flex h-6 items-center">
                        <input
                          id="auto-publish"
                          type="checkbox"
                          checked={autoPublish}
                          onChange={e => setAutoPublish(e.target.checked)}
                          className="size-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="auto-publish" className="font-bold text-slate-700 cursor-pointer">Auto Publish</label>
                        <p className="text-[10px] text-slate-500 font-medium">Unggah ke YouTube setelah selesai.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !theme}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3.5 text-sm font-bold transition-all shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    Simpan Jadwal {activeDay.label}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cron Guide Modal (Light Mode) */}
        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowGuide(false)}></div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg relative z-10 animate-in zoom-in-95 duration-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center size-10 rounded-xl bg-indigo-50 text-indigo-600">
                    <CalendarClock className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Cron Endpoint URL</h3>
                    <p className="text-sm text-slate-500">Pemantik Waktu Eksternal</p>
                  </div>
                </div>
                <button onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="size-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Sistem otomatisasi memerlukan "pemantik" setiap 15 menit. Anda dapat menggunakan layanan gratis seperti <a href="https://console.cron-job.org" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold">cron-job.org</a> dan mendaftarkan URL berikut:
                </p>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-3">
                  <code className="text-xs font-mono font-bold text-slate-700 truncate">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://[domain-anda]'}/api/cron/tick
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/cron/tick`);
                      alert('Endpoint URL disalin!');
                    }}
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 font-medium">
                  ⚠️ <b>Catatan:</b> Jika Anda menjalankan aplikasi ini secara lokal (localhost), cron-job.org tidak dapat menjangkaunya. Anda harus men-deploy aplikasi ini ke Vercel/VPS terlebih dahulu.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
