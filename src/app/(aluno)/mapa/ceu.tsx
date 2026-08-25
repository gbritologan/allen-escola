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
  aceso: '#4c41ff',
  acesoBrilho: '#8b84ff',
  visto: '#7e87ab',
  apagado: '#3a4066',
  rotulo: '#b9c0dc',
  rotuloForte: '#f3f5fc',
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

    function corDe(a: Astro) {
      return a.estado === 'aceso' ? COR.aceso : a.estado === 'visto' ? COR.visto : COR.apagado
    }

    function desenhar(ms: number) {
      frame = requestAnimationFrame(desenhar)
      if (!canvas || !el) return
      const L = el.clientWidth
      const A = el.clientHeight
      const t = ms * 0.001

      // A câmera persegue o alvo. Sem isso, centralizar uma constelação
      // teleporta e a pessoa perde a noção de onde estava.
      const c = cam.current
      const al = alvo.current
      c.x += (al.x - c.x) * 0.12
      c.y += (al.y - c.y) * 0.12
      c.z += (al.z - c.z) * 0.12

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
        ctx!.strokeStyle = b.estado === 'aceso' ? COR.aceso : COR.rotulo
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
        const [sx, sy] = paraTela(a.x, a.y)
        const raio = Math.max(1.2, a.r * c.z)
        if (sx < -60 || sx > L + 60 || sy < -60 || sy > A + 60) continue

        const ativo = hoverId.current === a.id || selecionado?.id === a.id
        const pulso = semMovimento ? 0 : 0.12 * Math.sin(t * 1.1 + ruido(a.id, 4))

        // Halo só em quem foi aplicado. É o prêmio visual da tese.
        if (a.estado === 'aceso' || ativo) {
          const g = ctx!.createRadialGradient(sx, sy, 0, sx, sy, raio * (ativo ? 6 : 4.2))
          g.addColorStop(0, a.estado === 'aceso' ? 'rgba(76,65,255,0.55)' : 'rgba(185,192,220,0.3)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx!.fillStyle = g
          ctx!.beginPath()
          ctx!.arc(sx, sy, raio * (ativo ? 6 : 4.2), 0, Math.PI * 2)
          ctx!.fill()
        }

        ctx!.fillStyle = ativo ? COR.acesoBrilho : corDe(a)
        ctx!.beginPath()
        ctx!.arc(sx, sy, raio * (1 + pulso), 0, Math.PI * 2)
        ctx!.fill()

        // Anel de progresso, só no curso e só quando há o que mostrar.
        if (a.tipo === 'curso' && a.progresso > 0 && c.z > 0.3) {
          ctx!.strokeStyle = COR.aceso
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
    if (!achado || achado.tipo === 'aula') {
      setSelecionado(achado?.tipo === 'aula' ? achado : null)
      return
    }
    setSelecionado(achado)
    irPara(achado.x, achado.y, Math.max(cam.current.z, achado.tipo === 'tema' ? 0.7 : 1.1))
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
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-navy-deep">
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
