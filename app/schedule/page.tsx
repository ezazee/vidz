'use client'

import AppShell from '@/components/AppShell'
import '../app.css'

/**
 * Automation — cerminan jadwal yang SEBENARNYA jalan, yaitu tiga workflow n8n.
 *
 * Scheduler internal lama (tabel auto_schedules + /api/cron/tick) sudah tidak
 * dipakai: tidak ada cron yang memanggil endpoint itu, dan n8n yang memegang
 * jadwal produksi. Halaman ini sengaja READ-ONLY — mengubah jadwal dilakukan di
 * n8n, supaya tidak ada dua sumber kebenaran yang bisa berbeda.
 */

interface Workflow {
  channel: string
  window: string
  platform: 'YouTube' | 'Facebook'
  file: string
}

const WORKFLOWS: Workflow[] = [
  {
    channel: 'Cabang Sejarah',
    window: '08:30 – 09:20',
    platform: 'YouTube',
    file: 'Cabang Sejarah - Automation.json',
  },
  {
    channel: 'BrainWhy',
    window: '10:20 – 11:10',
    platform: 'YouTube',
    file: 'BrainWhy - Automation.json',
  },
  {
    channel: 'Cerita Tetangga',
    window: '12:10 – 13:00',
    platform: 'Facebook',
    file: 'Cerita Tetangga - Automation.json',
  },
]

const TRIGGERS = [
  {
    cron: '0 8 * * 1-6',
    label: 'Produksi harian',
    note: 'Senin–Sabtu. Memilih topik, mengirim pengingat Telegram, lalu menunggu jam produksi channelnya.',
  },
  {
    cron: '0 9 * * 0',
    label: 'Evaluasi mingguan',
    note: 'Minggu. Menilai performa lalu menyusun rencana topik untuk minggu berikutnya.',
  },
  {
    cron: '0 3 * * *',
    label: 'Bersih-bersih aset',
    note: 'Setiap hari. Menghapus berkas render yang sudah tidak dipakai.',
  },
]

export default function AutomationPage() {
  return (
    <AppShell title="Automation" subtitle="Jadwal produksi yang dijalankan n8n">
      <section className="card">
        <h2 className="card__title">Jadwal dipegang n8n, bukan aplikasi ini</h2>
        <p className="card__note">
          Tiga workflow terpisah menjalankan produksi tiap channel. Halaman ini hanya
          menampilkan konfigurasinya — untuk mengubah jadwal, sunting workflow-nya langsung di
          n8n supaya tidak ada dua sumber kebenaran yang bisa berbeda.
        </p>
      </section>

      <section className="card card--flush">
        <div className="card__head" style={{ padding: 'var(--space-md)', marginBottom: 0 }}>
          <div>
            <h2 className="card__title">Jendela produksi per channel</h2>
            <p className="card__note">
              Jam produksi diacak di dalam jendela masing-masing, dan antar channel dijamin
              berjarak minimal 60 menit supaya render tidak saling berebut runner.
            </p>
          </div>
        </div>

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Channel</th>
                <th className="table__num">Jendela produksi</th>
                <th>Platform</th>
                <th>Berkas workflow</th>
              </tr>
            </thead>
            <tbody>
              {WORKFLOWS.map((w) => (
                <tr key={w.channel}>
                  <td className="table__strong">{w.channel}</td>
                  <td className="table__num mono">{w.window}</td>
                  <td>
                    <span className="badge badge--muted">{w.platform}</span>
                  </td>
                  <td>
                    <span className="mono">{w.file}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card card--flush">
        <div className="card__head" style={{ padding: 'var(--space-md)', marginBottom: 0 }}>
          <div>
            <h2 className="card__title">Pemicu terjadwal</h2>
            <p className="card__note">Tiga cron yang ada di setiap workflow.</p>
          </div>
        </div>

        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cron</th>
                <th>Pemicu</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {TRIGGERS.map((t) => (
                <tr key={t.cron}>
                  <td>
                    <span className="mono">{t.cron}</span>
                  </td>
                  <td className="table__strong">{t.label}</td>
                  <td>{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Scheduler lama sudah dipensiunkan</h2>
        <p className="card__note">
          Versi sebelumnya memakai tabel <span className="mono">auto_schedules</span> dengan
          endpoint <span className="mono">/api/cron/tick</span>. Tidak ada cron yang memanggil
          endpoint itu, jadi jadwalnya tidak pernah benar-benar jalan. Kode dan tabelnya
          dibiarkan utuh — hanya tidak lagi ditampilkan sebagai fitur di sini.
        </p>
      </section>
    </AppShell>
  )
}
