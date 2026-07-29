'use client'

import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

interface AppShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

/**
 * Shell aplikasi: sidebar + topbar + area konten.
 * Semua halaman aplikasi memakai ini — shell tidak boleh berbeda antar halaman
 * (lihat design.md § Yang WAJIB sama di semua halaman).
 */
export default function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="ap">
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="ap__body">
        <header className="ap__topbar">
          <div className="ap__topbar-left">
            <button
              className="ap__burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Buka menu"
            >
              <Menu className="size-4" />
            </button>
            <div className="truncate">
              <h1 className="ap__title">{title}</h1>
              {subtitle && <p className="ap__subtitle">{subtitle}</p>}
            </div>
          </div>

          {actions && <div className="ap__topbar-right">{actions}</div>}
        </header>

        <main className="ap__main">{children}</main>
      </div>
    </div>
  )
}
