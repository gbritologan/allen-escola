/**
 * O endereço que pode ser ESCRITO NUM E-MAIL para outra pessoa.
 *
 * `NEXT_PUBLIC_SITE_URL` vale `http://localhost:3000` em desenvolvimento, e
 * isso está certo: rodando na máquina, o link tem que voltar para a máquina.
 *
 * O problema é que convite e notificação não voltam para a máquina de
 * ninguém — eles saem para a caixa de entrada de uma pessoa real. Um convite
 * disparado do servidor local chega ao convidado apontando para o `localhost`
 * DELE, onde não há nada rodando. O navegador diz "não foi possível conectar
 * ao servidor", e a pessoa conclui, com razão, que a plataforma está fora do
 * ar.
 *
 * Aconteceu exatamente assim, com o sócio do Gabriel, no primeiro convite que
 * a plataforma mandou para alguém de fora.
 *
 * A regra: e-mail que sai para terceiros usa o endereço público de verdade.
 * O ambiente de desenvolvimento pode apontar para a máquina; o que sai dele,
 * para fora, não pode.
 *
 * Isto NÃO se aplica a `/entrar`: ali a pessoa manda o código para si mesma, e
 * quem está em localhost é quem está desenvolvendo — e quer voltar para lá.
 */
export const URL_CANONICA = 'https://app.allenescola.com'

const LOCAIS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?)$|\.local$/i

export function enderecoPublico(bruta: string | undefined | null): string {
  const valor = bruta?.trim()
  if (!valor) return URL_CANONICA

  try {
    const url = new URL(valor)
    if (LOCAIS.test(url.hostname)) return URL_CANONICA
    return valor.replace(/\/+$/, '')
  } catch {
    // Variável malformada é o mesmo caso de variável ausente: não dá para
    // mandar alguém a um endereço que não se sabe ler.
    return URL_CANONICA
  }
}
