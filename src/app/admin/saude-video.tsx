import { getVideoProvider, videoConfigurado } from '@/lib/video'

/**
 * O PROVEDOR DE VÍDEO ESTÁ RESPONDENDO?
 *
 * Existe por causa de uma tarde perdida: as chaves do Bunny estavam
 * configuradas na Vercel, o Studio abria normalmente, o botão de enviar
 * aparecia — e o envio morria calado porque a chave era inválida. Do lado de
 * quem usa, "não consigo subir aula" sem nenhuma pista.
 *
 * "Configurado" não é "funcionando", e a diferença entre os dois só aparece
 * quando alguém tenta. Esta linha tenta ANTES, e diz.
 *
 * Falha fechada de propósito: qualquer coisa diferente de sucesso vira aviso.
 * Um painel de saúde que erra para o lado do "está tudo bem" é pior que
 * nenhum.
 */
export async function SaudeVideo() {
  if (!videoConfigurado()) {
    return (
      <Aviso>
        O provedor de vídeo não está configurado. Sem isso não há como enviar aulas.
      </Aviso>
    )
  }

  let erro: string | null = null
  try {
    // Uma chamada barata que exige autenticação: se a chave não presta, isto
    // falha igual ao envio falharia — mas aqui, onde dá para avisar.
    await getVideoProvider().getAssetStatus('teste-de-saude')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // 404 é a resposta CERTA para um id que não existe: significa que a chave
    // foi aceita e o Bunny respondeu de verdade.
    if (!/404|not\s*found/i.test(msg)) erro = msg
  }

  if (!erro) return null

  return (
    <Aviso>
      O Bunny recusou a nossa chave, então <strong>enviar aula não vai funcionar</strong>. Pegue a
      API Key da biblioteca em Bunny → Stream → sua biblioteca → aba API, e atualize{' '}
      <code className="text-ink-2">BUNNY_STREAM_API_KEY</code> na Vercel.
    </Aviso>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[rgba(232,177,76,0.4)] bg-[rgba(232,177,76,0.06)] px-5 py-4">
      <p className="max-w-[70ch] text-body text-ink-2">{children}</p>
    </div>
  )
}
