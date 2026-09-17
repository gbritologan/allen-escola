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
    <html lang="pt-BR" className={elvon.variable} suppressHydrationWarning>
      <head>
        {/*
          O TEMA É APLICADO ANTES DA PRIMEIRA PINTURA.

          Sem este script, quem escolheu o tema claro veria um flash escuro a
          cada navegação: o HTML chega com o padrão, o React hidrata, e só
          então o tema troca. Meio segundo de tela inteira piscando.

          Isso é pior do que parece para o público que motivou o tema claro:
          quem pediu fundo claro por causa dos olhos é justamente quem menos
          deveria levar um clarão escuro na cara a cada clique.

          Roda síncrono, no <head>, de propósito — é o único lugar que executa
          antes do primeiro frame. Daí o `suppressHydrationWarning` no <html>:
          o atributo muda antes do React olhar, e isso é intencional.

          Sem escolha salva, seguimos o sistema. Quem configurou o computador
          para claro está dizendo algo.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('allen-tema');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'claro':'escuro'}if(t==='claro'){document.documentElement.dataset.tema='claro'}}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
