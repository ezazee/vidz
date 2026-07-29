'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { LANDING_CHANNELS } from './content'

/**
 * Marquee fold + scroll story.
 *
 * Mark-nya dibangun sebagai geometry 3D asli: satu kurva berbentuk Z di-extrude
 * jadi tabung (TubeGeometry), dipakai ulang oleh TIGA strand yang saat diam
 * hampir berimpit — jadi terbaca sebagai satu tanda. Scroll memisahkan mereka.
 * Tidak ada tekstur logo yang ditempel ke bidang datar.
 *
 * Disiplin motion:
 * · Scroll-scrubbed dipakai karena scroll-nya MENGGERAKKAN narasi (satu mesin →
 *   tiga cerita), bukan dekorasi — pengecualian yang diizinkan motion.md.
 * · Tidak ada auto-rotate: infinite loop dilarang, dan 3D hanya "layak" kalau
 *   bisa disentuh — di sini lewat drag.
 * · prefers-reduced-motion → langsung ke state akhir, tanpa scrub, tanpa drag.
 */

/** Titik pembentuk huruf Z. Titik dekat sudut menjaga belokannya tetap tegas. */
const Z_PATH: ReadonlyArray<readonly [number, number]> = [
  [-1.10, 0.90],
  [1.00, 0.90],
  [1.10, 0.84],
  [-1.00, -0.84],
  [-1.10, -0.90],
  [1.10, -0.90],
]

/** Arah pisah strand — kira-kira tegak lurus terhadap diagonal Z. */
const SPREAD_DIR = new THREE.Vector2(0.633, -0.774)

/** Warna material diambil dari token CSS, bukan hex hardcode — satu sumber
 *  warna untuk halaman dan canvas (disiplin token). */
const STRANDS = [
  { token: '--canvas-strand-a', radius: 0.052, emissiveToken: '--canvas-emissive-cool', emissiveIntensity: 0.25 },
  { token: '--canvas-strand-b', radius: 0.048, emissiveToken: '--canvas-strand-b', emissiveIntensity: 0.42 },
  { token: '--canvas-strand-c', radius: 0.052, emissiveToken: '--canvas-emissive-cool', emissiveIntensity: 0.25 },
] as const

const REST_SPREAD = 0.115
const OPEN_SPREAD = 0.78
const OPEN_DEPTH = 0.55

