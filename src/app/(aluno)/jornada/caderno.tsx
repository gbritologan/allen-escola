import Link from 'next/link'
import { formatDuration } from '@/core/shared/format'

export interface NotaDoCaderno {
  id: string
  body: string
  atSeconds: number | null
  createdAt: string
  aulaTitulo: string
  cursoTitulo: string
  caminho: string
}

export interface AulaSalva {
  id: string
  titulo: string
  cursoTitulo: string
  caminho: string
  duracao: number
}

/**
 * O CADERNO — o que é da pessoa, num lugar só.
 *
 * ─── POR QUE AQUI E NÃO NUMA ABA NOVA ────────────────────────────────────
 *
 * O Gabriel pensou numa sidebar própria para as anotações. A sidebar já tem
 * sete destinos, e um oitavo cobraria atenção de todo mundo, todo dia, para
 * algo que só importa depois que a pessoa já anotou alguma coisa.
 *
 * A Jornada é onde já mora o que é dela — progresso, habilidades, aplicações.
 * Anotação e aula salva são a mesma família: rastro de quem passou. Ficam
 * juntas.
 *
 * ─── O MINUTO É O PRODUTO ────────────────────────────────────────────────
 *
 * Cada anotação leva ao ponto exato do vídeo em que foi escrita (`?t=`). É o
 * que separa um caderno de uma lista de frases soltas: seis meses depois,
 * "reduzir a promessa antes de escolher o arquétipo" não diz nada — mas
 * clicando, a aula abre em 4min12 e o contexto volta inteiro.
 *
 * ─── SEM NADA, NÃO APARECE ───────────────────────────────────────────────
 *
 * Caderno vazio com "você ainda não anotou" é cobrança. Quem não anotou não
 * precisa saber que existe um lugar para anotações que ele não fez — vai
 * descobrir quando anotar.
 */
export function Caderno({
  notas,
  salvas,
}: {
  notas: NotaDoCaderno[]
  salvas: AulaSalva[]
}) {
  if (notas.length === 0 && salvas.length === 0) return null

  return (
    <section className="flex flex-col gap-8 border-t border-line pt-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-title font-light">Meu caderno</h2>
        <p className="text-caption text-ink-4">
          O que você anotou e guardou. Só você vê.
        </p>
      </div>

      {salvas.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Aulas salvas
          </h3>
          <ul className="flex flex-col divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-card)] border border-line">
            {salvas.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.caminho}
                  className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-realce-2)]"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body text-ink-2 transition-colors group-hover:text-ink">
                      {a.titulo}
                    </span>
                    <span className="truncate text-caption text-ink-4">{a.cursoTitulo}</span>
                  </span>
                  <span data-numeric className="shrink-0 text-caption text-ink-4">
                    {formatDuration(a.duracao)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notas.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            Anotações
          </h3>
          <ul className="flex flex-col gap-2">
            {notas.map((n) => (
              <li
                key={n.id}
                className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border border-line px-4 py-3"
              >
                <p className="whitespace-pre-line text-body text-ink-2">{n.body}</p>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-caption text-ink-4">
                  {/* O minuto vem primeiro e é o link: ele é o caminho de
                      volta, e o resto é só contexto para reconhecer. */}
                  <Link
                    href={n.atSeconds !== null ? `${n.caminho}?t=${n.atSeconds}` : n.caminho}
                    className="text-blue-light hover:underline"
                  >
                    {n.atSeconds !== null ? (
                      <span data-numeric>{formatDuration(n.atSeconds)}</span>
                    ) : (
                      'abrir a aula'
                    )}
                  </Link>
                  <span aria-hidden>·</span>
                  <span className="truncate">{n.aulaTitulo}</span>
                  <span aria-hidden>·</span>
                  <span className="truncate">{n.cursoTitulo}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
