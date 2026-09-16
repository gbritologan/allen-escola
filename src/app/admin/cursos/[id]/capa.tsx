'use client'

import Image from 'next/image'
import { useActionState, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/primitives/button'
import { enviarCapa, removerCapa } from './actions'
import { CAPA_PARADA } from './capa-estado'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const LIMITE = 8 * 1024 * 1024

/**
 * A CAPA DO CURSO.
 *
 * Mostra a imagem no formato em que ela aparece para o aluno (16:9), não num
 * quadradinho de miniatura. Capa cortada é o defeito mais comum desse tipo de
 * campo, e ele só aparece quando já está no ar.
 *
 * ─── O QUE ESTAVA ERRADO ─────────────────────────────────────────────────
 *
 * O Gabriel disse que a capa "não fica no curso". Os logs do Supabase deram o
 * veredito: NENHUMA tentativa de envio de capa chegou ao servidor. O arquivo
 * nunca saiu da máquina dele.
 *
 * O motivo é o desenho antigo: escolher o arquivo era um gesto, e enviar era
 * OUTRO, num botão pequeno ao lado. Quem escolhe um arquivo num campo de
 * imagem acredita, com toda razão, que acabou de enviar a imagem — o nome do
 * arquivo aparece ali, afinal. O segundo clique não é esquecido por descuido;
 * ele é invisível porque nada na tela pede por ele.
 *
 * E se o envio falhasse, a ação dava `return` calada: nem erro, nem imagem.
 *
 * ─── O QUE MUDOU ─────────────────────────────────────────────────────────
 *
 * Escolher É enviar. O arquivo aparece no quadro no mesmo instante — o
 * navegador já tem a imagem, não custa nada — e a subida começa sozinha. Um
 * gesto, um resultado, como em qualquer ferramenta que ele já usa.
 *
 * O botão continua existindo, mas como REENVIO: ele é o que salva a situação
 * quando a rede cai no meio, e some do caminho no resto do tempo.
 *
 * Tamanho e tipo são conferidos aqui, antes de subir, com a medida do arquivo
 * dentro da frase. Não adianta gastar trinta segundos de upload para o
 * servidor dizer que 12MB não cabem.
 *
 * A prévia guarda qual era a capa quando foi criada, e é assim que ela sai de
 * cena sozinha quando a gravação termina: a comparação falha, a prévia deixa
 * de valer, e a verdade volta a ser o arquivo do servidor.
 */
export function Capa({
  id,
  slug,
  coverUrl,
}: {
  id: string
  slug: string
  coverUrl: string | null
}) {
  const [estado, enviar, enviando] = useActionState(enviarCapa, CAPA_PARADA)
  const [removido, remover, removendo] = useActionState(removerCapa, CAPA_PARADA)
  const [previa, setPrevia] = useState<{ blob: string; capaNaEpoca: string | null } | null>(null)
  const [recusa, setRecusa] = useState<string | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  const form = useRef<HTMLFormElement>(null)

  const blob = previa?.blob ?? null
  // Object URL é memória alocada: sem revoke, trocar de arquivo dez vezes
  // deixa dez imagens presas até a aba fechar.
  useEffect(() => () => { if (blob) URL.revokeObjectURL(blob) }, [blob])

  const previaValida = previa && previa.capaNaEpoca === coverUrl ? previa.blob : null

  function escolheu(arquivo: File | undefined) {
    setRecusa(null)
    if (!arquivo) return setPrevia(null)

    const recusar = (motivo: string) => {
      setPrevia(null)
      setRecusa(motivo)
      if (campo.current) campo.current.value = ''
    }

    if (!TIPOS.includes(arquivo.type)) {
      return recusar('Formato não aceito. Use JPG, PNG, WebP ou AVIF.')
    }
    if (arquivo.size > LIMITE) {
      const mb = (arquivo.size / 1024 / 1024).toFixed(1)
      return recusar(`A imagem tem ${mb}MB. O limite é 8MB — exporte menor e tente de novo.`)
    }

    setPrevia({ blob: URL.createObjectURL(arquivo), capaNaEpoca: coverUrl })
    // Escolher é enviar. Sem isto, o arquivo fica parado no campo esperando um
    // clique que ninguém sabe que precisa dar.
    form.current?.requestSubmit()
  }

  const mostrando = previaValida ?? coverUrl
  const erro = recusa ?? estado.erro ?? removido.erro
  const ocupado = enviando || removendo

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-title font-light">Capa</h2>
        <p className="text-caption text-ink-4">
          16:9, pelo menos 1280×720. JPG, PNG, WebP ou AVIF, até 8MB. Escolher o arquivo já
          envia. Sem capa, o cartão do curso aparece só com o texto — o que é um estado
          legítimo, não um erro.
        </p>
      </div>

      <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-[var(--radius-card)] border border-line bg-navy">
        {mostrando ? (
          previaValida ? (
            /* Arquivo local: `next/image` só otimiza host conhecido, e um
               blob: não é. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previaValida} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <Image src={mostrando} alt="" fill sizes="576px" className="object-cover" />
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-caption text-ink-4">Sem capa</span>
          </div>
        )}

        {ocupado && (
          <span className="absolute bottom-2 left-2 rounded-[var(--radius-control)] bg-[rgba(5,7,20,0.78)] px-2 py-1 text-caption text-ink-2">
            {enviando ? 'Enviando…' : 'Removendo…'}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form ref={form} action={enviar} className="flex items-center gap-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="slug" value={slug} />
          <input
            ref={campo}
            type="file"
            name="arquivo"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required
            disabled={ocupado}
            onChange={(e) => escolheu(e.target.files?.[0])}
            className="max-w-[16rem] text-caption text-ink-3 file:mr-3 file:rounded-[var(--radius-control)] file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-caption file:text-ink-2"
          />
          {/* Só aparece quando serve para alguma coisa: depois de uma falha,
              para tentar de novo sem reabrir o seletor de arquivo. */}
          {estado.erro && !enviando && (
            <Button type="submit" size="sm" variant="secondary">
              Tentar de novo
            </Button>
          )}
        </form>

        {coverUrl && !ocupado && (
          <form action={remover}>
            <input type="hidden" name="id" value={id} />
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
    </section>
  )
}
