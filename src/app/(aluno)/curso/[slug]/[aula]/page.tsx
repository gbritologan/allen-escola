import { redirect } from 'next/navigation'

/**
 * A ROTA ANTIGA DA AULA, AGORA UMA PONTE.
 *
 * Cada aula tinha a própria página. Ela virou uma aula dentro da página do
 * curso (a Sala de Aula), e o endereço passou a ser `?aula=` na mesma URL.
 *
 * Esta rota não some, e não pode sumir: TODA anotação que alguém já escreveu
 * guarda um link no formato antigo, com o minuto junto. Apagar a rota
 * transformaria o caderno de um aluno numa lista de links mortos — e quem
 * perdeu seis meses de notas não aceita "mudamos a arquitetura" como
 * explicação.
 *
 * Então ela redireciona, preservando o `?t=`. Endereço público é contrato:
 * pode mudar de forma, não pode parar de levar ao mesmo lugar.
 */
export default async function AulaAntigaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; aula: string }>
  searchParams: Promise<{ t?: string }>
}) {
  const { slug, aula } = await params
  const { t } = await searchParams

  const consulta = new URLSearchParams({ aula })
  if (t) consulta.set('t', t)

  redirect(`/curso/${slug}?${consulta.toString()}`)
}
