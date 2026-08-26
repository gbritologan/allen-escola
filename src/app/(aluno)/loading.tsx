import { Skeleton } from '@/components/primitives/skeleton'

/**
 * O QUE APARECE ENQUANTO A PRÓXIMA TELA CARREGA.
 *
 * Este arquivo não existia, e a falta dele custava duas coisas de uma vez.
 *
 * A primeira é a que se sente: clicar na sidebar e não acontecer NADA até o
 * servidor responder. A tela antiga fica parada, congelada, e a pessoa não
 * sabe se o clique pegou. É isso que faz um produto parecer "duro" — não a
 * falta de animação, mas a ausência de resposta.
 *
 * A segunda é a que explica a lentidão de verdade: o Next só faz prefetch de
 * rota dinâmica ATÉ A FRONTEIRA DE LOADING mais próxima. Sem `loading.tsx`,
 * não existe fronteira, e não existe prefetch. Cada clique começava do zero.
 *
 * O esqueleto tem a forma real do que vem, para o layout não pular quando os
 * dados chegam. A luz azul que atravessa é `sheen`, a primitiva de loading da
 * casa (D-16): nunca spinner, nunca tela branca.
 */
export default function Carregando() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-6 pt-10 sm:pt-14">
      <Skeleton className="h-8 w-52" />

      {[0, 1].map((secao) => (
        <section key={secao} className="flex flex-col gap-4">
          <Skeleton className="h-3 w-40" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-[var(--radius-card)]" />
            ))}
          </div>
        </section>
      ))}
      <span className="sr-only">Carregando</span>
    </main>
  )
}
