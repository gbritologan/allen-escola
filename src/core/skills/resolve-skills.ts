import type { SignalKind, Skill } from './types'
import type { UUID } from '../shared/types'

/**
 * LER OS SINAIS.
 *
 * Desde a migration 0005 a plataforma grava `skill_signals` a cada aula
 * concluída e a cada aplicação marcada. Este arquivo é a primeira vez que
 * alguém lê aquilo — e a leitura precisa dizer a mesma coisa que o produto diz.
 *
 * A tese: "a unidade mínima da Allen não é a aula assistida, é a aplicação
 * feita". Se o número na tela subisse igual assistindo e aplicando, a tese
 * viraria slogan. Então ela está escrita aqui, em três regras:
 *
 * 1. O peso já chega dobrado do banco — `emit_application_signals` grava
 *    `weight * 2`. Isso é inclinação, não decisão.
 * 2. AQUI, ASSISTIR AINDA CONTA PELA METADE (`PESO_ESTUDO`). Junto com o dobro
 *    do banco, uma aplicação vale quatro aulas vistas. Sem esta linha, três
 *    aulas assistidas davam exatamente o mesmo número que uma aula aplicada —
 *    aritmeticamente coerente e, para o produto, errado.
 * 3. SEM NENHUMA APLICAÇÃO, O NÍVEL NÃO PASSA DE `TETO_SEM_PRATICA`. Vinte
 *    aulas assistidas sobre negociação e zero negociações conduzidas não é
 *    habilidade — é conteúdo consumido, e a tela precisa conseguir dizer isso.
 *
 * Módulo puro: sem React, sem Supabase, sem `fetch` (D-01). Dá para testar a
 * regra inteira sem subir banco, e é o que o arquivo ao lado faz.
 */

/** Entrada crua, como sai de `skill_signals`. */
export interface SinalCru {
  skillId: UUID
  kind: SignalKind
  value: number
  /** A aula (ou curso) que originou o sinal. Usado para medir variedade. */
  sourceId: UUID | null
}

export type EstagioSkill = 'inicio' | 'praticando' | 'consistente'

export interface SkillResolvida {
  skill: Skill
  /** 0–100. Orientação, não medida científica. */
  nivel: number
  /** 0–1. Quanta evidência sustenta o número acima. */
  confianca: number
  estagio: EstagioSkill
  aulas: number
  aplicacoes: number
  /** Verdadeiro quando só falta praticar para o nível voltar a subir. */
  travadoSemPratica: boolean
}

/**
 * Onde o nível para quando não houve nenhuma aplicação.
 *
 * 40 e não 0: seria desonesto zerar quem estudou de verdade. E não 70: aí
 * assistir bastaria, e a Allen viraria a escola que ela se recusa a ser.
 */
export const TETO_SEM_PRATICA = 40

/**
 * Constante da curva de saturação.
 *
 * O nível cresce rápido no começo e desacelera — quem nunca tocou no assunto
 * ganha muito com a primeira aplicação; quem já fez quinze ganha pouco com a
 * décima sexta. Linear mentiria nas duas pontas.
 */
const ESCALA = 14

/**
 * Quanto uma aula assistida vale, comparada a uma aplicação de mesmo peso.
 *
 * Metade. Com o dobro que o banco já grava na aplicação, o resultado é 4:1 —
 * quatro aulas vistas para empatar com uma coisa feita. É a tese do produto
 * expressa como número, e é o número que qualquer pessoa da equipe pode
 * discordar e mudar aqui, num lugar só.
 */
const PESO_ESTUDO = 0.5

/** Quantas fontes distintas até a confiança chegar ao máximo. */
const FONTES_PARA_CONFIANCA_PLENA = 6

export function resolverSkills(
  skills: readonly Skill[],
  sinais: readonly SinalCru[],
): SkillResolvida[] {
  const porSkill = new Map<
    UUID,
    { estudo: number; pratica: number; aulas: number; aplicacoes: number; fontes: Set<string> }
  >()

  for (const sinal of sinais) {
    const atual = porSkill.get(sinal.skillId) ?? {
      estudo: 0,
      pratica: 0,
      aulas: 0,
      aplicacoes: 0,
      fontes: new Set<string>(),
    }

    if (sinal.kind === 'application_completed') {
      atual.pratica += sinal.value
      atual.aplicacoes += 1
    } else {
      atual.estudo += sinal.value
      if (sinal.kind === 'lesson_completed') atual.aulas += 1
    }

    if (sinal.sourceId) atual.fontes.add(sinal.sourceId)
    porSkill.set(sinal.skillId, atual)
  }

  return skills
    .map((skill): SkillResolvida => {
      const d = porSkill.get(skill.id)
      if (!d) {
        return {
          skill,
          nivel: 0,
          confianca: 0,
          estagio: 'inicio',
          aulas: 0,
          aplicacoes: 0,
          travadoSemPratica: false,
        }
      }

      const bruto = d.estudo * PESO_ESTUDO + d.pratica
      const cru = Math.round(100 * (1 - Math.exp(-bruto / ESCALA)))

      const semPratica = d.aplicacoes === 0
      const nivel = semPratica ? Math.min(cru, TETO_SEM_PRATICA) : cru

      // Confiança cai pela metade sem prática: o número pode até estar certo,
      // mas nada o sustenta além de vídeo assistido.
      const porVariedade = Math.min(1, d.fontes.size / FONTES_PARA_CONFIANCA_PLENA)
      const confianca = Number((semPratica ? porVariedade / 2 : porVariedade).toFixed(2))

      return {
        skill,
        nivel,
        confianca,
        estagio: estagioDe(d.aplicacoes, nivel),
        aulas: d.aulas,
        aplicacoes: d.aplicacoes,
        travadoSemPratica: semPratica && cru > TETO_SEM_PRATICA,
      }
    })
    .sort((a, b) => b.nivel - a.nivel || a.skill.name.localeCompare(b.skill.name, 'pt-BR'))
}

/**
 * O estágio é contado em aplicações, nunca em nível.
 *
 * É o rótulo que a pessoa lê primeiro, e ele responde "o que eu já fiz?" — não
 * "quanto o sistema acha que eu sei?".
 */
function estagioDe(aplicacoes: number, nivel: number): EstagioSkill {
  if (aplicacoes === 0) return 'inicio'
  if (aplicacoes >= 4 && nivel >= 55) return 'consistente'
  return 'praticando'
}

export const ROTULO_ESTAGIO: Record<EstagioSkill, string> = {
  inicio: 'começando',
  praticando: 'praticando',
  consistente: 'consistente',
}
