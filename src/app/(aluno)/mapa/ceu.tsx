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
/**
 * OS EMBLEMAS NO CANVAS.
 *
 * Na Home, os emblemas são PNG usados como máscara de CSS — a forma vem do
 * arquivo, a cor vem do tema. Canvas não tem máscara de CSS, então o mesmo
 * truque é feito à mão: desenha-se o PNG numa tela fora da vista, pinta-se
 * por cima com `source-in`, e o que sobra é a silhueta na cor certa.
 *
 * Fazer isso a cada quadro, para oito temas, a 60fps, seria absurdo. Então
 * cada combinação de emblema+cor+tamanho é pintada UMA vez e guardada. O
 * laço de desenho só copia o resultado.
 *
 * ─── POR QUE NÃO CONTINUAR COM VETOR ─────────────────────────────────────
 *
 * Havia um caminho mais simples: manter os desenhos em Path2D, como antes. Ele
 * foi descartado porque exigiria DUAS versões de cada emblema — a arte real na
 * Home e um vetor aproximado no Mapa. Duas versões divergem: alguém troca uma
 * arte e esquece a outra, e o aluno vê símbolos diferentes para o mesmo tema
 * em duas telas. A identidade que a cor e o ícone construíram morre aí.
 */
const PINTADOS = new Map<string, HTMLCanvasElement>()
const CARREGADAS = new Map<string, HTMLImageElement>()

function imagemDoEmblema(chave: string): HTMLImageElement | null {
  const pronta = CARREGADAS.get(chave)
  if (pronta) return pronta.complete && pronta.naturalWidth > 0 ? pronta : null

  const img = new Image()
  img.src = `/temas/${chave}.png`
  CARREGADAS.set(chave, img)
  return null
}

function emblemaPintado(chave: string, cor: string, lado: number): HTMLCanvasElement | null {
  // O tamanho entra na chave arredondado: sem isso, cada fração de zoom
  // geraria uma tela nova e o cache cresceria sem limite durante a navegação.
  const passo = Math.max(12, Math.round(lado / 4) * 4)
  const id = `${chave}|${cor}|${passo}`

  const cache = PINTADOS.get(id)
  if (cache) return cache

  const img = imagemDoEmblema(chave)
  if (!img) return null

  const tela = document.createElement('canvas')
  tela.width = passo
  tela.height = passo
  const ctx = tela.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(img, 0, 0, passo, passo)
  // `source-in` mantém só onde já havia desenho: a cor entra pela silhueta.
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = cor
  ctx.fillRect(0, 0, passo, passo)

  PINTADOS.set(id, tela)
  return tela
}

