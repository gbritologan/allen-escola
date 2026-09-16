import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { caminhoDaImagem, extensaoDaImagem, recusaDaImagem, urlDoBucket } from './imagem.ts'

const SUPA = 'https://projeto.supabase.co'

describe('recusaDaImagem', () => {
  it('aceita os quatro formatos dentro do limite', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/avif']) {
      assert.equal(recusaDaImagem(t, 500_000), null)
    }
  })

  it('recusa formato de fora da lista', () => {
    assert.match(recusaDaImagem('image/gif', 1000)!, /Formato não aceito/)
    assert.match(recusaDaImagem('application/pdf', 1000)!, /Formato não aceito/)
  })

  it('recusa acima de 8MB com o tamanho na frase', () => {
    const motivo = recusaDaImagem('image/png', 12 * 1024 * 1024)!
    assert.match(motivo, /12\.0MB/)
    assert.match(motivo, /8MB/)
  })

  it('o limite é inclusivo: 8MB exatos passam', () => {
    assert.equal(recusaDaImagem('image/png', 8 * 1024 * 1024), null)
  })

  it('arquivo vazio é recusa própria, não "formato"', () => {
    assert.match(recusaDaImagem('image/png', 0)!, /Nenhum arquivo/)
  })
})

describe('extensaoDaImagem', () => {
  it('jpeg vira jpg — o resto passa direto', () => {
    assert.equal(extensaoDaImagem('image/jpeg'), 'jpg')
    assert.equal(extensaoDaImagem('image/png'), 'png')
    assert.equal(extensaoDaImagem('image/avif'), 'avif')
  })
})

describe('caminhoDaImagem', () => {
  it('carrega pasta, nome e um sufixo que muda a cada envio', () => {
    const a = caminhoDaImagem('capas', 'negociacao', 'image/png')
    assert.match(a, /^capas\/negociacao-\d+\.png$/)
  })
})

describe('urlDoBucket', () => {
  const boa = `${SUPA}/storage/v1/object/public/imagens/avatares/abc-1.png`

  it('aceita o que veio da pasta certa do nosso bucket', () => {
    assert.equal(urlDoBucket(boa, SUPA, 'avatares'), true)
  })

  it('recusa outra pasta — é assim que o aluno não grava em capas', () => {
    assert.equal(urlDoBucket(boa, SUPA, 'capas'), false)
  })

  it('recusa host de fora, mesmo com o caminho igual', () => {
    const forjada = `https://malicioso.exemplo/storage/v1/object/public/imagens/avatares/x.png`
    assert.equal(urlDoBucket(forjada, SUPA, 'avatares'), false)
  })

  it('recusa subir de pasta com barra no nome', () => {
    const fundo = `${SUPA}/storage/v1/object/public/imagens/avatares/../capas/x.png`
    assert.equal(urlDoBucket(fundo, SUPA, 'avatares'), false)
  })

  it('tolera barra sobrando na variável de ambiente', () => {
    assert.equal(urlDoBucket(boa, `${SUPA}/`, 'avatares'), true)
  })
})
