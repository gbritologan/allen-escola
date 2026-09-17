import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { matizDoHex } from './layout.ts'

describe('matizDoHex', () => {
  it('lê o matiz das oito cores dos temas', () => {
    // Os valores reais de 0031. O teste existe para o dia em que alguém trocar
    // uma cor no banco e o Mapa passar a pintar outra coisa sem ninguém notar.
    const esperado: Array<[string, number]> = [
      ['#3CAAFF', 206], // Dados e Tecnologia
      ['#E8A33C', 36], // Ferramentas
      ['#9B6BFF', 259], // Filosofia
      ['#4C41FF', 243], // Inteligência Artificial
      ['#FF6B5E', 5], // Liderança e Gestão
      ['#FF5EA8', 332], // Marketing
      ['#48D6A8', 161], // Softskills
      ['#F2C14E', 42], // Vendas
    ]
    for (const [hex, matiz] of esperado) {
      assert.equal(Math.round(matizDoHex(hex)!), matiz, hex)
    }
  })

  it('as oito são distinguíveis lado a lado', () => {
    const matizes = ['#3CAAFF', '#E8A33C', '#9B6BFF', '#4C41FF', '#FF6B5E', '#FF5EA8', '#48D6A8', '#F2C14E']
      .map((h) => matizDoHex(h)!)
      .sort((a, b) => a - b)

    // Duas cores a menos de 12° de distância lidas lado a lado viram a mesma
    // cor. O par mais próximo aqui é Ferramentas/Vendas (âmbar e dourado), que
    // são vizinhos de propósito — mas precisam ficar acima do limite.
    for (let i = 1; i < matizes.length; i++) {
      const distancia = matizes[i]! - matizes[i - 1]!
      assert.ok(distancia >= 5, `matizes ${matizes[i - 1]} e ${matizes[i]} colam`)
    }
  })

  it('devolve nulo para o que não é hex de seis dígitos', () => {
    assert.equal(matizDoHex('azul'), null)
    assert.equal(matizDoHex('#fff'), null)
    assert.equal(matizDoHex(''), null)
  })

  it('cinza não tem matiz, e isso não é erro', () => {
    assert.equal(matizDoHex('#808080'), 0)
  })
})
