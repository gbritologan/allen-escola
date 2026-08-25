'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Astro, Mapa } from '@/core/mapa/layout'
import { ruido } from '@/core/mapa/layout'

/**
 * O CÉU.
 *
 * Canvas, não SVG nem divs: são centenas de pontos que se movem juntos a cada
 * quadro de pan, zoom e cintilação. Em DOM isso vira centenas de elementos
 * recalculando layout; em canvas é um laço de desenho.
 *
 * A regra que o desenho obedece, e que vem de `core/mapa/layout.ts`: estrela
 * acende com APLICAÇÃO. Assistir deixa cinza. O céu é o retrato do que a
 * pessoa fez, e é impossível simular deixando vídeo rodando.
 *
 * O que fica em `useRef` e o que fica em `useState` é decisão de desempenho:
 * pan e zoom mudam sessenta vezes por segundo e vivem em ref, fora do React.
 * Só o que a interface precisa mostrar — quem está selecionado, o zoom escrito
 * no canto — passa por estado.
 */

const COR = {
  rotulo: '#b9c0dc',
  rotuloForte: '#f3f5fc',
}

/**
 * A COR CARREGA DUAS INFORMAÇÕES AO MESMO TEMPO.
 *
 * O MATIZ diz de que constelação a estrela é. A SATURAÇÃO e o BRILHO dizem em
 * que estado ela está. Um só canal não daria conta das duas, e usar duas
 * escalas de cor independentes viraria papagaio.
 *
 * O efeito colateral é o melhor da ideia: apagado fica quase neutro e aceso
 * fica no tom cheio. A constelação GANHA cor ao ser feita.
 */
function corDoAstro(hue: number, estado: string, realce = false): string {
  if (estado === 'aceso') return `hsl(${hue} 82% ${realce ? 74 : 64}%)`
  if (estado === 'visto') return `hsl(${hue} 22% ${realce ? 72 : 60}%)`
  return `hsl(${hue} 14% ${realce ? 48 : 34}%)`
}

const ZOOM_MIN = 0.18
const ZOOM_MAX = 2.6

