/**
 * O MAPA — o céu da Allen.
 *
 * Um catálogo em lista responde "o que existe". Um mapa responde "onde eu
 * estou", que é outra pergunta e é a que trava aluno de assinatura: sem um
 * lugar, a pessoa abre a plataforma, não sabe por onde continuar, e fecha.
 *
 * A REGRA QUE FAZ ESTE MAPA SER DA ALLEN E DE MAIS NINGUÉM:
 *
 *   Estrela acende com APLICAÇÃO, não com visualização.
 *
 * Assistir deixa a estrela cinza-clara. Aplicar acende. O céu inteiro é um
 * retrato do que a pessoa FEZ, e ninguém consegue simular progresso deixando
 * vídeo rodando — que é exatamente o que um mapa de "% assistido" premiaria.
 *
 * Módulo puro (D-01): sem React, sem canvas, sem DOM. A posição de cada estrela
 * é calculada aqui e testada no arquivo ao lado. Quem desenha não decide nada.
 */

export type EstadoAstro = 'apagado' | 'visto' | 'aceso'

export interface Astro {
  id: string
  tipo: 'centro' | 'tema' | 'curso' | 'aula'
  rotulo: string
  /** Só para tema e curso — o endereço que o clique abre. */
  href: string | null
  /** Coordenadas no espaço do mapa. A tela aplica pan e zoom por cima. */
  x: number
  y: number
  /** Raio base, em unidades do mapa. */
  r: number
  estado: EstadoAstro
  /** A constelação a que pertence. O centro não pertence a nenhuma. */
  temaId: string | null
  /** 0–100. Só faz sentido em curso e tema. */
  progresso: number
  /** Texto de apoio no painel — "3 aulas · 42min". */
  detalhe: string | null
  /**
   * Matiz da constelação, em graus.
   *
   * A cor identifica o SETOR; o estado (apagado/visto/aceso) controla o
   * brilho e a saturação. Assim a constelação ganha cor ao ser acesa — o que
   * reforça a tese em vez de disputar com ela.
   */
  hue: number
}

/**
 * Um ponto do núcleo — UMA AULA DO CATÁLOGO.
 *
 * Não é clicável: é textura, não destino. Mas não é decoração, e essa é a
 * diferença que importa: cada ponto é uma aula que a Allen ensina, e ele
 * ACENDE se você aplicou aquela aula.
 *
 * Foi uma correção de rota. A primeira versão fazia o enxame crescer com o
 * número de aplicações, o que deixava o centro quase vazio para quem estava
 * chegando — e o centro é a primeira coisa que a pessoa vê. Assim o núcleo é
 * o conhecimento da escola, sempre inteiro, com a sua parte acesa dentro dele.
 */
export interface PontoNucleo {
  x: number
  y: number
  r: number
  /** Fase da cintilação, para os pontos não pulsarem em coro. */
  fase: number
  /** Distância do centro: pontos de fora giram mais devagar. */
  orbita: number
  /** Você aplicou esta aula. */
  aceso: boolean
}

export interface Linha {
  de: string
  para: string
  /** Linha entre acesos é mais forte: a constelação se revela ao ser feita. */
  forca: number
}

export interface Mapa {
  astros: Astro[]
  linhas: Linha[]
  /**
   * O NÚCLEO.
   *
   * Um ponto só no centro não é base de conhecimento — é um pixel. Aqui é um
   * enxame com UMA AULA POR PONTO: o conhecimento inteiro da Allen, sempre
   * completo, com as aulas que você aplicou acesas dentro dele.
   */
  nucleo: PontoNucleo[]
  /** Caixa que contém tudo, para a tela saber o zoom inicial. */
  limites: { minX: number; minY: number; maxX: number; maxY: number }
}

export interface TemaEntrada {
  id: string
  slug: string
  name: string
}

export interface CursoEntrada {
  id: string
  slug: string
  title: string
  temaId: string | null
  lessonCount: number
  durationSeconds: number
}

export interface AulaEntrada {
  id: string
  courseId: string
  title: string
  /** Concluída (assistida). */
  vista: boolean
  /** Para Fazer marcado como aplicado. */
  aplicada: boolean
}

/**
 * A FAIXA DE COR DOS SETORES.
 *
 * De 196° (ciano) a 292° (violeta), passando pelo azul da marca (~244°). É uma
 * faixa estreita de propósito: seis matizes espalhados pelo círculo cromático
 * dariam um mapa de papagaio, e a Allen é azul. Aqui cada constelação tem tom
 * próprio e todas continuam da mesma família.
 *
 * E a cor só se revela ao acender: apagado é quase neutro, aceso é o tom
 * cheio. A constelação ganha identidade sendo feita.
 */
