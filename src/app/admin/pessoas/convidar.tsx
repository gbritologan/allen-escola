'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { Field, Input } from '@/components/primitives/field'
import { convidarPessoa, type ConviteState } from './actions'

const INITIAL: ConviteState = { error: null, ok: null, nonce: 0 }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Enviando…' : 'Convidar'}
    </Button>
  )
}

/**
 * O convite pede duas coisas e manda um e-mail. Só isso.
 *
 * Sem senha para inventar, sem link de "complete seu cadastro", sem tela
 * intermediária: a pessoa recebe o mesmo código de 6 dígitos que vai usar
 * todas as outras vezes. O primeiro acesso é igual ao centésimo, e não há um
 * fluxo de entrada separado para dar manutenção.
 */
export function Convidar() {
  const [state, action] = useActionState(convidarPessoa, INITIAL)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div key={state.nonce} className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="pessoa@empresa.com"
            autoComplete="off"
            required
          />
        </Field>

        <Field label="Nome" htmlFor="full_name" hint="Opcional. Ela pode ajustar depois.">
          <Input id="full_name" name="full_name" placeholder="Maria Silva" autoComplete="off" />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className="text-label text-critical">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-label text-positive">{state.ok}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        <span className="text-caption text-ink-4">
          Recebe um código de 6 dígitos e entra em <strong className="text-ink-3">/entrar</strong>.
          Já nasce com acesso ao catálogo.
        </span>
      </div>
    </form>
  )
}
