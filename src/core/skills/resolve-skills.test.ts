import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolverSkills, TETO_SEM_PRATICA, type SinalCru } from './resolve-skills.ts'
import type { Skill } from './types.ts'

/**
 * A regra que separa a Allen de um LMS mora em `resolve-skills.ts`, e ela é
 * pura de propósito — dá para provar que está certa sem subir banco, sem
 * renderizar nada e sem mockar Supabase. É para isso que o `core/` existe.
 *
 * Roda com `npm test` (o runner nativo do Node, sem dependência nova).
 */

const NEGOCIACAO: Skill = {
  id: 'skill-neg',
  slug: 'negociacao',
  name: 'Negociação',
  description: null,
}
const VENDAS: Skill = { id: 'skill-ven', slug: 'vendas', name: 'Vendas', description: null }

function aula(skillId: string, sourceId: string, value = 1): SinalCru {
  return { skillId, kind: 'lesson_completed', value, sourceId }
}
function aplicacao(skillId: string, sourceId: string, value = 2): SinalCru {
  return { skillId, kind: 'application_completed', value, sourceId }
}

test('skill sem nenhum sinal fica zerada, e não some da lista', () => {
  const [r] = resolverSkills([NEGOCIACAO], [])
  assert.ok(r)
  assert.equal(r.nivel, 0)
  assert.equal(r.confianca, 0)
  assert.equal(r.estagio, 'inicio')
})

test('assistir muito sem aplicar nunca passa do teto', () => {
  // Vinte aulas concluídas. Em qualquer LMS isso seria "avançado".
  const sinais = Array.from({ length: 20 }, (_, i) => aula(NEGOCIACAO.id, `aula-${i}`))
  const [r] = resolverSkills([NEGOCIACAO], sinais)

  assert.ok(r)
  assert.equal(r.nivel, TETO_SEM_PRATICA)
  assert.equal(r.estagio, 'inicio')
  assert.equal(r.travadoSemPratica, true)
})

test('a primeira aplicação destrava o teto', () => {
  const base = Array.from({ length: 20 }, (_, i) => aula(NEGOCIACAO.id, `aula-${i}`))
  const [travada] = resolverSkills([NEGOCIACAO], base)
  const [livre] = resolverSkills([NEGOCIACAO], [...base, aplicacao(NEGOCIACAO.id, 'aula-0')])

  assert.ok(travada && livre)
  assert.ok(livre.nivel > travada.nivel, 'aplicar precisa mover o número')
  assert.equal(livre.travadoSemPratica, false)
})

test('aplicar vale mais que assistir com o mesmo peso mapeado', () => {
  const soAssistiu = resolverSkills(
    [NEGOCIACAO],
    [aula(NEGOCIACAO.id, 'a1'), aula(NEGOCIACAO.id, 'a2'), aula(NEGOCIACAO.id, 'a3')],
  )[0]
  const aplicou = resolverSkills(
    [NEGOCIACAO],
    [aula(NEGOCIACAO.id, 'a1'), aplicacao(NEGOCIACAO.id, 'a1')],
  )[0]

  assert.ok(soAssistiu && aplicou)
  assert.ok(
    aplicou.nivel > soAssistiu.nivel,
    'uma aula aplicada precisa valer mais que três só vistas',
  )
})

test('confiança cai pela metade quando nada foi aplicado', () => {
  const fontes = Array.from({ length: 6 }, (_, i) => `aula-${i}`)
  const soAulas = resolverSkills([NEGOCIACAO], fontes.map((f) => aula(NEGOCIACAO.id, f)))[0]
  const comPratica = resolverSkills(
    [NEGOCIACAO],
    [...fontes.map((f) => aula(NEGOCIACAO.id, f)), aplicacao(NEGOCIACAO.id, 'aula-0')],
  )[0]

  assert.ok(soAulas && comPratica)
  assert.equal(comPratica.confianca, 1)
  assert.equal(soAulas.confianca, 0.5)
})

test('uma aula repetida não vira variedade: a confiança olha fontes distintas', () => {
  const mesmaAula = Array.from({ length: 6 }, () => aula(NEGOCIACAO.id, 'sempre-a-mesma'))
  const seisAulas = Array.from({ length: 6 }, (_, i) => aula(NEGOCIACAO.id, `aula-${i}`))

  const repetida = resolverSkills([NEGOCIACAO], mesmaAula)[0]
  const variada = resolverSkills([NEGOCIACAO], seisAulas)[0]

  assert.ok(repetida && variada)
  assert.ok(variada.confianca > repetida.confianca)
})

test('"consistente" exige aplicações, não só nível alto', () => {
  // Peso alto o suficiente para o nível estourar 55 numa aplicação só.
  const [r] = resolverSkills([NEGOCIACAO], [aplicacao(NEGOCIACAO.id, 'a1', 30)])
  assert.ok(r)
  assert.ok(r.nivel >= 55)
  assert.equal(r.estagio, 'praticando', 'uma aplicação não faz ninguém consistente')
})

test('a lista sai ordenada pelo nível, com desempate estável pelo nome', () => {
  const r = resolverSkills(
    [NEGOCIACAO, VENDAS],
    [aula(VENDAS.id, 'a1'), aplicacao(VENDAS.id, 'a1')],
  )
  assert.equal(r[0]?.skill.slug, 'vendas')
  assert.equal(r[1]?.skill.slug, 'negociacao')
})

test('o nível satura em vez de crescer para sempre', () => {
  const muitas = Array.from({ length: 200 }, (_, i) => aplicacao(NEGOCIACAO.id, `a-${i}`, 5))
  const [r] = resolverSkills([NEGOCIACAO], muitas)
  assert.ok(r)
  assert.ok(r.nivel <= 100, 'o nível nunca passa de 100')
  assert.equal(r.nivel, 100)
})
