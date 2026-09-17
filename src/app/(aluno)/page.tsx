import { BlocosDaHome } from '@/components/domain/blocos-da-home'
import { saudacao } from '@/core/home/saudacao'
import { requireSession } from '@/lib/auth/session'
import { getBanner, getBoasVindas, getEmBreve, getHomeBlocks } from '@/lib/data/home'

/**
 * A HOME DA JORNADA.
 *
 * Não é "meus cursos". Ela responde, nesta ordem: onde eu estou, o que eu
 * estava fazendo, o que posso aprender.
 *
 * Esta página só BUSCA. A ordem dos blocos vem de `resolveHome()` no domínio
 * (D-18) e o desenho vem de `BlocosDaHome` — que existe separado para que
 * `/design/inicio` possa mostrar a mesma tela com dados de mentira, já que a
 * Home de verdade mora atrás do login.
 */
export default async function HomePage() {
  const session = await requireSession()

  const [blocks, banner, emBreve, boasVindas] = await Promise.all([
    getHomeBlocks(session.userId),
    getBanner(),
    getEmBreve(),
    getBoasVindas(session.userId),
  ])

  return (
    <BlocosDaHome
      saudacao={saudacao(session.profile?.fullName ?? session.email)}
      banner={banner}
      boasVindas={boasVindas}
      blocks={blocks}
      emBreve={emBreve}
    />
  )
}
