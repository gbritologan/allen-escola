import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente com service role. **Ignora RLS.**
 *
 * Use apenas onde não existe usuário para autorizar: webhooks do provedor de
 * vídeo, rotinas administrativas, jobs. Nunca em resposta a uma requisição de
 * aluno — se você precisou dele para ler algo do aluno, a política está errada.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.')

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
