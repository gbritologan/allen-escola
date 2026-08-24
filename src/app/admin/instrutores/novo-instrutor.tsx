'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { Field, Input } from '@/components/primitives/field'
import { slugify } from '@/core/shared/slug'
import { criarInstrutor, type InstructorFormState } from './actions'

const INITIAL: InstructorFormState = { error: null, ok: false, nonce: 0 }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando…' : 'Criar instrutor'}
    </Button>
  )
}

/**
 * Só nome e uma linha de credencial no cadastro.
 *
 * Bio e foto vêm depois, na edição: pedir tudo de uma vez transforma "adicionar
 * quem vai dar a aula" numa tarefa que se adia. O que trava a publicação de um
 * curso é o instrutor não existir, não a bio estar curta.
 */
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
          placeholder="Gabriel Brito"
          required
        />
      </Field>

      <Field
        label="Credencial"
        htmlFor="headline"
        hint="Uma linha, e ela precisa provar prática. Aparece embaixo do nome no curso."
      >
        <Input
          id="headline"
          name="headline"
          placeholder="Sócio da Allen. Opera tráfego pago para 40 contas por mês."
        />
      </Field>

      <Field
        label="Endereço"
        htmlFor="slug"
        hint={shownSlug ? `Identificador interno: ${shownSlug}` : 'Gerado a partir do nome.'}
      >
        <Input
          id="slug"
          name="slug"
          value={shownSlug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          placeholder="gabriel-brito"
        />
      </Field>
    </>
  )
}

export function NovoInstrutor() {
  const [state, action] = useActionState(criarInstrutor, INITIAL)

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
          {state.ok ? 'Criado. Complete a bio abaixo.' : 'Bio e foto entram na edição.'}
        </span>
      </div>
    </form>
  )
}
