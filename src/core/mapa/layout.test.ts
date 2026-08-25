import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  montarMapa,
  ruido,
  type AulaEntrada,
  type CursoEntrada,
  type TemaEntrada,
} from './layout.ts'

const TEMAS: TemaEntrada[] = [
  { id: 't1', slug: 'negociacao', name: 'Negociação' },
  { id: 't2', slug: 'vendas', name: 'Vendas' },
  { id: 't3', slug: 'ia', name: 'IA' },
]

const CURSOS: CursoEntrada[] = [
  { id: 'c1', slug: 'negociar', title: 'Negociar sem sorte', temaId: 't1', lessonCount: 2, durationSeconds: 1200 },
  { id: 'c2', slug: 'prospectar', title: 'Prospectar', temaId: 't2', lessonCount: 1, durationSeconds: 600 },
]

function aula(id: string, courseId: string, vista = false, aplicada = false): AulaEntrada {
  return { id, courseId, title: id, vista, aplicada }
}

test('o céu não se reorganiza entre visitas', () => {
  const a = montarMapa(TEMAS, CURSOS, [aula('a1', 'c1')], 'Gabriel')
  const b = montarMapa(TEMAS, CURSOS, [aula('a1', 'c1')], 'Gabriel')

  // Quem aprendeu onde fica Negociação precisa achar Negociação amanhã.
  assert.deepEqual(
    a.astros.map((x) => [x.id, x.x, x.y]),
    b.astros.map((x) => [x.id, x.x, x.y]),
  )
})

test('o deslocamento é orgânico, mas não é aleatório', () => {
  assert.equal(ruido('mesma-semente', 50), ruido('mesma-semente', 50))
  assert.notEqual(ruido('a', 50), ruido('b', 50))
  assert.ok(Math.abs(ruido('qualquer', 50)) <= 50)
})

test('assistir deixa a estrela cinza; aplicar acende', () => {
  const soVisto = montarMapa(TEMAS, CURSOS, [aula('a1', 'c1', true, false)], 'G')
  const aplicado = montarMapa(TEMAS, CURSOS, [aula('a1', 'c1', true, true)], 'G')

  assert.equal(soVisto.astros.find((a) => a.id === 'c1')?.estado, 'visto')
  assert.equal(aplicado.astros.find((a) => a.id === 'c1')?.estado, 'aceso')
})

test('curso inteiro assistido e nada aplicado não chega perto de 100', () => {
  const aulas = [aula('a1', 'c1', true), aula('a2', 'c1', true)]
  const m = montarMapa(TEMAS, CURSOS, aulas, 'G')
  const curso = m.astros.find((a) => a.id === 'c1')

  assert.ok(curso)
  assert.equal(curso.progresso, 25, 'assistir tudo vale um quarto, e só')
})

test('curso inteiro aplicado chega a 100', () => {
  const aulas = [aula('a1', 'c1', true, true), aula('a2', 'c1', true, true)]
  const m = montarMapa(TEMAS, CURSOS, aulas, 'G')
  assert.equal(m.astros.find((a) => a.id === 'c1')?.progresso, 100)
})

test('a linha da constelação fica mais forte quando o curso é aplicado', () => {
  const apagado = montarMapa(TEMAS, CURSOS, [], 'G')
  const aceso = montarMapa(TEMAS, CURSOS, [aula('a1', 'c1', true, true)], 'G')

  const l1 = apagado.linhas.find((l) => l.para === 'c1')
  const l2 = aceso.linhas.find((l) => l.para === 'c1')

  assert.ok(l1 && l2)
  assert.ok(l2.forca > l1.forca, 'a constelação se revela ao ser feita')
})

test('cada tema vira uma constelação distante das outras', () => {
  const m = montarMapa(TEMAS, CURSOS, [], 'G')
  const anchors = m.astros.filter((a) => a.tipo === 'tema')

  assert.equal(anchors.length, 3)
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const a = anchors[i]!
      const b = anchors[j]!
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      assert.ok(d > 300, `constelações coladas: ${a.rotulo} e ${b.rotulo} a ${Math.round(d)}`)
    }
  }
})

test('curso sem tema não entra no céu — não haveria onde pendurar', () => {
  const orfao: CursoEntrada = {
    id: 'c9', slug: 'x', title: 'Órfão', temaId: null, lessonCount: 1, durationSeconds: 60,
  }
  const m = montarMapa(TEMAS, [...CURSOS, orfao], [], 'G')
  assert.equal(m.astros.find((a) => a.id === 'c9'), undefined)
})

test('o centro conta aplicações, não aulas vistas', () => {
  const m = montarMapa(
    TEMAS, CURSOS,
    [aula('a1', 'c1', true), aula('a2', 'c1', true, true)],
    'Gabriel',
  )
  const centro = m.astros.find((a) => a.tipo === 'centro')
  assert.ok(centro)
  assert.equal(centro.detalhe, '1 aplicação feita')
  assert.equal(centro.estado, 'aceso')
})

test('céu vazio ainda tem limites usáveis', () => {
  const m = montarMapa([], [], [], 'G')
  assert.ok(m.limites.maxX > m.limites.minX)
  assert.ok(m.limites.maxY > m.limites.minY)
})
