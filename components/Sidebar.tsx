'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  WandSparkles,
  Library,
  ListVideo,
  CalendarRange,
  Radio,
  Workflow,
  X,
} from 'lucide-react'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const MENU = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, group: 'Produksi' },
  { label: 'Studio', href: '/studio', icon: WandSparkles, group: 'Produksi' },
  { label: 'Library', href: '/library', icon: Library, group: 'Produksi' },
  { label: 'Render Queue', href: '/render-queue', icon: ListVideo, group: 'Produksi' },
  { label: 'Content Planner', href: '/planner', icon: CalendarRange, group: 'Perencanaan' },
  { label: 'Channels', href: '/channels', icon: Radio, group: 'Perencanaan' },
  { label: 'Automation', href: '/schedule', icon: Workflow, group: 'Sistem' },
] as const

const GROUPS = ['Produksi', 'Perencanaan', 'Sistem'] as const

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/library') return pathname === '/library' || pathname.startsWith('/projects')
    return pathname === href || pathname.startsWith(href + '/')
  }

  const content = (
    <div className="sb">
      <div className="sb__head">
        <Link href="/dashboard" className="sb__brand" onClick={onClose}>
          <Image src="/logo_icon.png" alt="" width={30} height={30} className="sb__logo" priority />
          <span className="sb__wordmark">StoryZ</span>
        </Link>
        {onClose && (
          <button className="sb__close" onClick={onClose} aria-label="Tutup menu">
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav className="sb__nav">
        {GROUPS.map((group) => (
          <div className="sb__group" key={group}>
            <span className="sb__grouplabel">{group}</span>
            {MENU.filter((m) => m.group === group).map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? 'page' : undefined}
                  className={`sb__link${active ? ' sb__link--active' : ''}`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sb__foot">
        <span className="sb__footlabel">Render engine</span>
        <span className="sb__footvalue">GitHub Actions · matrix</span>
      </div>
    </div>
  )

  return (
    <>
      <aside className="sb__desktop">{content}</aside>

      {isOpen && (
        <div className="sb__overlay" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <aside className="sb__drawer">{content}</aside>
          <button className="sb__scrim" onClick={onClose} aria-label="Tutup menu" />
        </div>
      )}
    </>
  )
}
