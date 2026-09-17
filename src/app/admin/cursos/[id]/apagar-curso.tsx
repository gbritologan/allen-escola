'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { apagarCurso } from './actions'

/**
 * A ZONA DE APAGAR.
 *
 * Fechada por padrão, no fim da página, com a consequência escrita em números
 * reais — não em "esta ação é irreversível", que ninguém lê porque está em
 * toda parte.
 *
 * A trava é digitar o título. Botão com "tem certeza?" treina a pessoa a
 * clicar duas vezes sem ler; digitar o nome obriga a olhar QUAL curso está na
 * tela. É a diferença entre confirmar e conferir.
 */
export function ApagarCurso({
  id,
  titulo,
  aulas,
  alunosComProgresso,
}: {
  id: string
  titulo: string
  aulas: number
  alunosComProgresso: number
}) {
  const [estado, apagar] = useActionState(apagarCurso, { erro: null })

  return (
    <details className="group rounded-[var(--radius-card)] border border-line">
      <summary className="cursor-pointer list-none px-5 py-4 text-caption text-ink-4 transition-colors hover:text-critical">
        Apagar este curso
      </summary>

      <div className="flex flex-col gap-4 border-t border-line px-5 py-5">
        <div className="flex flex-col gap-2">
          <p className="text-body text-ink-2">
            Apagar <strong className="font-medium text-ink">{titulo}</strong> remove, de uma vez e
            sem desfazer:
          </p>
          <ul className="flex flex-col gap-1 text-caption text-ink-3">
            <li>· os módulos e as {aulas} {aulas === 1 ? 'aula' : 'aulas'}, com os vídeos no provedor</li>
            <li>· os materiais e as habilidades mapeadas</li>
            {alunosComProgresso > 0 ? (
              <li className="text-caution">
                · o progresso, as anotações e as aulas salvas de{' '}
                <strong className="font-medium">
                  {alunosComProgresso} {alunosComProgresso === 1 ? 'aluno' : 'alunos'}
                </strong>
              </li>
            ) : (
              <li>· nenhum progresso de aluno — ninguém assistiu a este curso ainda</li>
            )}
          </ul>
          <p className="text-caption text-ink-4">
            Se a ideia é só tirar da vista dos alunos, use “Voltar para rascunho” — o conteúdo
            fica inteiro e ninguém perde nada.
          </p>
        </div>

        <form action={apagar} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <label className="flex flex-col gap-1.5">
            <span className="text-caption text-ink-3">
              Para confirmar, digite o título do curso:
            </span>
            <input
              name="confirmacao"
              autoComplete="off"
              placeholder={titulo}
              className="h-10 max-w-md rounded-[var(--radius-control)] border border-line bg-[var(--color-fundo)] px-3 text-body text-ink placeholder:text-ink-4 outline-none focus:border-[rgba(255,107,107,0.7)]"
            />
          </label>

          <Botao />

          {estado.erro && (
            <p role="alert" className="text-caption text-critical">
              {estado.erro}
            </p>
          )}
        </form>
      </div>
    </details>
  )
}

function Botao() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start rounded-[var(--radius-control)] border border-[rgba(255,107,107,0.45)] px-4 py-2 text-caption text-critical transition-colors hover:bg-[rgba(255,107,107,0.1)] disabled:cursor-progress disabled:opacity-60"
    >
      {pending ? 'Apagando…' : 'Apagar para sempre'}
    </button>
  )
}
