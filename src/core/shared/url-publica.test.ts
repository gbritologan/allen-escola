import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { enderecoPublico, URL_CANONICA } from './url-publica.ts'

describe('enderecoPublico', () => {
  it('troca localhost pelo endereço real — este é o bug do convite', () => {
    assert.equal(enderecoPublico('http://localhost:3000'), URL_CANONICA)
    assert.equal(enderecoPublico('http://127.0.0.1:3000'), URL_CANONICA)
    assert.equal(enderecoPublico('http://macbook.local:3000'), URL_CANONICA)
  })

  it('respeita um endereço público de verdade', () => {
    assert.equal(enderecoPublico('https://app.allenescola.com'), 'https://app.allenescola.com')
    assert.equal(enderecoPublico('https://preview.vercel.app'), 'https://preview.vercel.app')
  })

  it('tira a barra do fim para não gerar // no meio do link', () => {
    assert.equal(enderecoPublico('https://app.allenescola.com/'), 'https://app.allenescola.com')
  })

  it('cai no canônico quando a variável falta ou está quebrada', () => {
    assert.equal(enderecoPublico(undefined), URL_CANONICA)
    assert.equal(enderecoPublico(''), URL_CANONICA)
    assert.equal(enderecoPublico('  '), URL_CANONICA)
    assert.equal(enderecoPublico('app.allenescola.com'), URL_CANONICA)
  })
})