const HUE_INICIO = 196
const HUE_FIM = 292

export function hueDoTema(indice: number, total: number): number {
  if (total <= 1) return 244
  return HUE_INICIO + (indice / (total - 1)) * (HUE_FIM - HUE_INICIO)
}

/**
 * Distância do centro até a âncora de cada constelação.
 *
 * Precisa ser grande o bastante para as constelações não se tocarem depois que
 * os cursos se abrem. Com seis temas, âncoras vizinhas ficam a ~RAIO_TEMA de
 * distância — e cada uma se espalha até RAIO_CURSO + folga.
 */
const RAIO_TEMA = 820

/**
 * Quanto os cursos se afastam da âncora do tema.
 *
 * Aqui estava 190, e o resultado eram tufos: os cursos grudavam na âncora e
 * cada tema virava um borrão em vez de uma constelação. Constelação precisa de
 * espaço entre as estrelas — é o espaço que faz o olho ligar os pontos.
 */
const RAIO_CURSO = 300

/** Quanto as aulas orbitam o curso. */
const RAIO_AULA = 74

/**
 * Ruído determinístico a partir do id.
 *
 * O céu precisa parecer natural — estrelas em círculo perfeito parecem
 * mostrador de relógio — mas NÃO pode mudar de lugar a cada visita. Uma pessoa
 * que aprendeu onde fica "Negociação" tem que encontrar Negociação no mesmo
 * lugar amanhã. Por isso o deslocamento vem de um hash do id, e nunca de
 * `Math.random()`.
 */
