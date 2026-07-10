import { neon } from '@neondatabase/serverless'
import { env } from '@/lib/env'

// Multi-channel: 1 Neon database, tiap channel dapat Postgres schema + role terpisah
// (search_path di-set di level ROLE, jadi otomatis terisolasi tanpa perlu SET manual
// per query — lihat migrations/ dan CREATE ROLE brainwhy_role). Default (tanpa channelId)
// tetap pakai DATABASE_URL lama (schema public / Cabang Sejarah) — 100% backward compatible.
const CHANNEL_ENV_MAP: Record<string, keyof typeof env> = {
  brainwhy: 'DATABASE_URL_BRAINWHY',
}

export function getSql(channelId?: string) {
  const envKey = channelId ? CHANNEL_ENV_MAP[channelId] : undefined
  const connectionString = envKey ? env[envKey] : env.DATABASE_URL

  if (!connectionString) {
    throw new Error(`Database connection not configured for channel: ${channelId ?? 'default'}`)
  }

  return neon(connectionString)
}
