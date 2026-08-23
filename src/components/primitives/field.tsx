import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Campos do Admin. Superfície opaca — aqui não há nada se movendo por trás,
 * então não há vidro (D-15). O Admin é ferramenta: densidade acima de efeito.
 */
const control =
  'w-full rounded-[var(--radius-control)] border border-line bg-navy-deep px-3.5 text-body ' +
  'text-ink placeholder:text-ink-4 outline-none ' +
  'transition-[border-color,box-shadow] duration-150 ease-[var(--ease-allen)] ' +
  'focus:border-[rgba(76,65,255,0.7)] focus:shadow-[0_0_0_3px_rgba(76,65,255,0.16)] ' +
  'disabled:opacity-50'

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  /** Explica o campo antes do erro acontecer. Melhor que mensagem de erro. */
  hint?: string
  error?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-caption text-ink-4">{hint}</p>}
      {error && (
        <p role="alert" className="text-caption text-critical">
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ className, ...rest }: ComponentPropsWithoutRef<'input'>) {
  return <input className={cn(control, 'h-10', className)} {...rest} />
}

export function Textarea({ className, ...rest }: ComponentPropsWithoutRef<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 py-2.5 leading-relaxed', className)} {...rest} />
}