export function Ceu({ mapa, temas }: { mapa: Mapa; temas: Astro[] }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Câmera fora do React: muda a cada quadro.
  const cam = useRef({ x: 0, y: 0, z: 0.5 })
  const alvo = useRef({ x: 0, y: 0, z: 0.5 })
  const ponteiro = useRef({ x: -9999, y: -9999, arrastando: false, moveu: false })
  const hoverId = useRef<string | null>(null)

  const [selecionado, setSelecionado] = useState<Astro | null>(null)
  const [zoomLido, setZoomLido] = useState(50)
  const [busca, setBusca] = useState('')
  const [temaAtual, setTemaAtual] = useState(0)

  const porId = useMemo(() => new Map(mapa.astros.map((a) => [a.id, a])), [mapa])

  /** Estrelas de fundo: fixas, geradas uma vez, sem relação com o catálogo. */
  const poeira = useMemo(
    () =>
      Array.from({ length: 220 }, (_, i) => ({
        x: ruido(`p${i}x`, 2600),
        y: ruido(`p${i}y`, 2000),
        r: 0.4 + Math.abs(ruido(`p${i}r`, 0.9)),
        o: 0.12 + Math.abs(ruido(`p${i}o`, 0.34)),
        f: Math.abs(ruido(`p${i}f`, 6)),
      })),
    [],
  )

  const irPara = useCallback((x: number, y: number, z: number) => {
    alvo.current = { x, y, z: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) }
  }, [])

  const ajustar = useCallback(() => {
    const el = wrap.current
    if (!el) return
    const { minX, minY, maxX, maxY } = mapa.limites
    const larg = maxX - minX
    const alt = maxY - minY
    // A folga é maior na vertical porque o rótulo do tema fica ACIMA da
    // estrela e não entra nos limites — sem isso a constelação de cima
    // aparece decapitada.
    const z = Math.min(el.clientWidth / (larg + 220), el.clientHeight / (alt + 340))
    irPara((minX + maxX) / 2, (minY + maxY) / 2, z)
  }, [mapa.limites, irPara])

  useEffect(() => {
    ajustar()
  }, [ajustar])

  // Esc fecha o painel e devolve a visão do céu inteiro. Sem isto, quem
  // aproximou demais só volta arrastando às cegas.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setSelecionado(null)
      ajustar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [ajustar])

  // --- Desenho ------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const el = wrap.current
    if (!canvas || !el) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0

    function medir() {
      if (!canvas || !el) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = el.clientWidth * dpr
      canvas.height = el.clientHeight * dpr
      canvas.style.width = `${el.clientWidth}px`
      canvas.style.height = `${el.clientHeight}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)



    function desenhar(ms: number) {
      frame = requestAnimationFrame(desenhar)
      if (!canvas || !el) return
      const L = el.clientWidth
      const A = el.clientHeight
      const t = ms * 0.001

      /**
       * A CÂMERA VIAJA, NÃO TELEPORTA.
       *
       * Sem a viagem, clicar numa constelação recorta a tela e a pessoa perde
       * a noção de onde estava — o mapa deixa de ser um lugar. Com ela, o
       * olho acompanha o percurso e aprende a geografia.
       *
       * O zoom interpola em ESCALA LOGARÍTMICA. Interpolar o número direto faz
       * a aproximação começar violenta e terminar arrastada, porque ir de 0,4
       * para 0,8 é o mesmo salto perceptivo que de 0,8 para 1,6 — e em linear
       * o segundo trecho leva o dobro do tempo.
       */
      const c = cam.current
      const al = alvo.current
      const passo = 0.085
      c.x += (al.x - c.x) * passo
      c.y += (al.y - c.y) * passo
      c.z = Math.exp(Math.log(c.z) + (Math.log(al.z) - Math.log(c.z)) * passo)

      const paraTela = (x: number, y: number): [number, number] => [
        (x - c.x) * c.z + L / 2,
        (y - c.y) * c.z + A / 2,
      ]

      ctx!.clearRect(0, 0, L, A)

      // --- poeira ---------------------------------------------------------
      for (const p of poeira) {
        const [sx, sy] = paraTela(p.x, p.y)
        if (sx < -20 || sx > L + 20 || sy < -20 || sy > A + 20) continue
        const cintila = semMovimento ? 1 : 0.7 + 0.3 * Math.sin(t * 0.6 + p.f)
        ctx!.globalAlpha = p.o * cintila
        ctx!.fillStyle = '#f3f5fc'
        ctx!.beginPath()
        ctx!.arc(sx, sy, p.r, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1

      // --- núcleo ---------------------------------------------------------
      // O enxame gira devagar, e os pontos de fora giram MAIS devagar — como
      // um sistema de verdade. Girar tudo junto pareceria um disco rígido.
      {
        const [nx, ny] = paraTela(0, 0)
        const raioNucleo = 160 * c.z
        const brilho = ctx!.createRadialGradient(nx, ny, 0, nx, ny, raioNucleo)
        brilho.addColorStop(0, 'rgba(76,65,255,0.22)')
        brilho.addColorStop(0.55, 'rgba(76,65,255,0.07)')
        brilho.addColorStop(1, 'rgba(0,0,0,0)')
        ctx!.fillStyle = brilho
        ctx!.beginPath()
        ctx!.arc(nx, ny, raioNucleo, 0, Math.PI * 2)
        ctx!.fill()

        for (const p of mapa.nucleo) {
          const giro = semMovimento ? 0 : (t * 0.06) / (0.4 + p.orbita / 60)
          const cos = Math.cos(giro)
          const sen = Math.sin(giro)
          const gx = p.x * cos - p.y * sen
          const gy = p.x * sen + p.y * cos
          const [px, py] = paraTela(gx, gy)
          // Aplicada brilha e tem halo; o resto é a poeira do que existe e
          // ainda não foi feito.
          const cintila = semMovimento ? 1 : 0.72 + 0.28 * Math.sin(t * 0.9 + p.fase)
          if (p.aceso) {
            ctx!.globalAlpha = cintila
            ctx!.fillStyle = '#a9a2ff'
            ctx!.beginPath()
            ctx!.arc(px, py, Math.max(0.9, p.r * 1.5 * c.z), 0, Math.PI * 2)
            ctx!.fill()
          } else {
            ctx!.globalAlpha = 0.3 * cintila
            ctx!.fillStyle = '#8b93bd'
            ctx!.beginPath()
            ctx!.arc(px, py, Math.max(0.6, p.r * c.z), 0, Math.PI * 2)
            ctx!.fill()
          }
        }
        ctx!.globalAlpha = 1
      }

      // --- linhas ---------------------------------------------------------
      for (const l of mapa.linhas) {
        const a = porId.get(l.de)
        const b = porId.get(l.para)
        if (!a || !b) continue
        const [ax, ay] = paraTela(a.x, a.y)
        const [bx, by] = paraTela(b.x, b.y)
        const destacada =
          hoverId.current === a.id ||
          hoverId.current === b.id ||
          selecionado?.id === a.id ||
          selecionado?.id === b.id
        ctx!.strokeStyle = corDoAstro(b.hue, b.estado)
        ctx!.globalAlpha = destacada ? Math.min(1, l.forca + 0.35) : l.forca
        ctx!.lineWidth = destacada ? 1.1 : 0.7
        ctx!.beginPath()
        ctx!.moveTo(ax, ay)
        ctx!.lineTo(bx, by)
        ctx!.stroke()
      }
      ctx!.globalAlpha = 1

      // --- astros ---------------------------------------------------------
      for (const a of mapa.astros) {
        // O centro já foi desenhado como enxame. Um círculo por cima
        // taparia o enxame inteiro.
        if (a.tipo === 'centro') continue
        const [sx, sy] = paraTela(a.x, a.y)
        const raio = Math.max(1.2, a.r * c.z)
        if (sx < -60 || sx > L + 60 || sy < -60 || sy > A + 60) continue

        const ativo = hoverId.current === a.id || selecionado?.id === a.id
        const pulso = semMovimento ? 0 : 0.12 * Math.sin(t * 1.1 + ruido(a.id, 4))

        // Halo só em quem foi aplicado. É o prêmio visual da tese.
        if (a.estado === 'aceso' || ativo) {
          const g = ctx!.createRadialGradient(sx, sy, 0, sx, sy, raio * (ativo ? 6 : 4.2))
          g.addColorStop(
            0,
            a.estado === 'aceso' ? `hsl(${a.hue} 82% 62% / 0.5)` : 'rgba(185,192,220,0.28)',
          )
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx!.fillStyle = g
          ctx!.beginPath()
          ctx!.arc(sx, sy, raio * (ativo ? 6 : 4.2), 0, Math.PI * 2)
          ctx!.fill()
        }

        ctx!.fillStyle = corDoAstro(a.hue, a.estado, ativo)
        ctx!.beginPath()
        ctx!.arc(sx, sy, raio * (1 + pulso), 0, Math.PI * 2)
        ctx!.fill()

        // Anel de progresso, só no curso e só quando há o que mostrar.
        if (a.tipo === 'curso' && a.progresso > 0 && c.z > 0.3) {
          ctx!.strokeStyle = corDoAstro(a.hue, 'aceso')
          ctx!.lineWidth = 1.6
          ctx!.beginPath()
          ctx!.arc(sx, sy, raio + 5, -Math.PI / 2, -Math.PI / 2 + (a.progresso / 100) * Math.PI * 2)
          ctx!.stroke()
        }

        // --- rótulos ------------------------------------------------------
        // O nome do tema é sempre visível: é o que orienta de longe. Curso só
        // aparece com zoom suficiente, senão o céu vira uma parede de texto.
        if (a.tipo === 'tema') {
          ctx!.font = `500 ${Math.max(11, 13 * Math.min(1.4, c.z + 0.5))}px var(--font-elvon), Archivo, sans-serif`
          ctx!.fillStyle = ativo ? COR.rotuloForte : COR.rotulo
          ctx!.textAlign = 'center'
          ctx!.letterSpacing = '0.22em'
          ctx!.globalAlpha = 0.92
          ctx!.fillText(a.rotulo.toUpperCase(), sx, sy - raio - 26)
          ctx!.letterSpacing = '0px'
          ctx!.globalAlpha = 1
        } else if (a.tipo === 'curso' && (c.z > 0.55 || ativo)) {
          ctx!.font = '400 12px var(--font-elvon), Archivo, sans-serif'
          ctx!.fillStyle = ativo ? COR.rotuloForte : COR.rotulo
          ctx!.textAlign = 'center'
          ctx!.globalAlpha = ativo ? 1 : 0.7
          ctx!.fillText(a.rotulo, sx, sy + raio + 20)
          ctx!.globalAlpha = 1
        }
      }

      setZoomLido(Math.round(c.z * 100))
    }

    frame = requestAnimationFrame(desenhar)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [mapa, porId, poeira, selecionado])

  // --- Interação ----------------------------------------------------------

  const acharSob = useCallback(
    (cx: number, cy: number): Astro | null => {
      const el = wrap.current
      if (!el) return null
      const c = cam.current
      const L = el.clientWidth
      const A = el.clientHeight
      let melhor: Astro | null = null
      let menor = Infinity
      for (const a of mapa.astros) {
        const sx = (a.x - c.x) * c.z + L / 2
        const sy = (a.y - c.y) * c.z + A / 2
        const d = Math.hypot(sx - cx, sy - cy)
        // Alvo mínimo de 14px: ponto de 3px é impossível de acertar no dedo.
        const alcance = Math.max(14, a.r * c.z + 8)
        if (d < alcance && d < menor) {
          menor = d
          melhor = a
        }
      }
      return melhor
    },
    [mapa.astros],
  )

  function aoMover(e: React.PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect()
    const cx = e.clientX - r.left
    const cy = e.clientY - r.top

    if (ponteiro.current.arrastando) {
      const dx = cx - ponteiro.current.x
      const dy = cy - ponteiro.current.y
      if (Math.abs(dx) + Math.abs(dy) > 2) ponteiro.current.moveu = true
      alvo.current = {
        ...alvo.current,
        x: alvo.current.x - dx / cam.current.z,
        y: alvo.current.y - dy / cam.current.z,
      }
      cam.current.x -= dx / cam.current.z
      cam.current.y -= dy / cam.current.z
    } else {
      hoverId.current = acharSob(cx, cy)?.id ?? null
    }
    ponteiro.current.x = cx
    ponteiro.current.y = cy
  }

  function aoSoltar(e: React.PointerEvent) {
    const arrastou = ponteiro.current.moveu
    ponteiro.current.arrastando = false
    ponteiro.current.moveu = false
    if (arrastou) return

    const r = e.currentTarget.getBoundingClientRect()
    const achado = acharSob(e.clientX - r.left, e.clientY - r.top)
    if (!achado) {
      setSelecionado(null)
      return
    }
    if (achado.tipo === 'centro') {
      setSelecionado(null)
      ajustar()
      return
    }

    setSelecionado(achado)
    // Nível fixo por tipo, e não `max` com o zoom atual: com `max`, quem já
    // estava aproximado clicava e nada acontecia — o gesto morria sem resposta.
    // Cada tipo tem a distância em que ele se lê melhor.
    const perto = achado.tipo === 'tema' ? 0.9 : 1.9
    irPara(achado.x, achado.y, perto)
  }

  function aoRolar(e: React.WheelEvent) {
    const fator = Math.exp(-e.deltaY * 0.0016)
    irPara(alvo.current.x, alvo.current.y, alvo.current.z * fator)
  }

  const achados = useMemo(() => {
    const q = busca
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
    if (q.length < 2) return []
    return mapa.astros
      .filter((a) => a.tipo !== 'centro')
      .filter((a) =>
        a.rotulo
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .includes(q),
      )
      .slice(0, 6)
  }, [busca, mapa.astros])

  function irParaTema(i: number) {
    const t = temas[i]
    if (!t) return
    setTemaAtual(i)
    setSelecionado(t)
    irPara(t.x, t.y, 0.72)
  }

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-navy-deep md:h-dvh">
      <div
        ref={wrap}
        // `active:` em vez de ler o ref no render: o CSS já sabe quando o
        // botão está pressionado, e ref não deve ser lido durante o render.
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          ponteiro.current.arrastando = true
          ponteiro.current.moveu = false
          const r = e.currentTarget.getBoundingClientRect()
          ponteiro.current.x = e.clientX - r.left
          ponteiro.current.y = e.clientY - r.top
        }}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerLeave={() => {
          ponteiro.current.arrastando = false
          hoverId.current = null
        }}
        onWheel={aoRolar}
      >
        <canvas ref={canvasRef} className="block size-full" />
      </div>

      {/* --- Busca ---------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-sm">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Procurar entre ${mapa.astros.length - 1} pontos do céu`}
            aria-label="Procurar no mapa"
            className="h-10 w-full rounded-full border border-line bg-[rgba(5,7,20,0.8)] px-4 text-caption text-ink placeholder:text-ink-4 outline-none [backdrop-filter:blur(12px)] focus:border-[rgba(76,65,255,0.7)]"
          />
          {achados.length > 0 && (
            <ul className="mt-1.5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-[rgba(10,15,46,0.96)] [backdrop-filter:blur(12px)]">
              {achados.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setBusca('')
                      setSelecionado(a)
                      irPara(a.x, a.y, 1.1)
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-caption text-ink-2 transition-colors hover:bg-[rgba(243,245,252,0.05)] hover:text-ink"
                  >
                    <span className="truncate">{a.rotulo}</span>
                    <span className="shrink-0 text-ink-4">
                      {a.tipo === 'tema' ? 'tema' : a.tipo === 'curso' ? 'curso' : 'aula'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* --- Painel do selecionado ------------------------------------------ */}
      {selecionado && selecionado.tipo !== 'centro' && (
        <aside className="absolute top-4 left-4 z-10 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-line bg-[rgba(10,15,46,0.94)] p-5 [backdrop-filter:blur(16px)]">
          <div className="flex items-start justify-between gap-3">
            <span className="text-caption uppercase tracking-[0.16em] text-ink-4">
              {selecionado.tipo === 'tema'
                ? 'Constelação'
                : selecionado.tipo === 'curso'
                  ? 'Curso'
                  : 'Aula'}
            </span>
            <button
              type="button"
              onClick={() => setSelecionado(null)}
              aria-label="Fechar"
              className="text-caption text-ink-4 transition-colors hover:text-ink"
            >
              ✕
            </button>
          </div>

          <h2 className="mt-2 text-title font-light text-ink">{selecionado.rotulo}</h2>

          {selecionado.detalhe && (
            <p data-numeric className="mt-1 text-caption text-ink-4">
              {selecionado.detalhe}
            </p>
          )}

          {/* O estado dito em palavras. A cor sozinha não é acessível, e
              "cinza" não explica por que está cinza. */}
          <p className="mt-4 text-caption text-ink-3">
            {selecionado.estado === 'aceso'
              ? 'Acesa — você aplicou o que aprendeu aqui.'
              : selecionado.estado === 'visto'
                ? 'Assistida, ainda apagada. Acende quando você aplicar.'
                : 'Apagada. Ainda não começou.'}
          </p>

          {selecionado.tipo === 'curso' && selecionado.progresso > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(243,245,252,0.08)]">
                <div
                  className="h-full rounded-full bg-blue-light"
                  style={{ width: `${selecionado.progresso}%` }}
                />
              </div>
              <span data-numeric className="text-caption text-ink-3">
                {selecionado.progresso}%
              </span>
            </div>
          )}

          {selecionado.href && (
            <Link
              href={selecionado.href}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] bg-blue text-label font-strong text-off-white transition-colors hover:bg-blue-light"
            >
              {selecionado.tipo === 'tema' ? 'Abrir a constelação' : 'Abrir o curso'}
            </Link>
          )}
        </aside>
      )}

      {/* --- Carrossel de constelações --------------------------------------- */}
      {temas.length > 0 && (
        <div className="absolute inset-x-0 bottom-24 flex items-center justify-center gap-5 md:bottom-8">
          <button
            type="button"
            onClick={() => irParaTema((temaAtual - 1 + temas.length) % temas.length)}
            aria-label="Constelação anterior"
            className="text-body text-ink-4 transition-colors hover:text-ink"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => irParaTema(temaAtual)}
            className="text-caption uppercase tracking-[0.24em] text-ink-2 transition-colors hover:text-ink"
          >
            {temas[temaAtual]?.rotulo ?? '—'}
          </button>
          <button
            type="button"
            onClick={() => irParaTema((temaAtual + 1) % temas.length)}
            aria-label="Próxima constelação"
            className="text-body text-ink-4 transition-colors hover:text-ink"
          >
            ›
          </button>
        </div>
      )}

      {/* --- Zoom ------------------------------------------------------------ */}
      <div className="absolute right-4 bottom-24 flex items-center gap-1 rounded-full border border-line bg-[rgba(5,7,20,0.8)] px-2 py-1 [backdrop-filter:blur(12px)] md:bottom-8">
        <button
          type="button"
          onClick={() => irPara(alvo.current.x, alvo.current.y, alvo.current.z * 0.75)}
          aria-label="Afastar"
          className="size-7 text-body text-ink-3 transition-colors hover:text-ink"
        >
          −
        </button>
        <span data-numeric className="w-12 text-center text-caption text-ink-3">
          {zoomLido}%
        </span>
        <button
          type="button"
          onClick={() => irPara(alvo.current.x, alvo.current.y, alvo.current.z * 1.33)}
          aria-label="Aproximar"
          className="size-7 text-body text-ink-3 transition-colors hover:text-ink"
        >
          +
        </button>
        <button
          type="button"
          onClick={ajustar}
          className="ml-1 rounded-full px-2 py-0.5 text-caption text-ink-4 transition-colors hover:text-ink"
        >
          Ajustar
        </button>
      </div>
    </div>
  )
}
