'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { Field, Input } from '@/components/primitives/field'
import { slugify } from '@/core/shared/slug'
import { criarApp, type AppFormState } from './actions'

const INITIAL: AppFormState = { error: null, ok: false, nonce: 0 }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando…' : 'Criar app'}
    </Button>
  )
}

/** O endereço é derivado do nome enquanto se digita, e continua editável. */
function Campos() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  const shownSlug = slugTouched ? slug : slugify(name)

  return (
    <>
      <Field label="Nome do app" htmlFor="name">
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Diagnóstico de Funil"
          required
        />
      </Field>

      <Field
        label="Endereço"
        htmlFor="slug"
        hint={shownSlug ? `O aluno verá /apps/${shownSlug}` : 'Gerado a partir do nome.'}
      >
        <Input
          id="slug"
          name="slug"
          value={shownSlug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          placeholder="diagnostico-de-funil"
        />
      </Field>

      <Field
        label="Uma linha"
        htmlFor="tagline"
        hint="É o que aparece no cartão da lista — e o que decide se alguém abre."
      >
        <Input
          id="tagline"
          name="tagline"
          placeholder="Descubra onde seu funil perde dinheiro."
        />
      </Field>
    </>
  )
}

export function NovoApp() {
  const [state, action] = useActionState(criarApp, INITIAL)

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
          {state.ok ? 'App criado. Preencha o conteúdo abaixo.' : 'Nasce como rascunho.'}
        </span>
      </div>
    </form>
  )
}
