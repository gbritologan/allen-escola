import assert from 'node:assert/strict'
import { test } from 'node:test'
import { destinoDepoisDoLogin } from './destino.ts'

test('quem foi barrado no meio de uma aula volta para a aula', () => {
  assert.equal(destinoDepoisDoLogin('/curso/negociar/abertura'), '/curso/negociar/abertura')
})

test('o Mapa não vale a volta: é vista, não conteúdo', () => {
  assert.equal(destinoDepoisDoLogin('/mapa'), '/')
  assert.equal(destinoDepoisDoLogin('/mapa?foco=t1'), '/')
})

test('destino externo vira home — redirecionamento aberto é porta de phishing', () => {
  assert.equal(destinoDepoisDoLogin('//evil.com'), '/')
  assert.equal(destinoDepoisDoLogin('https://evil.com'), '/')
})

test('sem destino, home', () => {
  assert.equal(destinoDepoisDoLogin(null), '/')
  assert.equal(destinoDepoisDoLogin(''), '/')
})

test('uma rota que só COMEÇA com o nome de uma vista continua valendo', () => {
  assert.equal(destinoDepoisDoLogin('/mapeamento'), '/mapeamento')
})
