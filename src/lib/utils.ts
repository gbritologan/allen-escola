import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * `cn` — a convenção do shadcn/ui.
 *
 * O nome e a assinatura importam: 21st.dev, Cult UI e Skiper UI publicam
 * componentes que fazem `import { cn } from '@/lib/utils'`. Manter o contrato
 * idêntico é o que permite colar um componente e ele funcionar — sem que a
 * Allen precise adotar o tema do shadcn (ver ponte de tokens em globals.css).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
