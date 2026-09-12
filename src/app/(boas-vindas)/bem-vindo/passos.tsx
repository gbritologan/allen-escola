'use client'

import { useState } from 'react'
import { Marca } from '@/components/brand/marca'
import { Input } from '@/components/primitives/field'
import { cn } from '@/lib/utils'
import { concluirBoasVindas } from './actions'

export interface CursoParaComecar {
  slug: string
  title: string
  summary: string | null
  temaNome: string | null
}

/**
 * AS BOAS-VINDAS, EM TRÊS PASSOS.
 *
 * O que este onboarding NÃO é: um carrossel explicando onde ficam os botões.
 * Ninguém lê isso, e quem lê esquece antes de precisar. Menu se aprende usando.
 *
 * O que ele é: a REGRA que faz a Allen diferente, uma pergunta que a gente
 * precisa mesmo, e uma escolha que termina DENTRO de um curso.
 *
 * O passo 1 carrega o peso todo. Se a pessoa sair daqui achando que isto é uma
 * biblioteca de vídeos, ela vai consumir e cancelar — e nenhuma tela adiante
 * conserta isso. A frase é a mesma da landing, de propósito: o que foi
 * prometido lá fora é o que se explica aqui dentro.
 *
 * O passo 3 é o que separa isto de um onboarding decorativo. Terminar com
 * "Começar" jogando numa Home zerada desperdiça o único momento em que a
 * pessoa está 100% disposta. Ela sai daqui dentro de uma aula.
 */
export function Passos({
  nome,
  cursos,
}: {
  nome: string
  cursos: CursoParaComecar[]
}) {
  const [passo, setPasso] = useState(0)
  const [empresario, setEmpresario] = useState<'sim' | 'nao' | ''>('')
  const [site, setSite] = useState('')
  const [escolhido, setEscolhido] = useState<string | null>(null)

  const primeiroNome = nome.trim().split(/\s+/)[0] ?? ''

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-10 px-6 py-16">
      <Marca size={26} />

      {/* Três traços, não "1 de 3": o número vira contagem regressiva e
          convida a pular. O traço só diz que é curto. */}
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-0.5 flex-1 rounded-full transition-colors duration-300',
              i <= passo ? 'bg-blue-light' : 'bg-[rgba(243,245,252,0.12)]',
            )}
          />
        ))}
      </div>

      {passo === 0 && (
        <div className="flex flex-col gap-6">
          <h1 className="text-display font-light leading-[1.05]">
            {primeiroNome ? `Bem-vindo, ${primeiroNome}.` : 'Bem-vindo.'}
          </h1>
          <div className="flex flex-col gap-4 text-lead font-light text-ink-2">
            <p>
              Uma coisa antes de começar, porque ela muda como você usa isto aqui:
            </p>
            <p className="text-ink">
              A aula não termina quando o vídeo acaba.{' '}
              <span className="font-strong text-blue-light">Termina quando você faz.</span>
            </p>
            <p className="text-body text-ink-3">
              Cada aula fecha com uma coisa para executar no seu trabalho. Enquanto você não
              registra que fez, ela continua em aberto — e o seu mapa continua apagado. Não é
              cobrança: é que assistir não muda nada, e a gente prefere ser honesto sobre isso.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPasso(1)}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-[var(--radius-control)] bg-blue text-label font-strong text-off-white transition-colors hover:bg-blue-light"
          >
            Entendi
          </button>
        </div>
      )}

      {passo === 1 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-title font-light">Você é empresário?</h1>
            <p className="text-body text-ink-3">
              Serve para a gente entender quem está do outro lado. Nada disso aparece para
              outros alunos.
            </p>
          </div>

          <div className="flex gap-3">
            {(
              [
                ['sim', 'Sim'],
                ['nao', 'Não'],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setEmpresario(valor)}
                className={cn(
                  'flex h-12 flex-1 items-center justify-center rounded-[var(--radius-control)] border text-body transition-colors',
                  empresario === valor
                    ? 'border-[rgba(76,65,255,0.6)] bg-[rgba(76,65,255,0.12)] text-ink'
                    : 'border-line text-ink-2 hover:border-line-strong',
                )}
              >
                {texto}
              </button>
            ))}
          </div>

          {empresario === 'sim' && (
            <div className="flex flex-col gap-2">
              <label htmlFor="site" className="text-label text-ink-2">
                Site da empresa <span className="text-ink-4">(opcional)</span>
              </label>
              <Input
                id="site"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="suaempresa.com.br"
              />
            </div>
          )}

          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPasso(2)}
              className="flex h-12 flex-1 items-center justify-center rounded-[var(--radius-control)] bg-blue text-label font-strong text-off-white transition-colors hover:bg-blue-light"
            >
              Continuar
            </button>
            {/* Pular existe. Obrigar alguém a responder sobre si para entrar
                numa escola que ele já pagou é hostil. */}
            <button
              type="button"
              onClick={() => {
                setEmpresario('')
                setPasso(2)
              }}
              className="text-label text-ink-4 transition-colors hover:text-ink"
            >
              Prefiro não dizer
            </button>
          </div>
        </div>
      )}

      {passo === 2 && (
        <form action={concluirBoasVindas} className="flex flex-col gap-6">
          <input type="hidden" name="is_business" value={empresario} />
          <input type="hidden" name="company_url" value={site} />
          <input
            type="hidden"
            name="destino"
            value={escolhido ? `/curso/${escolhido}` : '/'}
          />

          <div className="flex flex-col gap-2">
            <h1 className="text-title font-light">Por onde você quer começar?</h1>
            <p className="text-body text-ink-3">
              Dá para trocar quando quiser. A Home passa a abrir pelo que você escolher.
            </p>
          </div>

          {cursos.length > 0 ? (
            <div className="flex flex-col gap-2">
              {cursos.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setEscolhido(c.slug)}
                  className={cn(
                    'flex flex-col gap-1 rounded-[var(--radius-card)] border px-5 py-4 text-left transition-colors',
                    escolhido === c.slug
                      ? 'border-[rgba(76,65,255,0.6)] bg-[rgba(76,65,255,0.1)]'
                      : 'border-line hover:border-line-strong',
                  )}
                >
                  {c.temaNome && (
                    <span className="text-caption uppercase tracking-[0.14em] text-ink-4">
                      {c.temaNome}
                    </span>
                  )}
                  <span className="text-body text-ink">{c.title}</span>
                  {c.summary && (
                    <span className="line-clamp-2 text-caption text-ink-3">{c.summary}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-[var(--radius-card)] border border-line px-5 py-4 text-body text-ink-3">
              Os primeiros cursos estão sendo publicados. Você já pode entrar e olhar o Mapa
              enquanto isso.
            </p>
          )}

          <button
            type="submit"
            className="mt-2 flex h-12 w-full items-center justify-center rounded-[var(--radius-control)] bg-blue text-label font-strong text-off-white transition-colors hover:bg-blue-light"
          >
            {escolhido ? 'Começar por este' : 'Entrar na plataforma'}
          </button>
        </form>
      )}
    </main>
  )
}
