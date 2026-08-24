import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Athena } from '@/components/backgrounds/athena'
import { Aurora } from '@/components/backgrounds/aurora'
import { Assinatura } from '@/components/brand/marca'
import { GlassPanel } from '@/components/surfaces/glass-panel'
import { getSession } from '@/lib/auth/session'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Entrar' }

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>
}) {
  const session = await getSession()
  if (session) redirect('/')

  const { destino } = await searchParams
  const destination = destino?.startsWith('/') && !destino.startsWith('//') ? destino : '/'

  return (
    <main className="relative min-h-dvh overflow-hidden bg-navy-deep">
      {/* --- Fundo: três camadas ------------------------------------------
          1. aurora animada (shader), 2. poeira de estrelas, 3. vinheta que
          devolve o contraste ao texto. Nesta ordem, e só nesta ordem. */}
      {/* A parte luminosa da aurora fica no topo do próprio canvas. Descendo o
          canvas, a luz cai exatamente na faixa onde o cartão de vidro vive —
          e vidro sem luz atrás é só um retângulo escuro. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[6vh] h-[94vh]"
        style={{
          // Máscara em style inline, não em classe: a borda do canvas precisa
          // sumir de verdade, e um utilitário que não compile deixa uma linha
          // reta atravessando a tela.
          maskImage:
            'linear-gradient(180deg, transparent 0%, #000 24%, #000 70%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, #000 24%, #000 70%, transparent 100%)',
        }}
      >
        <Aurora className="size-full" amplitude={1.15} blend={0.62} />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(1px_1px_at_18%_24%,rgba(243,245,252,0.5),transparent),radial-gradient(1px_1px_at_72%_58%,rgba(243,245,252,0.35),transparent),radial-gradient(1px_1px_at_41%_81%,rgba(243,245,252,0.4),transparent),radial-gradient(1.5px_1.5px_at_86%_16%,rgba(243,245,252,0.3),transparent),radial-gradient(1px_1px_at_9%_62%,rgba(243,245,252,0.3),transparent)] [background-repeat:no-repeat]"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,20,0.35)_0%,rgba(5,7,20,0.75)_45%,var(--color-navy-deep)_88%)]"
      />

      {/* --- Conteúdo ------------------------------------------------------ */}
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-between gap-16 px-6 py-10 lg:py-16">
        <header>
          <Assinatura variant="azul" size={26} glow />
        </header>

        <div className="grid flex-1 items-center gap-14 lg:grid-cols-[1.15fr_minmax(0,380px)] lg:gap-20">
          {/* A tipografia é o argumento: Thin gigante, uma palavra em ExtraBold.
              Uma família só. O contraste vem do peso. */}
          {/* O invólucro é `relative` no celular e `static` daí para cima —
              e isso é o que reposiciona a Athena sem duplicar o canvas.
              Elemento absoluto se ancora no ancestral posicionado mais
              próximo: no celular, este bloco; no desktop, o <main>.
              Sem transform aqui: elemento transformado também vira âncora, e
              a animação do título arrastaria a figura junto. */}
          <div className="relative sm:static">
            {/* ATHENA.
                No desktop ela é fundo: grande, difusa, e o cartão de vidro
                pousa sobre o peitoral dela.

                No celular isso não funcionava. A tela é estreita, o cartão
                ocupa a metade de baixo inteira, e ela ficava atrás dele — do
                busto para baixo, invisível. Aqui ela sai do fundo e vem para o
                lado do título, no espaço vazio à direita de "Escola de" e
                "corporativas", que era o único lugar da tela sem nada.

                A opacidade é a do celular (0.42); no desktop o CSS a reduz
                para os mesmos 0.26 de antes. Uma instância só, um contexto
                WebGL só. */}
            <Athena
              opacity={0.42}
              className="-top-[26%] -right-[22%] h-[164%] w-[82%] opacity-100 sm:top-[2vh] sm:right-[-8%] sm:h-[112vh] sm:w-[88%] sm:opacity-[0.62] lg:top-[-4vh] lg:right-[-2%] lg:h-[122vh] lg:w-[62%]"
            />

            <div className="relative flex flex-col gap-7 animate-[var(--animate-rise)]">
              {/* Thin (100) só ganha corpo acima de ~44px. No celular o mesmo
                  texto vai em Light (300), senão a haste some na tela. */}
              <h1 className="max-w-[13ch] text-[clamp(2.75rem,7.5vw,5.25rem)] font-light leading-[0.94] tracking-[-0.045em] text-ink sm:font-hair">
                Escola de <span className="font-heavy tracking-[-0.055em]">habilidades</span>{' '}
                corporativas
              </h1>
              <p className="max-w-[42ch] text-lead font-light text-ink-2">
                A arena, não a arquibancada.
              </p>
            </div>
          </div>

          <div className="relative">
            {/* Orb de cor atrás do vidro — técnica do Allen Hub. É o que
                transforma o painel em vidro fosco colorido em vez de superfície
                translúcida. Fica atrás, nunca é visto direto. */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-10 -z-10 size-72 rounded-full opacity-80 blur-[2px] [background:radial-gradient(circle_at_35%_30%,rgba(90,150,255,0.95),rgba(0,13,255,0.6)_42%,rgba(20,40,160,0.15)_70%,transparent_78%)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -left-16 -z-10 size-64 rounded-full opacity-70 [background:radial-gradient(circle_at_40%_35%,rgba(120,110,255,0.9),rgba(60,60,220,0.45)_45%,transparent_75%)]"
            />

            {/* O cartão entra 120ms depois do título: a página se monta em ordem
                de leitura, não tudo de uma vez. */}
            <GlassPanel className="p-7 animate-[var(--animate-rise)] [animation-delay:120ms]">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-title font-strong text-ink">Entrar</h2>
                  <p className="text-label text-ink-3">
                    Sem senha. Enviamos um código para o seu e-mail.
                  </p>
                </div>
                <LoginForm destination={destination} />
              </div>
            </GlassPanel>
          </div>
        </div>

        <footer className="text-caption font-light tracking-[0.14em] text-ink-4 uppercase">
          allenescola.com
        </footer>
      </div>
    </main>
  )
}
