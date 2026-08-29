import Link from 'next/link'
import { Marca } from '@/components/brand/marca'
import { fraseDoAcesso, porExtenso, type Acesso } from '@/core/identity/acesso'

/**
 * O QUE A PESSOA VÊ QUANDO O ACESSO NÃO ESTÁ VALENDO.
 *
 * Sem isto, quem entra antes da data combinada vê o produto inteiro VAZIO: a
 * RLS esconde os cursos, e a Home mostra "nenhum curso", o Mapa mostra um céu
 * sem estrelas, a Busca não acha nada. Tudo tecnicamente correto, e tudo
 * parecendo defeito.
 *
 * Uma pessoa que pagou e vê um produto vazio não conclui "meu acesso começa
 * dia 1º". Conclui que comprou algo quebrado — e escreve para o suporte no
 * mesmo minuto.
 *
 * Então a tela diz a data, em vez de deixar a ausência falar.
 */
export function SalaDeEspera({ acesso, nome }: { acesso: Acesso; nome: string }) {
  const primeiroNome = nome.trim().split(' ')[0]

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-8 px-6 py-16">
      <Marca size={28} />

      <div className="flex flex-col gap-3">
        <h1 className="text-display font-light">
          {acesso.estado === 'aguardando'
            ? `Tudo pronto, ${primeiroNome}.`
            : acesso.estado === 'encerrado'
              ? 'Seu acesso terminou.'
              : 'Seu acesso está pausado.'}
        </h1>
        <p className="text-lead font-light text-ink-2">{fraseDoAcesso(acesso)}</p>
      </div>

      {acesso.estado === 'aguardando' && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line px-6 py-5">
          <p className="text-body text-ink-3">
            Você está na turma fundadora. No dia {porExtenso(acesso.inicio)} a plataforma abre
            para você aqui mesmo, com este mesmo e-mail — não precisa fazer nada até lá.
          </p>
          {acesso.fim && (
            <p className="text-caption text-ink-4">
              Seu ano vai até {porExtenso(acesso.fim)}.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Link href="/suporte" className="text-label text-blue-light hover:underline">
          Falar com a gente
        </Link>
        <form action="/sair" method="post">
          <button type="submit" className="text-label text-ink-4 transition-colors hover:text-ink">
            Sair
          </button>
        </form>
      </div>
    </main>
  )
}
