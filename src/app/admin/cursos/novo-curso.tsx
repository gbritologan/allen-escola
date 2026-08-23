'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { Field, Input } from '@/components/primitives/field'
import { slugify } from '@/core/shared/slug'
import { criarCurso, type CourseFormState } from './actions'

const INITIAL: CourseFormState = { error: null, nonce: 0 }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando…' : 'Criar e abrir'}
    </Button>
  )
}

const formatOption =
  'flex-1 cursor-pointer rounded-[var(--radius-control)] border px-4 py-3 transition-colors duration-150'

export function NovoCurso() {
  const [state, action] = useActionState(criarCurso, INITIAL)
  const [title, setTitle] = useState('')
  const [format, setFormat] = useState<'course' | 'masterclass'>('course')

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field
        label="Título do curso"
        htmlFor="title"
        hint={title ? `O aluno verá /curso/${slugify(title)}` : 'O endereço vem do título.'}
      >
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Negociação"
          required
        />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label font-medium text-ink-2">Formato</legend>
        <div className="flex gap-3">
          {(
            [
              ['course', 'Curso', 'Vários módulos, ritmo próprio.'],
              ['masterclass', 'Masterclass', 'Um expert, um assunto, um mergulho.'],
            ] as const
          ).map(([value, label, detail]) => (
            <label
              key={value}
              className={`${formatOption} ${
                format === value
                  ? 'border-[rgba(76,65,255,0.6)] bg-[rgba(76,65,255,0.1)]'
                  : 'border-line hover:border-line-strong'
              }`}
            >
              <input
                type="radio"
                name="format"
                value={value}
                checked={format === value}
                onChange={() => setFormat(value)}
                className="sr-only"
              />
              <span className="block text-body font-medium text-ink">{label}</span>
              <span className="block text-caption text-ink-4">{detail}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="text-label text-critical">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Submit />
        <span className="text-caption text-ink-4">
          Nasce como rascunho. O resto você preenche no Studio.
        </span>
      </div>
    </form>
  )
}
