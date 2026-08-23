'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { Field, Input, Textarea } from '@/components/primitives/field'
import { slugify } from '@/core/shared/slug'
import { criarTema, type ThemeFormState } from './actions'

const INITIAL: ThemeFormState = { error: null, ok: false, nonce: 0 }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando…' : 'Criar tema'}
    </Button>
  )
}

/**
 * O endereço é derivado do nome enquanto você digita, mas continua editável —
 * quem escreve conteúdo precisa poder consertar um slug feio sem pedir ajuda
 * para quem escreve código.
 */
function Campos() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

  const shownSlug = slugTouched ? slug : slugify(name)

  return (
    <>
      <Field label="Nome do tema" htmlFor="name">
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Inteligência Artificial"
          required
        />
      </Field>

      <Field
        label="Endereço"
        htmlFor="slug"
        hint={shownSlug ? `O aluno verá /tema/${shownSlug}` : 'Gerado a partir do nome.'}
      >
        <Input
          id="slug"
          name="slug"
          value={shownSlug}
          onChange={(e) => {
            setSlugTouched(true)
            setSlug(e.target.value)
          }}
          placeholder="inteligencia-artificial"
        />
      </Field>

      <Field label="Descrição" htmlFor="description" hint="Uma linha. Aparece na página do tema.">
        <Textarea
          id="description"
          name="description"
          placeholder="Colocar IA para trabalhar no que você já faz."
        />
      </Field>
    </>
  )
}

export function NovoTema() {
  const [state, action] = useActionState(criarTema, INITIAL)

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* `key` no nonce: cada tema criado remonta os campos limpos. Zerar
          estado dentro de um efeito é o caminho que o React 19 (com razão)
          trata como erro. */}
      <Campos key={state.nonce} />

      {state.error && (
        <p role="alert" className="text-label text-critical">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Submit />
        <span className="text-caption text-ink-4">
          {state.ok ? 'Tema criado. Publique quando estiver pronto.' : 'Nasce como rascunho.'}
        </span>
      </div>
    </form>
  )
}
