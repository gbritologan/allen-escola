import type { ReactNode } from 'react'
import Link from 'next/link'

/**
 * Cabeçalho de seção da área do aluno.
 *
 * O eyebrow não é decoração: ele diz de que tipo é a seção ("continuar",
 * "masterclass", "tema"). Se não tiver o que dizer, não entra.
 */
export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string
  title: ReactNode
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {eyebrow && (
          <span className="text-caption font-medium uppercase tracking-[0.16em] text-ink-3">
            {eyebrow}
          </span>
        )}
        <h2 className="text-title">{title}</h2>
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-label text-ink-3 transition-colors duration-150 hover:text-ink"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
