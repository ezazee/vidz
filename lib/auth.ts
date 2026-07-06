// Token auth = SHA-256 hex dari APP_PASSWORD.
// Web Crypto supaya jalan di Edge middleware maupun Node runtime.
export async function authToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD
  if (!password) return null
  const data = new TextEncoder().encode(`storyz:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export const AUTH_COOKIE = 'storyz_auth'
