import type { Metadata, Viewport } from 'next'
import { elvon } from '@/design/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Allen Escola',
    template: '%s · Allen Escola',
  },
  description: 'Escola de habilidades corporativas.',
  applicationName: 'Allen Escola',
}

export const viewport: Viewport = {
  themeColor: '#050714',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={elvon.variable}>
      <body>{children}</body>
    </html>
  )
}
