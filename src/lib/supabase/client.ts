import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente do navegador — só para as ilhas cliente (player, marcação de
 * aplicação, busca). Respeita RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
