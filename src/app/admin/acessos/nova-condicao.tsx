'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { Field, Input } from '@/components/primitives/field'
import { salvarCondicao, type CondicaoState } from './actions'

const INITIAL: CondicaoState = { error: null, ok: null, nonce: 0 }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar condição'}
    </Button>
  )
}

/**
 * Registrar ou corrigir a condição de uma pessoa.
 *
 * O mesmo formulário faz os dois: digitar um e-mail que já existe sobrescreve
 * a condição dele. Uma tela separada de "editar" duplicaria seis campos para
 * ganhar nada.
 */
export function NovaCondicao() {
  const [state, action] = useActionState(salvarCondicao, INITIAL)

  return (
    <form key={state.nonce} action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email" hint="É a chave. Precisa ser o mesmo do login.">
          <Input id="email" name="email" type="email" placeholder="pessoa@email.com" required />
        </Field>

        <Field label="Nome completo" htmlFor="full_name">
          <Input id="full_name" name="full_name" placeholder="Maria da Silva" />
        </Field>

        <Field label="Telefone" htmlFor="phone">
          <Input id="phone" name="phone" placeholder="(21) 99999-0000" />
        </Field>

        <Field label="Plano" htmlFor="plan" hint="Só um rótulo. Aparece na Conta e no Studio.">
          <Input id="plan" name="plan" defaultValue="fundador" />
        </Field>

        <Field label="Acesso começa em" htmlFor="starts_at">
          <Input id="starts_at" name="starts_at" type="date" required />
        </Field>

        <Field label="Acesso termina em" htmlFor="ends_at" hint="Em branco = sem prazo.">
          <Input id="ends_at" name="ends_at" type="date" />
        </Field>
      </div>

      <Field label="Observação" htmlFor="note" hint="Por que essa condição. Daqui a um ano ninguém lembra.">
        <Input id="note" name="note" placeholder="Turma fundadora — 1 ano" />
      </Field>

      {state.error && (
        <p role="alert" className="text-label text-critical">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-label text-ink-2">{state.ok}</p>}

      <div>
        <Submit />
      </div>
    </form>
  )
}
