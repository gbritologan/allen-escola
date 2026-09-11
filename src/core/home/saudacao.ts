/**
 * A SAUDAÇÃO PELA HORA DO DIA.
 *
 * Parece detalhe e tem uma armadilha: a Home é renderizada NO SERVIDOR, e o
 * servidor da Vercel roda em UTC. `new Date().getHours()` devolveria 0 para
 * quem está às 21h em São Paulo — e o aluno leria "Bom dia" na hora de
 * dormir. Um erro desses não parece bug, parece descuido, e é o tipo de coisa
 * que faz o produto perder credibilidade em silêncio.
 *
 * Por isso o fuso é EXPLÍCITO, e é o de Brasília: a Allen vende para o Brasil.
 *
 * (Deixar a saudação no cliente resolveria o fuso e criaria outro problema:
 * o texto piscaria na hidratação, trocando na frente da pessoa.)
 */

const FUSO = 'America/Sao_Paulo'

export type Periodo = 'manha' | 'tarde' | 'noite'

/** A hora em São Paulo, seja qual for o fuso de quem está executando. */
export function horaEmBrasilia(agora: Date = new Date()): number {
  const formatador = new Intl.DateTimeFormat('pt-BR', {
    hour: 'numeric',
    hour12: false,
    timeZone: FUSO,
  })
  // `hourCycle` h23 devolve "24" para meia-noite em alguns ambientes.
  return Number(formatador.format(agora)) % 24
}

/**
 * Os cortes.
 *
 * 5h e 18h em vez de 6h e 19h porque a régua aqui é o hábito brasileiro:
 * às 5h30 já se diz "bom dia", e às 18h já se diz "boa noite".
 */
export function periodoDoDia(agora: Date = new Date()): Periodo {
  const hora = horaEmBrasilia(agora)
  if (hora >= 5 && hora < 12) return 'manha'
  if (hora >= 12 && hora < 18) return 'tarde'
  return 'noite'
}

const SAUDACAO: Record<Periodo, string> = {
  manha: 'Bom dia',
  tarde: 'Boa tarde',
  noite: 'Boa noite',
}

/**
 * "Boa noite, Gabriel." — só o primeiro nome.
 *
 * Nome completo numa saudação soa como cobrança de banco. E se não houver
 * nome, a frase fecha sozinha sem vírgula pendurada.
 */
export function saudacao(nomeCompleto: string | null | undefined, agora: Date = new Date()): string {
  const base = SAUDACAO[periodoDoDia(agora)]
  const primeiro = (nomeCompleto ?? '').trim().split(/\s+/)[0]
  return primeiro ? `${base}, ${primeiro}.` : `${base}.`
}
