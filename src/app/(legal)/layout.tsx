import Link from 'next/link'
import { Marca } from '@/components/brand/marca'

/**
 * TERMOS E PRIVACIDADE.
 *
 * Fora da casca do aluno de propósito: precisam abrir SEM LOGIN. Quem está
 * decidindo se assina, quem quer conferir o que aceitou, e a própria lei —
 * nenhum dos três deveria precisar de uma conta para ler as regras.
 *
 * Sem sidebar, sem dock, sem ambiente animado. Documento é documento: coluna
 * estreita, fundo quieto, e nada disputando com o texto.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-navy-deep">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" aria-label="Allen Escola">
            <Marca size={20} />
          </Link>
          <div className="flex items-center gap-4 text-caption text-ink-4">
            <Link href="/termos" className="transition-colors hover:text-ink">
              Termos
            </Link>
            <Link href="/privacidade" className="transition-colors hover:text-ink">
              Privacidade
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-line">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <p className="text-caption text-ink-4">
            Allen Escola · Dúvidas sobre estes documentos:{' '}
            <a href="mailto:contato@allenescola.com" className="text-ink-3 hover:text-ink">
              contato@allenescola.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
