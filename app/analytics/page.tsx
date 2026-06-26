'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function AnalyticsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 gap-2">
      <Loader2 className="size-5 animate-spin text-red-500" />
      <span className="text-sm font-medium">Redirecting to home analytics...</span>
    </div>
  )
}