/** Desenha o emblema do tema dentro do anel. */
function desenharIcone(
  ctx: CanvasRenderingContext2D,
  chave: string | null | undefined,
  cx: number,
  cy: number,
  lado: number,
  cor: string,
) {
  if (!chave || lado < 9) return
  const pintado = emblemaPintado(chave, cor, lado)
  if (!pintado) return

  ctx.save()
  ctx.globalAlpha = 0.92
  ctx.drawImage(pintado, cx - lado / 2, cy - lado / 2, lado, lado)
  ctx.restore()
}


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

  /**
   * O NÍVEL EM QUE A PESSOA ESTÁ.
   *
   * `null` = mapa geral, todas as constelações. Um id = aquela constelação em
   * foco, as outras recuadas. É o "nível 0 / nível 1" do briefing.
   *
   * Não virou rota nem store: é UM estado, lido por UM componente. Zustand
   * aqui seria cerimônia — o briefing recomendava porque o mapa dele é várias
   * telas; o nosso é uma.
   */
  const [foco, setFoco] = useState<string | null>(null)

  /**
   * Quanto o foco já avançou, de 0 a 1. Fora do React porque muda a 60fps.
   *
   * É ele que faz as partículas SE ESPALHAREM durante o voo, em vez de
   * teleportarem quando ele termina.
   */
  const tFoco = useRef(0)

  /*
   * O FOCO TAMBÉM VIVE NUM REF.
   *
   * O laço de desenho é montado uma vez e roda até a tela morrer — ele NÃO é
   * recriado a cada estado. Se ele lesse `foco` direto, leria para sempre o
   * valor do primeiro quadro, e entrar numa constelação não mudaria nada na
   * tela. O ref é o que atravessa essa fronteira.
   */
  const focoRef = useRef<string | null>(null)

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

  /**
   * ONDE ESTE ASTRO ESTÁ AGORA.
   *
   * Entre o mapa geral e a constelação em foco existe um caminho, não um
   * corte. Astro da constelação focada viaja de (x,y) para (x1,y1); os das
   * outras ficam onde estão — elas não se espalham, só recuam.
   */
  const posDe = useCallback(
    (a: { x: number; y: number; x1: number; y1: number; temaId: string | null; id: string }) => {
      const t = tFoco.current
      const f = focoRef.current
      const daFocada = f !== null && (a.temaId === f || a.id === f)
      if (t <= 0 || !daFocada) return [a.x, a.y] as const
      return [a.x + (a.x1 - a.x) * t, a.y + (a.y1 - a.y) * t] as const
    },
    [],
  )

  useEffect(() => {
    focoRef.current = foco
  }, [foco])

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
      /*
       * O RELÓGIO DO FOCO.
       *
       * Sobe para 1 quando há constelação em foco, volta para 0 quando não há.
       * A mesma curva nos dois sentidos: entrar e sair têm o mesmo peso, e é
       * o que o briefing pede ("exatamente o inverso, mesma duração").
       */
      const destinoFoco = focoRef.current ? 1 : 0
      tFoco.current += (destinoFoco - tFoco.current) * 0.075
      if (Math.abs(destinoFoco - tFoco.current) < 0.002) tFoco.current = destinoFoco

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
        const [axw, ayw] = posDe(a)
        const [bxw, byw] = posDe(b)
        const [ax, ay] = paraTela(axw, ayw)
        const [bx, by] = paraTela(bxw, byw)
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

      /*
       * A MARCA D'ÁGUA DO TEMA EM FOCO.
       *
       * Nome gigante atrás da constelação, a ~6% de opacidade. Ela não é
       * enfeite: numa tela que perdeu as outras sete constelações, é o que
       * responde "onde eu estou" sem ocupar espaço de conteúdo.
       *
       * Desenhada ANTES dos astros, senão cobriria as estrelas.
       */
      if (focoRef.current && tFoco.current > 0.05) {
        const t0 = mapa.astros.find((x) => x.tipo === 'tema' && x.id === focoRef.current)
        if (t0) {
          const [wx, wy] = paraTela(t0.x, t0.y - 120)
          ctx!.save()
          ctx!.font = `300 ${Math.max(60, 190 * c.z)}px var(--font-elvon), Archivo, sans-serif`
          ctx!.textAlign = 'center'
          ctx!.letterSpacing = '0.12em'
          ctx!.fillStyle = `hsl(${t0.hue} 40% 70%)`
          ctx!.globalAlpha = 0.06 * tFoco.current
          ctx!.fillText(t0.rotulo.toUpperCase(), wx, wy)
          ctx!.restore()
        }
      }

      // --- astros ---------------------------------------------------------
      for (const a of mapa.astros) {
        // O centro já foi desenhado como enxame. Um círculo por cima
        // taparia o enxame inteiro.
        if (a.tipo === 'centro') continue
        const [axw, ayw] = posDe(a)
        const [sx, sy] = paraTela(axw, ayw)
        const raio = Math.max(1.2, a.r * c.z)
        if (sx < -60 || sx > L + 60 || sy < -60 || sy > A + 60) continue

        const ativo = hoverId.current === a.id || selecionado?.id === a.id
        const pulso = semMovimento ? 0 : 0.12 * Math.sin(t * 1.1 + ruido(a.id, 4))

        /*
         * AS OUTRAS CONSTELAÇÕES RECUAM, NÃO SOMEM.
         *
         * O briefing manda o resto cair para ~15% de opacidade. Cair a ZERO
         * seria troca de tela disfarçada — e o ponto do mapa é que ele é um
         * lugar só, sempre presente. Recuadas, elas continuam dizendo "tem
         * mais céu aqui fora".
         */
        const fAtual = focoRef.current
        const daFocada = fAtual === null || a.temaId === fAtual || a.id === fAtual
        const recuo = daFocada ? 1 : 1 - tFoco.current * 0.85
        if (recuo < 0.04) continue
        ctx!.globalAlpha = recuo

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

        if (a.tipo === 'tema') {
          /*
           * A ÂNCORA É UM DISCO CLARO COM O SÍMBOLO ESCURO DENTRO.
           *
           * Era um anel vazado com o ícone traçado por cima. Funcionava, mas
           * sumia: traço fino sobre céu escuro compete com as estrelas em vez
           * de mandar nelas. O Gabriel mandou a referência do Arkom e disse
           * "principalmente os ícones" — e lá o acerto é de CONTRASTE
           * INVERTIDO: o nó é claro e o símbolo é escuro, então ele lê antes
           * de qualquer coisa na tela.
           *
           * Aqui o disco não é creme: é o MATIZ da constelação em luminosidade
           * alta. Assim a inversão de contraste entra sem que o mapa perca a
           * cor por setor (D-37), e o estado continua no brilho — apagada, a
           * constelação é um disco fosco; acesa, ela queima.
           */
          const rr = raio * (1 + pulso)
          const aceso = a.estado === 'aceso'

          /*
           * O DISCO É SEMPRE CLARO. O ESTADO ESTÁ NA SATURAÇÃO.
           *
           * Erro meu na primeira versão: amarrei a LUZ do disco ao estado
           * (88 / 62 / 42). Ficava coerente com D-37 — estado no brilho — e
           * quebrava a única coisa que o disco existe para fazer: sustentar um
           * símbolo ESCURO em cima. Sem nada aplicado, o disco vinha a 42% de
           * luz e o ícone desaparecia dentro dele. O Gabriel viu exatamente
           * isso: um borrão roxo sem ícone.
           *
           * Agora a luz varia pouco (78–92), o bastante para o ícone sempre
           * ler, e o estado migra para a SATURAÇÃO.
           *
           * ─── E A SATURAÇÃO TINHA UM PISO BAIXO DEMAIS ─────────────────
           *
           * Ela ia de 8% (apagada) a 74% (acesa). Enquanto a cor era só
           * decoração — um matiz calculado pela posição do tema —, isso
           * funcionava: 8% lia como "ainda não fiz nada aqui".
           *
           * Depois de 0031, a cor virou IDENTIDADE: Vendas é dourado, Zeus é
           * vermelho, e o aluno aprende isso na Home. A 8% de saturação, os
           * oito temas viram oito discos brancos no Mapa — e a identidade que
           * a Home construiu não atravessa a ponte.
           *
           * O piso subiu para 52%. O estado continua sendo dito, agora numa
           * faixa mais estreita (52 → 78): a diferença entre apagado e aceso
           * fica menor, e em troca o tema é reconhecível pela cor em qualquer
           * estado. É a troca certa — estado é informação de uma sessão,
           * identidade é o que a pessoa carrega entre as telas.
           */
          const luz = aceso ? 92 : a.estado === 'visto' ? 86 : 80
          const sat = aceso ? 78 : a.estado === 'visto' ? 64 : 52

          // O halo externo é o que cola o disco no céu. Sem ele o nó parece
          // um adesivo colado por cima do fundo.
          const brilho = ctx!.createRadialGradient(sx, sy, rr * 0.7, sx, sy, rr * 2.4)
          brilho.addColorStop(0, `hsl(${a.hue} ${sat}% ${luz}% / ${aceso ? 0.42 : 0.16})`)
          brilho.addColorStop(1, 'rgba(0,0,0,0)')
          ctx!.fillStyle = brilho
          ctx!.beginPath()
          ctx!.arc(sx, sy, rr * 2.4, 0, Math.PI * 2)
          ctx!.fill()

          ctx!.fillStyle = `hsl(${a.hue} ${sat}% ${luz}%)`
          ctx!.beginPath()
          ctx!.arc(sx, sy, rr, 0, Math.PI * 2)
          ctx!.fill()

          // O símbolo em navy, recortado do disco. Sempre legível agora que
          // o disco não escurece com o estado.
          desenharIcone(ctx!, a.icone, sx, sy, rr * 1.15, '#050714')

          // O anel de seleção fica FORA do disco, com folga — encostado, ele
          // engrossaria a borda e leria como parte do nó, não como estado.
          if (ativo) {
            ctx!.strokeStyle = `hsl(${a.hue} 82% 72%)`
            ctx!.lineWidth = Math.max(1.2, 2 * c.z)
            ctx!.beginPath()
            ctx!.arc(sx, sy, rr * 1.42, 0, Math.PI * 2)
            ctx!.stroke()
          }
        } else {
          ctx!.fillStyle = corDoAstro(a.hue, a.estado, ativo)
          ctx!.beginPath()
          ctx!.arc(sx, sy, raio * (1 + pulso), 0, Math.PI * 2)
          ctx!.fill()
        }

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
          /*
           * O NOME DA CONSTELAÇÃO É GRANDE.
           *
           * Era 13px com teto de 1.4× — no zoom de encaixe virava 11px, e o
           * rótulo desaparecia ao lado do disco. Na referência que o Gabriel
           * mandou, o nome do setor é o SEGUNDO elemento mais forte da tela,
           * depois do nó: caixa alta, bem espaçado, grande o bastante para se
           * ler atravessado.
           *
           * 26px de base com teto de 1.8×, e um piso de 15px para o zoom de
           * encaixe continuar legível.
           */
          ctx!.font = `300 ${Math.max(15, 26 * Math.min(1.8, c.z + 0.55))}px var(--font-elvon), Archivo, sans-serif`
          ctx!.fillStyle = ativo ? COR.rotuloForte : COR.rotulo
          ctx!.textAlign = 'center'
          ctx!.letterSpacing = '0.3em'
          ctx!.globalAlpha = 0.92
          ctx!.fillText(a.rotulo.toUpperCase(), sx, sy - raio - 42)
          ctx!.letterSpacing = '0px'

          // A segunda linha. Some no zoom baixo: a esta distância o nome é o
          // que orienta, e a descrição vira sujeira sob ele.
          /* A DESCRIÇÃO SAIU DO CÉU.
             Ela existia para explicar o tema, e no Mapa isso é a pergunta
             errada: aqui o tema é ponto de entrada, não verbete. Oito nomes
             mais oito frases num campo estrelado viram texto flutuando —
             a descrição continua na Home e na página do tema, onde há
             espaço para ler. */
          ctx!.globalAlpha = 1
        } else if (a.tipo === 'curso' && (c.z > 0.55 || ativo)) {
          ctx!.font = '400 12px var(--font-elvon), Archivo, sans-serif'
          ctx!.fillStyle = ativo ? COR.rotuloForte : COR.rotulo
          ctx!.textAlign = 'center'
          ctx!.globalAlpha = ativo ? 1 : 0.7
          ctx!.fillText(a.rotulo, sx, sy + raio + 20)
          ctx!.globalAlpha = 1
        }

        // O recuo vale por astro; sem zerar aqui ele vazaria para o próximo.
        ctx!.globalAlpha = 1
      }

      setZoomLido(Math.round(c.z * 100))
    }

    frame = requestAnimationFrame(desenhar)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
    // `posDe` é estável (useCallback sem dependências, lê tudo de refs) — só
    // entra aqui para o lint enxergar a ligação.
  }, [mapa, porId, poeira, selecionado, posDe])

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
        const [axw, ayw] = posDe(a)
        const sx = (axw - c.x) * c.z + L / 2
        const sy = (ayw - c.y) * c.z + A / 2
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
    [mapa.astros, posDe],
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

    /*
     * TEMA ENTRA, CURSO ABRE O PAINEL.
     *
     * Clicar numa constelação no mapa geral não deveria abrir uma ficha — a
     * pergunta ali é "o que tem dentro", e a resposta é entrar. A ficha vale
     * para curso e aula, que são destinos finais.
     */
    if (achado && achado.tipo === 'tema' && foco !== achado.id) {
      entrarNoTema(achado.id)
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

  /** O nome da constelação a que um astro pertence. */
  function nomeDoTema(temaId: string | null) {
    if (!temaId) return null
    return mapa.astros.find((a) => a.tipo === 'tema' && a.id === temaId)?.rotulo ?? null
  }

  /**
   * O símbolo que o painel mostra.
   *
   * Tema tem o próprio; curso e aula herdam o da constelação — é o que liga
   * visualmente a aula ao setor de onde ela veio.
   */
  function simboloDoPainel(a: Astro) {
    const chave =
      a.tipo === 'tema'
        ? a.icone
        : mapa.astros.find((x) => x.tipo === 'tema' && x.id === a.temaId)?.icone
    return chave ?? null
  }

  /**
   * ENTRAR NA CONSTELAÇÃO.
   *
   * A câmera voa para a âncora e o zoom sobe. Não é troca de tela: o `foco`
   * muda, `tFoco` sobe de 0 a 1 no laço de desenho, e os astros se espalham
   * DURANTE o voo. Quem olha vê uma coisa só se aproximando.
   */
  const entrarNoTema = useCallback(
    (temaId: string) => {
      const t = mapa.astros.find((a) => a.tipo === 'tema' && a.id === temaId)
      if (!t) return
      setFoco(temaId)
      setSelecionado(null)
      irPara(t.x, t.y, 0.62)
    },
    [mapa.astros, irPara],
  )

  /** Voltar ao mapa geral: o inverso exato, mesma duração. */
  const voltarAoGeral = useCallback(() => {
    setFoco(null)
    setSelecionado(null)
    ajustar()
  }, [ajustar])

  /*
   * Esc fecha o painel; Esc de novo sobe um nível. É o que o briefing pede, e
   * é o que já se espera de qualquer coisa que abre por cima.
   */
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (selecionado) setSelecionado(null)
      else if (foco) voltarAoGeral()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [selecionado, foco, voltarAoGeral])

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

      {/*
        A MIGALHA.

        Só aparece dentro de uma constelação, e é a saída explícita. O Esc
        também sobe, mas atalho de teclado não é caminho descobrível — quem
        entrou clicando precisa de um jeito de sair clicando.
      */}
      {foco && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={voltarAoGeral}
            className="pointer-events-auto self-start text-caption uppercase tracking-[0.18em] text-ink-3 transition-colors hover:text-ink"
          >
            ‹ Todas as constelações
          </button>
        </div>
      )}

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
                      // Achar um tema pela busca leva PARA DENTRO dele, igual
                      // ao clique no céu. Dois caminhos para a mesma coisa
                      // precisam terminar no mesmo lugar.
                      if (a.tipo === 'tema') {
                        entrarNoTema(a.id)
                        return
                      }
                      // Curso e aula: entra na constelação deles e abre a ficha,
                      // senão o astro apareceria sozinho num céu sem contexto.
                      if (a.temaId) setFoco(a.temaId)
                      setSelecionado(a)
                      irPara(a.x1, a.y1, 1.1)
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

          {/*
           * O SÍMBOLO ENTRA NO PAINEL.
           *
           * É o mesmo desenho do nó no céu, no mesmo matiz. Sem ele, quem
           * clica precisa confiar que o painel abriu sobre o que foi clicado;
           * com ele, a ligação entre o que está no céu e o que está escrito é
           * instantânea. Foi o que o Gabriel apontou na referência.
           */}
          <div className="mt-3 flex items-center gap-3">
            {simboloDoPainel(selecionado) && (
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `hsl(${selecionado.hue} ${
                    selecionado.estado === 'aceso' ? 70 : 18
                  }% ${selecionado.estado === 'aceso' ? 88 : 58}%)`,
                }}
              >
                {/* Máscara, como na Home: mesma arte, cor de quem chama.
                    Duas versões do mesmo emblema divergiriam no dia em que
                    alguém trocasse uma e esquecesse a outra. */}
                <span
                  aria-hidden
                  className="size-6 bg-navy-deep"
                  style={{
                    maskImage: `url(/temas/${simboloDoPainel(selecionado)}.png)`,
                    WebkitMaskImage: `url(/temas/${simboloDoPainel(selecionado)}.png)`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                  }}
                />
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate text-title font-light text-ink">{selecionado.rotulo}</h2>
              {/* O caminho: de que constelação isto faz parte. Num céu com
                  seis setores, "Abertura" sozinho não diz de onde veio. */}
              {selecionado.tipo !== 'tema' && nomeDoTema(selecionado.temaId) && (
                <span className="truncate text-caption text-ink-4">
                  {nomeDoTema(selecionado.temaId)}
                </span>
              )}
            </div>
          </div>

          {selecionado.detalhe && (
            <p data-numeric className="mt-3 text-caption text-ink-4">
              {selecionado.detalhe}
            </p>
          )}

          {selecionado.subtitulo && (
            <p className="mt-2 text-body text-ink-2">{selecionado.subtitulo}</p>
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
