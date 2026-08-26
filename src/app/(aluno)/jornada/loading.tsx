import { Skeleton } from '@/components/primitives/skeleton'

/** A Jornada abre com números e depois lista. O esqueleto segue essa forma. */
export default function CarregandoJornada() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 pt-10 sm:pt-14">
      <Skeleton className="h-8 w-44" />

      <div className="flex gap-8 rounded-[var(--radius-card)] border border-line px-6 py-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <span className="sr-only">Carregando</span>
    </main>
  )
}
