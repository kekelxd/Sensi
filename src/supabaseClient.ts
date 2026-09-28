import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type ImportMetaWithEnv = ImportMeta & {
  readonly env?: Record<string, string | undefined>
}

let client: SupabaseClient | null | undefined

function readEnv() {
  return (import.meta as ImportMetaWithEnv).env
}

export function readSupabaseConfig() {
  const env = readEnv()
  const url = env?.VITE_SUPABASE_URL?.trim()
  const publishableKey = env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  return url && publishableKey ? { url: url.replace(/\/+$/, ''), publishableKey } : null
}

export function getSupabaseClient() {
  if (client !== undefined) return client
  const config = readSupabaseConfig()
  client = config
    ? createClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
    : null
  return client
}

export function hasSupabaseClient() {
  return getSupabaseClient() !== null
}
