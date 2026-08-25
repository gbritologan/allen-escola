import 'server-only'

/**
 * ENVIO DE E-MAIL — Resend, pela API HTTP.
 *
 * O Resend já entrega os e-mails de login, mas por outro caminho: o Supabase
 * fala SMTP com ele. Isto aqui é o app falando direto, para o que o Supabase
 * não manda — aviso de chamado novo, resposta do suporte.
 *
 * Sem SDK: é uma requisição POST. Uma dependência a mais para montar um JSON
 * não se paga, e o `fetch` do Node já faz o trabalho.
 *
 * NUNCA LANÇA. E-mail é aviso, não transação: se o Resend estiver fora do ar,
 * o chamado do aluno tem que ser gravado do mesmo jeito. Falha aqui vira log,
 * não erro na cara de quem estava pedindo ajuda.
 */

const REMETENTE = 'Allen Escola <escola@allenescola.com>'

export interface Email {
  para: string | string[]
  assunto: string
  texto: string
  /** Para onde a resposta vai. Deixa o suporte responder pelo próprio e-mail. */
  responderPara?: string
}

export async function enviarEmail({ para, assunto, texto, responderPara }: Email): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY
  if (!chave) {
    // Em desenvolvimento isso é o normal, e não deve poluir o console de erro.
    console.info('[email] RESEND_API_KEY ausente — e-mail não enviado:', assunto)
    return false
  }

  try {
    const resposta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: Array.isArray(para) ? para : [para],
        subject: assunto,
        text: texto,
        ...(responderPara ? { reply_to: responderPara } : {}),
      }),
    })

    if (!resposta.ok) {
      console.error('[email] Resend recusou:', resposta.status, await resposta.text())
      return false
    }
    return true
  } catch (erro) {
    console.error('[email] falhou:', erro)
    return false
  }
}

/**
 * Para onde vão os avisos de suporte.
 *
 * Variável de ambiente e não constante: quando houver mais de uma pessoa
 * atendendo, muda sem deploy.
 */
export function caixaDoSuporte(): string {
  return process.env.SUPPORT_EMAIL ?? 'resolvegabriel@gmail.com'
}
