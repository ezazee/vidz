import Link from 'next/link'
import BranchStage from '@/components/landing/BranchStage'
import ChannelList from '@/components/landing/ChannelList'
import { PIPELINE, BIBLES, QA_AGENTS } from '@/components/landing/content'
import './landing.css'

export default function LandingPage() {
  return (
    <main className="lp">
      {/* N9 · edge-aligned minimal */}
      <nav className="lp__nav">
        <span className="lp__wordmark">
          <span className="lp__wordmark-dot" aria-hidden="true" />
          StoryZ
        </span>
        <Link className="lp__nav-link" href="/login">
          Masuk
        </Link>
      </nav>

      <BranchStage />

      {/* ── Apa ini ─────────────────────────────────────────── */}
      <section className="what">
        <div className="shell">
          <h2 className="what__lead">Kamu kasih satu topik. Yang keluar video utuh.</h2>
          <div className="what__cols">
            <p className="what__body">
              StoryZ adalah <strong>studio produksi yang berjalan sendiri</strong>. Bukan
              alat bantu edit, bukan generator klip pendek. Kamu memberi satu topik,
              mesinnya meriset, menyusun naskah, menentukan arah visual, membuat gambar
              dan suara, merender, lalu mengunggahnya — tanpa perlu ditunggui.
            </p>
            <p className="what__body">
              Bedanya dari sekadar merangkai model AI: <strong>konsistensi dijaga di
              depan</strong>. Arah visual dikunci sebelum satu gambar pun dibuat, dan tiap
              naskah diperiksa ulang sebelum berubah jadi suara. Video kesepuluh masih
              terasa dari studio yang sama dengan video pertama.
            </p>
            <p className="what__body">
              Satu mesin ini menjalankan tiga channel sekaligus — beda bahasa, beda niche,
              beda platform — tapi kodenya cuma satu.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pipeline ────────────────────────────────────────── */}
      <section className="band">
        <div className="shell band__grid">
          <div className="band__head">
            <h2 className="section__title">Delapan tahap, dari topik ke tayang</h2>
            <p className="section__note">
              Tiap tahap mengunci keputusannya sebelum tahap berikutnya jalan. Kalau satu
              tahap gagal, prosesnya berhenti di situ — bukan lanjut membawa hasil cacat.
            </p>
          </div>
          <ol className="pipeline__list">
            {PIPELINE.map((s) => (
              <li className="pipeline__row" key={s.n}>
                <span className="pipeline__n">{s.n}</span>
                <h3 className="pipeline__name">{s.name}</h3>
                <p className="pipeline__line">{s.line}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Director Engine ─────────────────────────────────── */}
      <section className="band band--raised">
        <div className="shell band__grid">
          <div className="band__head">
            <h2 className="section__title">Arah visual dikunci lebih dulu</h2>
            <p className="section__note">
              Sebelum ada gambar, Director Engine menetapkan enam ketetapan yang dipakai
              seluruh adegan. Ini alasan wajah tokoh dan suasana latar tidak berubah-ubah
              di tengah video.
            </p>
          </div>
          <ul className="engine__list">
            {BIBLES.map((b) => (
              <li className="engine__row" key={b.name}>
                <span className="engine__term">{b.name}</span>
                <p className="engine__def">{b.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── QA ──────────────────────────────────────────────── */}
      <section className="band band--tight">
        <div className="shell band__grid">
          <div className="band__head">
            <h2 className="section__title">Diperiksa sebelum jadi gambar dan suara</h2>
            <p className="section__note">
              Begitu semua adegan selesai ditulis, tiga pemeriksa membacanya ulang dari
              sudut pandang berbeda lalu memperbaiki yang bermasalah. Dibatasi dua putaran
              — cukup untuk membereskan, tidak sampai berputar tanpa henti.
            </p>
          </div>
          <ul className="qa__list">
            {QA_AGENTS.map((a) => (
              <li className="qa__item" key={a.name}>
                <h3 className="qa__name">{a.name}</h3>
                <p className="qa__line">{a.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ChannelList />

      <section className="close">
        <div className="shell">
          <h2 className="close__line">Studionya di balik pintu ini.</h2>
          <Link className="close__cta" href="/login">
            Masuk
            <span className="close__cta-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* Ft2 · inline single line */}
      <footer className="lp__footer shell">
        <span>StoryZ</span>
        <span>Produksi video otomatis, tiga channel, satu mesin.</span>
      </footer>
    </main>
  )
}
