'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Marca } from '@/components/brand/marca'

/**
 * Quando algo quebra de verdade.
 *
 * Sem este arquivo, uma exceção não tratada mostrava a tela de erro padrão do
 * Next — em produção, uma página branca com "Application error: a client-side
 * exception has occurred". Para quem pagou, isso é o produto morrendo na mão.
 *
 * `reset()` tenta renderizar de novo sem recarregar a página. Muitas falhas
 * são de uma requisição só, e tentar de novo resolve — o que evita a pessoa
 * perder onde estava.
 *
 * A mensagem técnica NÃO aparece. Ela não ajuda quem está do outro lado e pode
 * vazar nome de tabela ou de coluna.
 */
export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // O digest é o que liga esta tela à linha correspondente no log da Vercel.
    console.error('Erro na Allen Escola:', error.digest ?? error.message)
  }, [error])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-6">
      <Marca size={26} />
      <div className="flex flex-col gap-3">
        <h1 className="text-display font-light">Alguma coisa quebrou.</h1>
        <p className="text-body text-ink-3">
          O erro é nosso, não seu. Seu progresso e suas aplicações estão salvos.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-[var(--radius-control)] border border-line px-4 py-2.5 text-label text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          Tentar de novo
        </button>
        <Link href="/" className="text-label text-ink-4 hover:text-ink">
          Voltar ao início
        </Link>
      </div>
      {error.digest && (
        <p className="text-caption text-ink-4">
          Se for falar com a gente, mencione este código: <span data-numeric>{error.digest}</span>
        </p>
      )}
    </main>
  )
}
