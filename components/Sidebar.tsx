'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Film,
  WandSparkles,
  Library,
  LayoutDashboard,
  Plug,
  CalendarClock,
  X
} from 'lucide-react'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  // Helper untuk mengecek apakah menu aktif
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    if (path === '/library') {
      return pathname === '/library' || pathname.startsWith('/projects')
    }
    return pathname.startsWith(path)
  }

  const menuItems = [
    {
      label: 'Analytics Dashboard',
      href: '/',
      icon: LayoutDashboard,
      active: isActive('/') && !pathname.startsWith('/studio') && !pathname.startsWith('/library') && !pathname.startsWith('/integrations'),
    },
    {
      label: 'AI Video Studio',
      href: '/studio',
      icon: WandSparkles,
      active: isActive('/studio'),
    },
    {
      label: 'Video Library',
      href: '/library',
      icon: Library,
      active: isActive('/library'),
    },
    {
      label: 'Integrations',
      href: '/integrations',
      icon: Plug,
      active: isActive('/integrations'),
    },
    {
      label: 'Automation',
      href: '/schedule',
      icon: CalendarClock,
      active: isActive('/schedule'),
    },
  ]

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-slate-900 text-slate-100 border-r border-slate-800">
      <div className="flex flex-col">
        {/* Header Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Film className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none tracking-wide text-white">StoryZ</h1>
              <p className="text-xs text-slate-400 mt-1">AI Video Studio</p>
            </div>
          </div>
          {onClose && (
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white md:hidden transition-colors"
              aria-label="Tutup Menu"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <Link
                key={index}
                href={item.href}
                onClick={onClose}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  item.active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="rounded-lg bg-slate-800/40 p-3.5 border border-slate-800/80">
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block">Render Engine</span>
          <span className="text-xs font-semibold text-slate-200 mt-1 block">GitHub Parallel Matrix</span>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-400">8 runner active</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar (Fixed Sidebar) */}
      <aside className="hidden md:flex w-64 flex-col shrink-0 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/60 backdrop-blur-sm">
          <aside className="w-64 h-full shadow-2xl flex flex-col shrink-0 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
          <div className="flex-1" onClick={onClose} />
        </div>
      )}
    </>
  )
}
