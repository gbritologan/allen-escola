import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { emBreve } from './types.ts'

const HOJE = new Date('2026-09-18T12:00:00Z')

describe('emBreve', () => {
  it('data no futuro segura o curso', () => {
    assert.equal(emBreve({ availableAt: '2026-10-01T00:00:00Z' }, HOJE), true)
  })

  it('data no passado libera — o curso abre sozinho, sem ninguém voltar lá', () => {
    assert.equal(emBreve({ availableAt: '2026-09-01T00:00:00Z' }, HOJE), false)
  })

  it('sem data e sem interruptor, está aberto', () => {
    assert.equal(emBreve({ availableAt: null }, HOJE), false)
  })

  it('o interruptor segura mesmo sem data nenhuma', () => {
    assert.equal(emBreve({ availableAt: null, comingSoon: true }, HOJE), true)
  })

  it('o interruptor VENCE uma data já vencida', () => {
    // O caso que motivou os dois mecanismos: a data passou, mas alguém decidiu
    // segurar. Quem espera uma pessoa não pode ser destravado pelo relógio.
    assert.equal(emBreve({ availableAt: '2026-01-01T00:00:00Z', comingSoon: true }, HOJE), true)
  })

  it('interruptor desligado não libera uma data futura', () => {
    assert.equal(
      emBreve({ availableAt: '2026-12-01T00:00:00Z', comingSoon: false }, HOJE),
      true,
    )
  })
})
