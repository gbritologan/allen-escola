/**
 * O ESTADO DO ACESSO DE ALGUÉM.
 *
 * Puro e testado, porque esta é a regra que decide se um cliente que pagou
 * consegue entrar. `has_access()` no banco é o portão de verdade — ninguém
 * contorna a RLS. Esta função existe para a INTERFACE saber o que dizer, e as
 * duas precisam concordar: se divergirem, a pessoa vê "acesso ativo" numa tela
 * vazia, que é a pior combinação possível.
 */

export type EstadoAcesso =
  /** Pode entrar agora. */
  | 'ativo'
  /** Condição registrada, mas a data de início ainda não chegou. */
  | 'aguardando'
  /** Passou da data de fim. */
  | 'encerrado'
  /** Desligado à mão pela equipe. */
  | 'suspenso'

export interface Assinatura {
  status: string
  startedAt: string | Date
  endsAt: string | Date | null
}

export interface Acesso {
  estado: EstadoAcesso
  inicio: Date
  /** Nulo = sem prazo. */
  fim: Date | null
  /**
   * Dias inteiros até o fim, contando a partir de agora. Nulo quando não há
   * prazo, e nunca negativo — depois do fim o estado já é 'encerrado', e
   * "-3 dias restantes" não é informação, é enigma.
   */
  diasRestantes: number | null
}

const DIA = 86_400_000

export function avaliarAcesso(assinatura: Assinatura, agora: Date = new Date()): Acesso {
  const inicio = new Date(assinatura.startedAt)
  const fim = assinatura.endsAt ? new Date(assinatura.endsAt) : null

  const diasRestantes = fim ? Math.max(0, Math.ceil((fim.getTime() - agora.getTime()) / DIA)) : null

  // A ordem importa. Suspenso ganha de tudo: é decisão da equipe, e mostrar
  // "aguardando 1º de setembro" para quem foi desligado seria mentira.
  if (assinatura.status !== 'active') {
    return { estado: 'suspenso', inicio, fim, diasRestantes }
  }
  if (agora < inicio) {
    return { estado: 'aguardando', inicio, fim, diasRestantes }
  }
  if (fim && agora >= fim) {
    return { estado: 'encerrado', inicio, fim, diasRestantes: 0 }
  }
  return { estado: 'ativo', inicio, fim, diasRestantes }
}

/** Data por extenso, como a pessoa lê — não "2027-09-01". */
export function porExtenso(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

/**
 * A frase que o aluno lê sobre o próprio acesso.
 *
 * Fica aqui, e não na página, porque a mesma frase aparece em três telas — e
 * três cópias divergem no dia em que uma delas muda.
 */
export function fraseDoAcesso(acesso: Acesso): string {
  switch (acesso.estado) {
    case 'aguardando':
      return `Seu acesso começa em ${porExtenso(acesso.inicio)}.`
    case 'encerrado':
      return `Seu acesso terminou em ${porExtenso(acesso.fim!)}.`
    case 'suspenso':
      return 'Seu acesso está suspenso. Fale com a gente pelo Suporte.'
    case 'ativo':
      if (!acesso.fim) return 'Acesso liberado, sem data de término.'
      // Abaixo de 30 dias a contagem vira o assunto; acima, a data basta.
      return acesso.diasRestantes !== null && acesso.diasRestantes <= 30
        ? `Seu acesso vai até ${porExtenso(acesso.fim)} — faltam ${acesso.diasRestantes} ${acesso.diasRestantes === 1 ? 'dia' : 'dias'}.`
        : `Seu acesso vai até ${porExtenso(acesso.fim)}.`
  }
}
