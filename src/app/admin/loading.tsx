import { Skeleton } from '@/components/primitives/skeleton'

/**
 * O Studio não tinha NENHUM `loading.tsx`.
 *
 * Era o mesmo buraco que a área do aluno tinha antes de D-41, e custa as
 * mesmas duas coisas: o clique não dá sinal até o servidor responder, e o Next
 * não faz prefetch de rota dinâmica sem uma fronteira de loading — então toda
 * navegação no Studio começava do zero.
 *
 * Pesa mais aqui do que lá: quem administra passa a tarde trocando de tela.
 */
export default function CarregandoStudio() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-10 lg:px-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <span className="sr-only">Carregando</span>
    </div>
  )
}
