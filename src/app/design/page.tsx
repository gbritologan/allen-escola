import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Button, ButtonLink } from '@/components/primitives/button'
import { Chip, ThemeChip } from '@/components/primitives/chip'
import { ProgressMeter } from '@/components/primitives/progress-meter'
import { Skeleton, SkeletonText } from '@/components/primitives/skeleton'
import { GlassPanel } from '@/components/surfaces/glass-panel'
import { SectionHeader } from '@/components/surfaces/section-header'
import { Surface } from '@/components/surfaces/surface'
import { formatDuration, formatRemaining } from '@/core/shared/format'

export const metadata: Metadata = { title: 'Design system' }

const PALETTE = [
  { name: 'Navy Deep', value: '#050714', use: 'fundo da plataforma' },
  { name: 'Navy', value: '#0A0F2E', use: 'superfícies' },
  { name: 'Navy Soft', value: '#12173D', use: 'superfície elevada' },
  { name: 'Blue', value: '#000DFF', use: 'ação' },
  { name: 'Blue Light', value: '#4C41FF', use: 'estado e foco' },
  { name: 'Off White', value: '#F3F5FC', use: 'texto principal' },
]

const SCALE = [
  { token: 'hero', sample: 'Negociação', className: 'text-hero font-hair' },
  { token: 'display', sample: 'Continue de onde parou', className: 'text-display font-light' },
  { token: 'title', sample: 'Como conduzir uma negociação', className: 'text-title font-light' },
  { token: 'lead', sample: 'O que está em jogo antes da conversa começar.', className: 'text-lead font-light' },
  { token: 'body', sample: 'Texto de corpo, onde a maior parte da leitura acontece.', className: 'text-body' },
  { token: 'label', sample: 'Módulo 02 · Aula 04', className: 'text-label font-medium' },
  { token: 'caption', sample: '12min restantes', className: 'text-caption text-ink-3' },
]

/** Os nove pesos do Elvon. O contraste da marca vive na distância entre eles. */
const WEIGHTS = [
  { name: 'hair', value: 100, className: 'font-hair', use: 'só acima de 44px' },
  { name: 'light', value: 300, className: 'font-light', use: 'títulos e leads' },
  { name: 'regular', value: 400, className: 'font-normal', use: 'corpo' },
  { name: 'medium', value: 500, className: 'font-medium', use: 'rótulos e dados' },
  { name: 'strong', value: 600, className: 'font-strong', use: 'botões e ênfase' },
  { name: 'heavy', value: 800, className: 'font-heavy', use: 'a palavra que carrega' },
]

