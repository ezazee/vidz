import { z } from 'zod'

const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional())
const optionalUrl = z.preprocess((value) => (value === '' ? undefined : value), z.string().url().optional())

const envSchema = z.object({
  DATABASE_URL: optionalUrl,
  GITHUB_TOKEN: optionalString,
  GITHUB_REPO: optionalString,
  API_SECRET: optionalString,
  API_BASE_URL: optionalUrl,
  NINE_ROUTER_BASE_URL: optionalUrl,
  NINE_ROUTER_API_KEY: optionalString,
  BLOB_READ_WRITE_TOKEN: optionalString,
  AI_BASE_URL: optionalUrl,
  AI_API_KEY: optionalString,
  AI_MODEL: optionalString,
  IMAGE_MODEL: optionalString,
  ELEVENLABS_API_KEY: optionalString,
  TTS_VOICE: optionalString,
})

export function getEnv() {
  return envSchema.parse(process.env)
}

// ponytail: lazy parse so dotenv loads before first access
export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_, key: string) {
    return getEnv()[key as keyof z.infer<typeof envSchema>]
  }
})
