import 'server-only'
import { enderecoPublico } from '@/core/shared/url-publica'

/** Ver `core/shared/url-publica` para o porquê. */
export function urlPublica(): string {
  return enderecoPublico(process.env.NEXT_PUBLIC_SITE_URL)
}
