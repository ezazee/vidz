import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        // Brand StoryZ — dari logo (indigo gelap #12102A + aksen amber #F5A623).
        // Skala 50-950 dipetakan supaya bisa langsung ganti token `indigo-*` yang
        // sudah dipakai di seluruh app (bg-indigo-600, text-indigo-400, dst) tanpa
        // menyentuh struktur JSX-nya.
        brand: {
          50: '#F1F0F8',
          100: '#E1DFF0',
          200: '#C3C0E0',
          300: '#9E9AC9',
          400: '#7A74AD',
          500: '#574F8F',
          600: '#3A3468',
          700: '#262148',
          800: '#1A1730',
          900: '#12102A',
          950: '#0B0A1C',
        },
        // Amber dari titik "cabang" di logo — dipakai sebagai aksen sesekali
        // (badge, highlight, notifikasi), bukan warna primer/CTA utama.
        accent: {
          400: '#F7B84D',
          500: '#F5A623',
          600: '#DB8E0F',
        },
      },
    },
  },
  plugins: [],
}

export default config
