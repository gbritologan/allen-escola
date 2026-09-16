import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pontosDoTexto, textoDosPontos } from './aprendizado.ts'

describe('pontosDoTexto', () => {
  it('uma linha vira um ponto', () => {
    assert.deepEqual(pontosDoTexto('Falar em público\nEstruturar uma fala'), [
      'Falar em público',
      'Estruturar uma fala',
    ])
  })

  it('linha de respiro não vira item vazio', () => {
    assert.deepEqual(pontosDoTexto('Um\n\n\nDois\n'), ['Um', 'Dois'])
  })

  it('tira o marcador que a pessoa digitou — quem desenha o ponto é a interface', () => {
    assert.deepEqual(pontosDoTexto('- Um\n• Dois\n* Três\n— Quatro'), [
      'Um',
      'Dois',
      'Três',
      'Quatro',
    ])
  })

  it('não come hífen do meio da frase', () => {
    assert.deepEqual(pontosDoTexto('Técnica passo-a-passo'), ['Técnica passo-a-passo'])
  })

  it('texto vazio ou só espaço vira lista vazia, nunca [""]', () => {
    assert.deepEqual(pontosDoTexto(''), [])
    assert.deepEqual(pontosDoTexto('   \n  \n'), [])
  })

  it('corta em 12 — promessa que não cabe na tela não é promessa, é lista', () => {
    const muitos = Array.from({ length: 30 }, (_, i) => `Ponto ${i}`).join('\n')
    assert.equal(pontosDoTexto(muitos).length, 12)
  })
})

describe('textoDosPontos', () => {
  it('volta ao formato de digitação', () => {
    assert.equal(textoDosPontos(['Um', 'Dois']), 'Um\nDois')
  })

  it('nulo e vazio viram string vazia, não "null"', () => {
    assert.equal(textoDosPontos(null), '')
    assert.equal(textoDosPontos([]), '')
  })

  it('ida e volta preserva o conteúdo', () => {
    const pontos = ['Falar em público', 'Ler a plateia']
    assert.deepEqual(pontosDoTexto(textoDosPontos(pontos)), pontos)
  })
})
