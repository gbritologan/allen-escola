'use client'

import Image from 'next/image'
import { useActionState, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/primitives/button'
import {
  caminhoDaImagem,
  type EstadoImagem,
  IMAGEM_PARADA,
  recusaDaImagem,
  TIPOS_IMAGEM,
} from '@/core/shared/imagem'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Acao = (prev: EstadoImagem, formData: FormData) => Promise<EstadoImagem>

/**
 * CAMPO DE IMAGEM — um só, para os cinco lugares que sobem imagem.
 *
 * ─── POR QUE O ARQUIVO NÃO PASSA MAIS PELO SERVIDOR ──────────────────────
 *
 * A tela prometia 8MB. O Next corta o corpo de uma Server Action em **1MB**, e
 * a Vercel corta a requisição de uma função em 4,5MB. Ou seja: toda imagem
 * acima de 1MB estourava com 413 antes de chegar ao nosso código — e o que o
 * Gabriel via era a tela de "alguma coisa quebrou", sem relação aparente com
 * o tamanho do arquivo. Capa, banner, retrato de instrutor, logo de app e
 * foto de perfil: os cinco, pelo mesmo motivo.
 *
 * Levantar o limite do Next não resolveria — o teto da Vercel continua lá, e
 * um teto de 4,5MB ainda é menor que os 8MB anunciados.
 *
 * Então o arquivo deixou de passar pelo servidor. O navegador envia direto
 * para o Storage do Supabase, autenticado, com a RLS do bucket decidindo o
 * que pode (D-11: quem nega é o Postgres). A Server Action recebe só a URL —
 * algumas centenas de bytes — e grava. De quebra, o upload para de gastar
 * tempo de função e de trafegar duas vezes.
 *
 * Como a URL passa a vir do cliente, o servidor confere se ela é mesmo do
 * nosso bucket e da pasta esperada (`urlDoBucket`). Texto vindo do navegador
 * é pedido, não fato.
 *
 * ─── E O RETORNO ─────────────────────────────────────────────────────────
 *
 * Escolher É enviar: a prévia local aparece no instante da escolha e a subida
 * começa sozinha. O desenho antigo pedia dois gestos, e o segundo se perdia —
 * os logs do Storage mostraram envio de capa que nunca chegou ao servidor.
 */
export function CampoImagem({
  atual,
  pasta,
  nomeBase,
  acaoSalvar,
  acaoRemover,
  ocultos = {},
  moldura = 'aspect-video w-full max-w-xl',
  ajuste = 'object-cover',
  rotuloVazio = 'Sem imagem',
  tamanhos = '576px',
}: {
  /** A URL já gravada, ou `null`. */
  atual: string | null
  /** Pasta dentro do bucket: 'capas', 'retratos', 'logos', 'banners', 'avatares'. */
  pasta: string
  /** Começo do nome do arquivo — normalmente o slug ou o id. */
  nomeBase: string
  acaoSalvar: Acao
  acaoRemover?: Acao
  /** Campos escondidos que a ação precisa, como `id` e `slug`. */
  ocultos?: Record<string, string>
  /** Classes da moldura da prévia. Cada tela tem a sua proporção. */
  moldura?: string
  ajuste?: string
  rotuloVazio?: string
  tamanhos?: string
}) {
  const [estado, salvar, salvando] = useActionState(acaoSalvar, IMAGEM_PARADA)
  const [removido, remover, removendo] = useActionState(
    acaoRemover ?? (async () => IMAGEM_PARADA),
    IMAGEM_PARADA,
  )

  const [previa, setPrevia] = useState<{ blob: string; atualNaEpoca: string | null } | null>(null)
  const [subindo, setSubindo] = useState(false)
  const [recusa, setRecusa] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const destino = useRef<HTMLInputElement>(null)

  const blob = previa?.blob ?? null
  // Object URL é memória alocada: sem revoke, trocar de arquivo dez vezes
  // deixa dez imagens presas até a aba fechar.
  useEffect(() => () => { if (blob) URL.revokeObjectURL(blob) }, [blob])

  /**
   * A prévia guarda qual era a imagem quando foi criada. É isso que a faz sair
   * de cena sozinha quando a gravação termina e a revalidação traz outra
   * `atual` — sem `useEffect` sincronizando estado com estado.
   */
  const previaValida = previa && previa.atualNaEpoca === atual ? previa.blob : null
  const ocupado = subindo || salvando || removendo

  async function escolheu(arquivo: File | undefined) {
    setRecusa(null)
    if (!arquivo) return setPrevia(null)

    const limpar = () => {
      setPrevia(null)
      if (campo.current) campo.current.value = ''
    }

    const motivo = recusaDaImagem(arquivo.type, arquivo.size)
    if (motivo) {
      limpar()
      setRecusa(motivo)
      return
    }

    setPrevia({ blob: URL.createObjectURL(arquivo), atualNaEpoca: atual })
    setSubindo(true)

    const supabase = createClient()
    const caminho = caminhoDaImagem(pasta, nomeBase, arquivo.type)
    const { error } = await supabase.storage
      .from('imagens')
      .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })

    setSubindo(false)

    if (error) {
      limpar()
      setRecusa(
        'Não consegui enviar a imagem para o armazenamento. Confira sua conexão e tente de novo.',
      )
      return
    }

    const { data } = supabase.storage.from('imagens').getPublicUrl(caminho)
    if (destino.current) destino.current.value = data.publicUrl
    form.current?.requestSubmit()
  }

  const mostrando = previaValida ?? atual
  const erro = recusa ?? estado.erro ?? removido.erro

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          'relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-navy',
          moldura,
        )}
      >
        {mostrando ? (
          previaValida ? (
            /* Arquivo local: `next/image` só otimiza host conhecido, e um
               blob: não é. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previaValida} alt="" className={cn('absolute inset-0 size-full', ajuste)} />
          ) : (
            <Image src={mostrando} alt="" fill sizes={tamanhos} className={ajuste} />
          )
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center">
            <span className="text-caption text-ink-4">{rotuloVazio}</span>
          </div>
        )}

        {ocupado && (
          <span className="absolute bottom-2 left-2 rounded-[var(--radius-control)] bg-[rgba(5,7,20,0.78)] px-2 py-1 text-caption text-ink-2">
            {removendo ? 'Removendo…' : subindo ? 'Enviando…' : 'Gravando…'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form ref={form} action={salvar} className="flex items-center gap-3">
          {Object.entries(ocultos).map(([nome, valor]) => (
            <input key={nome} type="hidden" name={nome} value={valor} />
          ))}
          <input ref={destino} type="hidden" name="url" defaultValue="" />
          <input
            ref={campo}
            type="file"
            accept={TIPOS_IMAGEM.join(',')}
            disabled={ocupado}
            onChange={(e) => void escolheu(e.target.files?.[0])}
            className="max-w-[15rem] text-caption text-ink-3 file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-caption file:text-ink-2"
          />
        </form>

        {acaoRemover && atual && !previaValida && !ocupado && (
          <form action={remover}>
            {Object.entries(ocultos).map(([nome, valor]) => (
              <input key={nome} type="hidden" name={nome} value={valor} />
            ))}
            <Button type="submit" size="sm" variant="ghost">
              Remover
            </Button>
          </form>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-caption text-critical">
          {erro}
        </p>
      )}
    </div>
  )
}