export default function BranchStage() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const marksRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /** Baca warna dari token CSS halaman (fallback aman kalau token hilang). */
    const styles = getComputedStyle(document.documentElement)
    const token = (name: string, fallback: string) =>
      new THREE.Color(styles.getPropertyValue(name).trim() || fallback)

    /* ── scene ────────────────────────────────────────────── */
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0, 4.6)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    /* ── geometry: satu kurva Z, tiga strand ──────────────── */
    const curve = new THREE.CatmullRomCurve3(
      Z_PATH.map(([x, y]) => new THREE.Vector3(x, y, 0)),
      false,
      'catmullrom',
      0.1,
    )

    const group = new THREE.Group()
    const disposables: Array<{ dispose: () => void }> = []

    const meshes = STRANDS.map((strand) => {
      const geometry = new THREE.TubeGeometry(curve, 260, strand.radius, 14, false)
      const material = new THREE.MeshStandardMaterial({
        color: token(strand.token, '#c9c6e4'),
        emissive: token(strand.emissiveToken, '#1a1730'),
        emissiveIntensity: strand.emissiveIntensity,
        roughness: 0.34,
        metalness: 0.18,
      })
      disposables.push(geometry, material)
      const mesh = new THREE.Mesh(geometry, material)
      group.add(mesh)
      return mesh
    })

    scene.add(group)

    /* ── lighting ─────────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(token('--canvas-ambient', '#b9b4dd'), 0.55))

    const key = new THREE.DirectionalLight(token('--canvas-key', '#fff4e0'), 1.35)
    key.position.set(2.4, 3.0, 3.2)
    scene.add(key)

    const warm = new THREE.PointLight(token('--canvas-warm', '#f5a623'), 14, 12, 2)
    warm.position.set(-1.6, -0.6, 2.2)
    scene.add(warm)

    const cool = new THREE.PointLight(token('--canvas-cool', '#6b62a8'), 8, 12, 2)
    cool.position.set(2.0, 1.2, -1.4)
    scene.add(cool)

    /* ── state ────────────────────────────────────────────── */
    const target = { progress: reduced ? 1 : 0, dragX: 0, dragY: 0 }
    const current = { progress: reduced ? 1 : 0, dragX: 0, dragY: 0 }
    let needsRender = true
    let visible = true
    /* di layar lebar mark digeser ke kanan supaya tidak menumpuk teks kiri */
    let offsetX = 0

    const applyLayout = () => {
      const p = current.progress
      const spread = REST_SPREAD + (OPEN_SPREAD - REST_SPREAD) * p

      meshes.forEach((mesh, i) => {
        const k = i - 1 // -1, 0, 1
        mesh.position.set(
          SPREAD_DIR.x * spread * k,
          SPREAD_DIR.y * spread * k,
          OPEN_DEPTH * p * k,
        )
        mesh.rotation.z = 0.16 * p * k
      })

      // mark mundur & miring sedikit saat terbuka, supaya kedalaman terbaca
      group.rotation.y = current.dragX + 0.42 * p
      group.rotation.x = current.dragY - 0.12 * p
      group.position.x = offsetX
      group.position.z = -0.9 * p
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h

      if (w >= 1024) {
        camera.position.z = 4.1
        offsetX = 1.35
      } else if (w >= 720) {
        camera.position.z = 4.9
        offsetX = 0.9
      } else {
        // layar sempit: mark di tengah, jadi latar di belakang teks
        camera.position.z = 6.2
        offsetX = 0
      }

      camera.updateProjectionMatrix()
      needsRender = true
    }

    /* ── drag: inilah yang membuat 3D layak dipakai ───────── */
    let dragging = false
    let lastX = 0
    let lastY = 0

    const onPointerDown = (e: PointerEvent) => {
      if (reduced) return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      canvas.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      target.dragX += (e.clientX - lastX) * 0.006
      target.dragY += (e.clientY - lastY) * 0.004
      target.dragY = Math.max(-0.5, Math.min(0.5, target.dragY))
      lastX = e.clientX
      lastY = e.clientY
      needsRender = true
    }

    const onPointerUp = (e: PointerEvent) => {
      dragging = false
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    /* ── render loop: hanya saat ada perubahan ────────────── */
    let raf = 0
    const EPS = 0.0002

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible) return

      const dp = target.progress - current.progress
      const dx = target.dragX - current.dragX
      const dy = target.dragY - current.dragY

      if (Math.abs(dp) > EPS || Math.abs(dx) > EPS || Math.abs(dy) > EPS) {
        current.progress += dp * 0.12
        current.dragX += dx * 0.14
        current.dragY += dy * 0.14
        needsRender = true
      }

      if (needsRender) {
        applyLayout()
        renderer.render(scene, camera)
        needsRender = false
      }
    }

    /* ── scroll: menggerakkan cerita, bukan hiasan ────────── */
    const ctx = gsap.context(() => {
      if (reduced) return
      gsap.registerPlugin(ScrollTrigger)

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate: (self) => {
          target.progress = self.progress
          needsRender = true
        },
      })

      gsap.to(titleRef.current, {
        opacity: 0,
        y: -24,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '42% top',
          scrub: 0.6,
        },
      })

      gsap.fromTo(
        marksRef.current,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: '46% top',
            end: '72% top',
            scrub: 0.6,
          },
        },
      )
    }, section)

    /* ── observers ────────────────────────────────────────── */
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) needsRender = true
      },
      { rootMargin: '120px' },
    )
    io.observe(canvas)

    resize()
    applyLayout()
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ctx.revert()
      ro.disconnect()
      io.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <section className="stage" ref={sectionRef}>
      <div className="stage__pin">
        <canvas className="stage__canvas" ref={canvasRef} aria-hidden="true" />

        <div className="shell">
          <div className="stage__copy" ref={titleRef}>
            <h1 className="stage__title">
              Satu mesin.
              <br />
              <span className="stage__title-accent">Tiga cerita.</span>
            </h1>
            <p className="stage__hint">Tarik marknya · gulir untuk membelah</p>
          </div>
        </div>

        <div className="stage__marks-wrap">
          <ul className="stage__marks shell" ref={marksRef}>
            {LANDING_CHANNELS.map((c) => (
              <li className="stage__mark" key={c.name}>
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
