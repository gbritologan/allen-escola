import { Button } from '@/components/primitives/button'
import { IconeApagar } from '@/components/icons'
import { Input } from '@/components/primitives/field'
import { adicionarMaterial, removerMaterial } from './actions'

export interface Material {
  id: string
  title: string
  url: string
  kind: string
}

const ROTULO: Record<string, string> = {
  template: 'Modelo',
  file: 'Arquivo',
  link: 'Link',
}

/**
 * MATERIAIS DA AULA.
 *
 * Um formulário de uma linha só, sempre visível. Adicionar material é gesto
 * repetido — esconder atrás de "＋ Adicionar" custa um clique em cada repetição
 * e não economiza nada, porque a linha ocupa o mesmo espaço que o botão.
 *
 * `template` vem primeiro na lista porque é o que o aluno usa para EXECUTAR o
 * Para Fazer. Anexo e referência são apoio; o modelo é ferramenta.
 */
export function Materiais({
  lessonId,
  courseId,
  materiais,
}: {
  lessonId: string
  courseId: string
  materiais: Material[]
}) {
  return (
    <div className="flex flex-col gap-4">
      {materiais.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--color-line)] border-y border-line">
          {materiais.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <span className="w-16 shrink-0 text-caption text-ink-4">
                {ROTULO[m.kind] ?? m.kind}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body text-ink-2">{m.title}</span>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-caption text-ink-4 hover:text-blue-light"
                >
                  {m.url}
                </a>
              </div>
              <form action={removerMaterial}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="lesson_id" value={lessonId} />
                <input type="hidden" name="course_id" value={courseId} />
                <button
                  type="submit"
                  aria-label={`Remover ${m.title}`}
                  className="flex items-center text-caption text-ink-4 transition-colors hover:text-critical"
                >
                  <IconeApagar className="size-3.5" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={adicionarMaterial} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="lesson_id" value={lessonId} />
        <input type="hidden" name="course_id" value={courseId} />

        <select
          name="kind"
          aria-label="Tipo do material"
          defaultValue="template"
          className="h-9 rounded-[var(--radius-control)] border border-line bg-navy-deep px-2.5 text-caption text-ink outline-none focus:border-[rgba(76,65,255,0.7)]"
        >
          <option value="template">Modelo</option>
          <option value="file">Arquivo</option>
          <option value="link">Link</option>
        </select>

        <Input
          name="title"
          placeholder="Modelo de proposta"
          aria-label="Nome do material"
          className="h-9 min-w-40 flex-1"
          required
        />
        <Input
          name="url"
          type="url"
          placeholder="https://…"
          aria-label="Endereço do material"
          className="h-9 min-w-48 flex-1"
          required
        />

        <Button type="submit" size="sm" variant="secondary">
          Adicionar
        </Button>
      </form>

      {materiais.length === 0 && (
        <span className="text-caption text-ink-4">
          Nenhum material. Se o Para Fazer pede uma ferramenta, é aqui que ela entra.
        </span>
      )}
    </div>
  )
}
