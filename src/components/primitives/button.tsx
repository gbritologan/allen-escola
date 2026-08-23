import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Um botão diz exatamente o que acontece. "Continuar", "Publicar",
 * "Marcar como aplicada" — nunca "Enviar", nunca "OK".
 */
type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-strong ' +
  'rounded-[var(--radius-control)] whitespace-nowrap select-none ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-allen)] ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-45'

const variants: Record<Variant, string> = {
  // O azul da Allen é a única cor de ação da plataforma inteira.
  primary:
    'bg-blue text-off-white shadow-[0_10px_30px_-12px_rgba(76,65,255,0.9)] ' +
    'hover:bg-blue-light hover:shadow-[0_14px_36px_-12px_rgba(76,65,255,1)]',
  secondary:
    'bg-navy-soft text-ink border border-line hover:border-line-strong hover:bg-navy-soft/70',
  ghost: 'text-ink-2 hover:text-ink hover:bg-[rgba(243,245,252,0.06)]',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-caption',
  md: 'h-10 px-4 text-label',
  lg: 'h-12 px-6 text-body',
}

interface CommonProps {
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

type ButtonProps = CommonProps & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'children'>

export function Button({ variant = 'primary', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  )
}

type ButtonLinkProps = CommonProps & Omit<ComponentPropsWithoutRef<typeof Link>, 'className' | 'children'>

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  )
}