/**
 * Referência viva do design system (Fase 2).
 *
 * Fora do ar em produção: é ferramenta de equipe, não página do produto.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-20 px-6 py-20">
      <header className="flex flex-col gap-4">
        <span className="text-caption uppercase tracking-[0.16em] text-ink-3">
          Allen Escola · Fase 2
        </span>
        <h1 className="text-display font-hair">
          Design <span className="font-heavy">system</span>
        </h1>
        <p className="max-w-[62ch] text-lead">
          Extensão da identidade Allen, não uma identidade nova. Tudo o que a plataforma
          usa está aqui — e nada que não esteja aqui deveria aparecer nela.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        <SectionHeader eyebrow="Cor" title="Paleta" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PALETTE.map((color) => (
            <Surface key={color.value} className="overflow-hidden">
              <div className="h-16" style={{ backgroundColor: color.value }} />
              <div className="flex flex-col gap-0.5 p-3">
                <span className="text-label font-strong text-ink">{color.name}</span>
                <span data-numeric className="text-caption text-ink-3">
                  {color.value}
                </span>
                <span className="text-caption text-ink-4">{color.use}</span>
              </div>
            </Surface>
          ))}
        </div>
        <p className="max-w-[66ch] text-label text-ink-3">
          Os neutros intermediários — <code className="text-ink-2">ink-2 #B9C0DC</code> e{' '}
          <code className="text-ink-2">ink-3 #7E87AB</code> — são derivados do navy. Cinza neutro
          sobre azul-marinho parece sujeira; cinza enviesado parece decisão.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader eyebrow="Tipografia" title="Elvon Grotesk, e só ela" />
        <Surface className="grid grid-cols-2 gap-px overflow-hidden bg-[var(--color-line)] sm:grid-cols-3">
          {WEIGHTS.map((w) => (
            <div key={w.name} className="flex flex-col gap-1 bg-navy p-5">
              <span className={`${w.className} text-[2.5rem] leading-none tracking-[-0.03em] text-ink`}>
                Aa
              </span>
              <span className="text-caption font-medium text-ink-2">{w.name}</span>
              <span data-numeric className="text-caption text-ink-4">
                {w.value} · {w.use}
              </span>
            </div>
          ))}
        </Surface>
        <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
          {SCALE.map((step) => (
            <div key={step.token} className="flex items-baseline gap-6 px-5 py-4">
              <span data-numeric className="w-20 shrink-0 text-caption text-ink-3">
                {step.token}
              </span>
              <span className={step.className}>{step.sample}</span>
            </div>
          ))}
        </Surface>
        <p className="max-w-[66ch] text-label text-ink-3">
          Uma família só, do Thin (100) ao ExtraBold (800). O contraste da Allen não vem de
          misturar tipos: vem da distância entre 100 e 800 dentro do mesmo desenho — mais difícil
          de acertar, e muito mais difícil de imitar. Thin só acima de 44px; abaixo disso a haste
          desaparece na tela.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader eyebrow="Primitivas" title="Ações" />
        <Surface className="flex flex-wrap items-center gap-3 p-6">
          <Button>Continuar</Button>
          <Button variant="secondary">Ver currículo</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button size="lg">Marcar como aplicada</Button>
          <Button size="sm" variant="secondary">
            Publicar
          </Button>
          <Button disabled>Indisponível</Button>
        </Surface>
        <p className="max-w-[66ch] text-label text-ink-3">
          O azul da Allen é a única cor de ação da plataforma inteira. Um botão diz exatamente o
          que acontece: “Publicar”, “Marcar como aplicada” — nunca “Enviar”, nunca “OK”.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader eyebrow="Primitivas" title="Rótulos e progresso" />
        <Surface className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap gap-2">
            <Chip tone="accent">Masterclass</Chip>
            <Chip tone="positive">Publicado</Chip>
            <Chip tone="caution">Sem Para Fazer</Chip>
            <Chip>{formatDuration(4380)}</Chip>
            <ThemeChip href="/design">Inteligência Artificial</ThemeChip>
            <ThemeChip href="/design">Vendas</ThemeChip>
          </div>
          <div className="flex flex-col gap-3">
            <ProgressMeter value={68} showValue label="Progresso em Negociação" />
            <ProgressMeter value={12} showValue label="Progresso em Marketing" />
            <ProgressMeter value={100} showValue label="Progresso em Vendas" />
            <span className="text-caption text-ink-3">{formatRemaining(1800, 1080)}</span>
          </div>
        </Surface>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader eyebrow="Loading" title="Nunca tela branca, nunca spinner" />
        <Surface className="flex flex-col gap-4 p-6">
          <div className="flex gap-4">
            <Skeleton className="h-24 w-40 shrink-0" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-4 w-1/2" />
              <SkeletonText lines={3} />
            </div>
          </div>
        </Surface>
        <p className="max-w-[66ch] text-label text-ink-3">
          O skeleton tem a forma real do conteúdo que vem, para o layout não pular quando os dados
          chegam. A luz azul que atravessa é a primitiva <code className="text-ink-2">sheen</code>.
        </p>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader eyebrow="Superfícies" title="Vidro, com regra escrita" />
        <div className="relative overflow-hidden rounded-[var(--radius-panel)] p-8">
          {/* Vidro só faz sentido quando há algo por baixo que importa. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(420px_240px_at_20%_20%,rgba(0,13,255,0.55),transparent_70%),radial-gradient(380px_220px_at_80%_70%,rgba(76,65,255,0.35),transparent_70%)]"
          />
          <GlassPanel className="relative flex flex-col gap-3 p-6">
            <span className="text-caption uppercase tracking-[0.16em] text-ink-3">
              Controles do player
            </span>
            <p className="max-w-[52ch] text-body text-ink-2">
              Modais, menu de comando, barra mobile, overlay de busca e controles do player. Card
              de curso não é vidro. Página não é vidro.
            </p>
            <div className="flex gap-2">
              <Button size="sm">Continuar</Button>
              <Button size="sm" variant="ghost">
                Materiais
              </Button>
            </div>
          </GlassPanel>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeader eyebrow="Motion" title="Quatro primitivas" />
        <Surface className="flex flex-col divide-y divide-[var(--color-line)]">
          {[
            ['rise', 'entrada de conteúdo · 8px + fade, escalonado 40ms', '240ms'],
            ['sheen', 'loading · luz azul atravessando a superfície', '1400ms'],
            ['settle', 'progresso · alcança o valor e para', '420ms'],
            ['bloom', 'aplicação concluída · glow único que expande e some', '560ms'],
          ].map(([name, use, duration]) => (
            <div key={name} className="flex items-baseline gap-5 px-5 py-4">
              <span className="w-20 shrink-0 text-label font-strong text-ink">
                {name}
              </span>
              <span className="flex-1 text-label text-ink-2">{use}</span>
              <span data-numeric className="text-caption text-ink-3">
                {duration}
              </span>
            </div>
          ))}
        </Surface>
        <p className="max-w-[66ch] text-label text-ink-3">
          Quatro. É isso que faz a plataforma parecer uma coisa só em vez de uma coleção de telas
          animadas. <code className="text-ink-2">prefers-reduced-motion</code> desliga deslocamento
          e loop, mantém opacidade.
        </p>
      </section>

      <footer className="flex flex-col gap-3 border-t border-line pt-8">
        <p className="text-label text-ink-3">
          Fase 2 de 13. Próximas: área do aluno e Content Studio consomem exclusivamente o que
          está nesta página.
        </p>
        <ButtonLink href="/" variant="ghost" size="sm" className="self-start">
          Voltar
        </ButtonLink>
      </footer>
    </main>
  )
}