export function ruido(semente: string, faixa: number): number {
  let h = 2166136261
  for (let i = 0; i < semente.length; i++) {
    h ^= semente.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // >>> 0 para tirar o sinal; /2^32 normaliza para 0–1.
  const unidade = (h >>> 0) / 4294967296
  return (unidade - 0.5) * 2 * faixa
}

function estadoDoCurso(aulas: AulaEntrada[]): EstadoAstro {
  if (aulas.some((a) => a.aplicada)) return 'aceso'
  if (aulas.some((a) => a.vista)) return 'visto'
  return 'apagado'
}

/**
 * O progresso do curso é medido em APLICAÇÃO, não em visualização.
 *
 * É a mesma decisão de `resolve-skills.ts` (D-30), e ela precisa ser a mesma
 * nos dois lugares: um mapa que mostrasse 100% para quem só assistiu
 * desmentiria a Jornada logo ao lado.
 */
function progressoDoCurso(aulas: AulaEntrada[]): number {
  if (aulas.length === 0) return 0
  const aplicadas = aulas.filter((a) => a.aplicada).length
  const vistas = aulas.filter((a) => a.vista).length
  // Assistir vale um quarto. Chega perto de 100 só quem aplicou.
  const bruto = (aplicadas + vistas * 0.25) / aulas.length
  return Math.min(100, Math.round(bruto * 100))
}

export function montarMapa(
  temas: readonly TemaEntrada[],
  cursos: readonly CursoEntrada[],
  aulas: readonly AulaEntrada[],
  nomeDoAluno: string,
): Mapa {
  const astros: Astro[] = []
  const linhas: Linha[] = []

  const aulasPorCurso = new Map<string, AulaEntrada[]>()
  for (const a of aulas) {
    aulasPorCurso.set(a.courseId, [...(aulasPorCurso.get(a.courseId) ?? []), a])
  }

  const aplicadasTotal = aulas.filter((a) => a.aplicada).length

  astros.push({
    id: 'centro',
    tipo: 'centro',
    rotulo: nomeDoAluno,
    href: null,
    x: 0,
    y: 0,
    r: 20,
    estado: aplicadasTotal > 0 ? 'aceso' : 'visto',
    temaId: null,
    progresso: 0,
    hue: 244,
    detalhe:
      aplicadasTotal === 0
        ? 'Nenhuma aplicação ainda'
        : `${aplicadasTotal} ${aplicadasTotal === 1 ? 'aplicação feita' : 'aplicações feitas'}`,
  })

  // Uma aula, um ponto. Acima de 240 vira mancha e deixa de comunicar — e um
  // catálogo desse tamanho já provou o ponto.
  const nucleo: PontoNucleo[] = aulas.slice(0, 240).map((aula) => {
    // Raiz quadrada distribui por ÁREA. Sem ela os pontos amontoam no meio e
    // o enxame vira um borrão com franja.
    const orbita = Math.sqrt(Math.abs(ruido(aula.id + 'd', 1))) * 118 + 10
    const ang = ruido(aula.id + 'a', Math.PI)
    return {
      x: Math.cos(ang) * orbita,
      // Achatado: o núcleo é um disco visto de viés, não uma bola.
      y: Math.sin(ang) * orbita * 0.78,
      r: 0.9 + Math.abs(ruido(aula.id + 'r', 1.4)),
      fase: ruido(aula.id + 'f', Math.PI),
      orbita,
      aceso: aula.aplicada,
    }
  })

  // Temas em volta do centro. O -90° põe o primeiro no topo, que é onde o olho
  // começa a ler um círculo.
  const passo = temas.length > 0 ? (Math.PI * 2) / temas.length : 0

  temas.forEach((tema, i) => {
    const hue = hueDoTema(i, temas.length)
    const ang = i * passo - Math.PI / 2
    const raio = RAIO_TEMA + ruido(tema.id, 70)
    const tx = Math.cos(ang) * raio
    const ty = Math.sin(ang) * raio

    const doTema = cursos.filter((c) => c.temaId === tema.id)
    const aulasDoTema = doTema.flatMap((c) => aulasPorCurso.get(c.id) ?? [])

    astros.push({
      id: tema.id,
      tipo: 'tema',
      rotulo: tema.name,
      href: `/tema/${tema.slug}`,
      x: tx,
      y: ty,
      r: 15,
      estado: estadoDoCurso(aulasDoTema),
      temaId: tema.id,
      progresso: progressoDoCurso(aulasDoTema),
      hue,
      detalhe: `${doTema.length} ${doTema.length === 1 ? 'curso' : 'cursos'}`,
    })

    linhas.push({ de: 'centro', para: tema.id, forca: 0.22 })

    // Cursos em leque ao redor da âncora do tema, abrindo para fora do centro.
    // Leque de 150°, abrindo para fora do centro. Mais aberto que meia-volta
    // faria as pontas voltarem para dentro e colidirem com o núcleo.
    const abertura = Math.PI * 0.84
    const passoCurso = doTema.length > 1 ? abertura / (doTema.length - 1) : 0
    doTema.forEach((curso, j) => {
      const base =
        doTema.length === 1 ? ang : ang - abertura / 2 + passoCurso * j
      // A variação de distância é o que impede o leque de virar um arco de
      // compasso. Constelação de verdade é irregular.
      const rc = RAIO_CURSO + ruido(curso.id, 130)
      const cx = tx + Math.cos(base) * rc
      const cy = ty + Math.sin(base) * rc

      const suasAulas = aulasPorCurso.get(curso.id) ?? []
      const estado = estadoDoCurso(suasAulas)

      astros.push({
        id: curso.id,
        tipo: 'curso',
        rotulo: curso.title,
        href: `/curso/${curso.slug}`,
        x: cx,
        y: cy,
        r: 10,
        estado,
        temaId: tema.id,
        progresso: progressoDoCurso(suasAulas),
        hue,
        detalhe: `${curso.lessonCount} ${curso.lessonCount === 1 ? 'aula' : 'aulas'}`,
      })

      linhas.push({
        de: tema.id,
        para: curso.id,
        forca: estado === 'aceso' ? 0.55 : estado === 'visto' ? 0.3 : 0.14,
      })

      // Aulas orbitando o curso. São pontos, não destinos: o clique útil é o
      // do curso, e uma aula solta no céu não diz de onde veio.
      const passoAula = suasAulas.length > 0 ? (Math.PI * 2) / suasAulas.length : 0
      suasAulas.forEach((aula, k) => {
        const aa = k * passoAula + ruido(aula.id, 0.6)
        const ra = RAIO_AULA + ruido(aula.id + 'r', 16)
        astros.push({
          id: aula.id,
          tipo: 'aula',
          rotulo: aula.title,
          href: null,
          x: cx + Math.cos(aa) * ra,
          y: cy + Math.sin(aa) * ra,
          r: 3.4,
          estado: aula.aplicada ? 'aceso' : aula.vista ? 'visto' : 'apagado',
          temaId: tema.id,
          progresso: 0,
          hue,
          detalhe: null,
        })
        linhas.push({
          de: curso.id,
          para: aula.id,
          forca: aula.aplicada ? 0.42 : aula.vista ? 0.2 : 0.09,
        })
      })
    })
  })

  const xs = astros.map((a) => a.x)
  const ys = astros.map((a) => a.y)

  return {
    astros,
    linhas,
    nucleo,
    limites: {
      minX: Math.min(...xs, -100),
      minY: Math.min(...ys, -100),
      maxX: Math.max(...xs, 100),
      maxY: Math.max(...ys, 100),
    },
  }
}
