'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { Field, Input } from '@/components/primitives/field'
import { slugify } from '@/core/shared/slug'
import { criarHabilidade, type SkillFormState } from './actions'

const INITIAL: SkillFormState = { error: null, ok: false, nonce: 0 }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando…' : 'Criar habilidade'}
    </Button>
  )
}

function Campos() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  const shownSlug = slugTouched ? slug : slugify(name)

  return (
    <>
      <Field label="Nome" htmlFor="name">
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Negociação"
          required
        />
      </Field>

      <Field
        label="O que é, na prática"
        htmlFor="description"
        hint="Descreva a AÇÃO, não o tema. 'Conduzir uma conversa com interesses divergentes até um acordo' — não 'teoria de negociação'."
      >
        <Input
          id="description"
          name="description"
          placeholder="Conduzir uma conversa com interesses divergentes até um acordo."
        />
      </Field>

      <Field
        label="Identificador"
        htmlFor="slug"
        hint={shownSlug ? `Interno: ${shownSlug}` : 'Gerado a partir do nome.'}
      >
        <Input
          id="slug"
          name="slug"
          value={shownSlug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          placeholder="negociacao"
        />
      </Field>
    </>
  )
}

export function NovaHabilidade() {
  const [state, action] = useActionState(criarHabilidade, INITIAL)

  return (
    <form action={action} className="flex flex-col gap-4">
      <Campos key={state.nonce} />

      {state.error && (
        <p role="alert" className="text-label text-critical">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Submit />
        <span className="text-caption text-ink-4">
          {state.ok
            ? 'Criada. Agora marque as aulas que a desenvolvem.'
            : 'Só passa a registrar depois de ligada a alguma aula.'}
        </span>
      </div>
    </form>
  )
}
