import assert from 'node:assert/strict'
import { test } from 'node:test'
import { periodoDoDia, saudacao } from './saudacao.ts'

/** Meia-noite UTC = 21h do dia anterior em São Paulo. É o caso que pega. */
test('21h em Brasília é noite, mesmo com o servidor em UTC à meia-noite', () => {
  assert.equal(periodoDoDia(new Date('2026-09-12T00:00:00Z')), 'noite')
})

test('9h em Brasília é manhã', () => {
  assert.equal(periodoDoDia(new Date('2026-09-11T12:00:00Z')), 'manha')
})

test('14h em Brasília é tarde', () => {
  assert.equal(periodoDoDia(new Date('2026-09-11T17:00:00Z')), 'tarde')
})

test('às 5h já é bom dia — a régua é o hábito, não o nascer do sol', () => {
  assert.equal(periodoDoDia(new Date('2026-09-11T08:00:00Z')), 'manha')
})

test('às 4h59 ainda é noite', () => {
  assert.equal(periodoDoDia(new Date('2026-09-11T07:59:00Z')), 'noite')
})

test('às 18h em ponto vira noite', () => {
  assert.equal(periodoDoDia(new Date('2026-09-11T21:00:00Z')), 'noite')
})

test('a saudação usa só o primeiro nome', () => {
  const noite = new Date('2026-09-12T00:00:00Z')
  assert.equal(saudacao('Gabriel Logan de Brito', noite), 'Boa noite, Gabriel.')
})

test('sem nome, a frase fecha sozinha — nada de vírgula pendurada', () => {
  const noite = new Date('2026-09-12T00:00:00Z')
  assert.equal(saudacao(null, noite), 'Boa noite.')
  assert.equal(saudacao('   ', noite), 'Boa noite.')
})
