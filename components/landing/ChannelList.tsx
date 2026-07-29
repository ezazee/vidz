'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { LANDING_CHANNELS } from './content'

/**
 * Tiga channel sebagai baris ber-indent beda — bukan grid kartu setara
 * (pola itu justru yang ditandai audit sebagai tell paling dikenali).
 *
 * Satu entrance orkestrasi saja, sekali jalan, lalu diam — bukan fade-up
 * di setiap elemen. Reduced-motion → tampil langsung tanpa geser.
 */
export default function ChannelList() {
  const reduced = useReducedMotion()

  return (
    <section className="channels">
      <div className="shell">
        <h2 className="section__title">Tiga channel, satu mesin</h2>
        <div className="channels__list">
          {LANDING_CHANNELS.map((channel, i) => (
            <motion.article
              className="channel"
              key={channel.name}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-12% 0px' }}
              transition={{
                duration: reduced ? 0.15 : 0.42,
                ease: [0.16, 1, 0.3, 1],
                delay: reduced ? 0 : i * 0.06,
              }}
            >
              <h3 className="channel__name">{channel.name}</h3>
              <p className="channel__line">{channel.line}</p>
              <p className="channel__meta">{channel.meta}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
