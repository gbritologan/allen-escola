'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { requestCode, verifyCode, type LoginState } from './actions'

/**
 * O campo vive sobre vidro, então ele não pode ser mais um retângulo opaco:
 * é um recorte escuro com a mesma borda de luz do painel.
 */
const inputClass =
  'h-12 w-full rounded-[var(--radius-control)] border border-[rgba(255,255,255,0.12)] ' +
  'bg-[rgba(5,7,20,0.45)] px-4 text-body text-ink placeholder:text-ink-4 outline-none ' +
  'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ' +
  'transition-[border-color,box-shadow,background-color] duration-200 ease-[var(--ease-allen)] ' +
  'focus:border-[rgba(76,65,255,0.7)] focus:bg-[rgba(5,7,20,0.6)] ' +
  'focus:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_0_0_3px_rgba(76,65,255,0.18)]'

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Um instante…' : children}
    </Button>
  )
}

/**
 * `emailPendente` vem da URL (`/entrar?codigo=...`), posto lá pelo servidor
 * depois que o código foi enviado. É o que faz o campo do código sobreviver a
 * sair da aba para ler o e-mail e voltar.
 */
export function LoginForm({
  destination,
  emailPendente,
}: {
  destination: string
  emailPendente: string | null
}) {
  const [state, action] = useActionState(
    async (prev: LoginState, formData: FormData) =>
      prev.step === 'email' ? requestCode(prev, formData) : verifyCode(prev, formData),
    emailPendente
      ? ({ step: 'code', email: emailPendente, error: null } as LoginState)
      : ({ step: 'email', email: '', error: null } as LoginState),
  )

  const onCodeStep = state.step === 'code'

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="destino" value={destination} />

      {onCodeStep ? (
        <>
          <input type="hidden" name="email" value={state.email} />
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="text-label font-medium text-ink-2">
              Código enviado para <span className="text-ink">{state.email}</span>
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={10}
              placeholder="Código do e-mail"
              autoFocus
              required
              aria-describedby={state.error ? 'login-erro' : undefined}
              data-numeric
              className={`${inputClass} text-center text-lead font-light tracking-[0.4em] indent-[0.4em] placeholder:tracking-normal placeholder:indent-0`}
            />
          </div>
          <Submit>Entrar</Submit>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-label font-medium text-ink-2">
              Seu e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              defaultValue={state.email}
              autoFocus
              required
              aria-describedby={state.error ? 'login-erro' : undefined}
              className={inputClass}
            />
          </div>
          <Submit>Receber código</Submit>
        </>
      )}

      {state.error && (
        <p id="login-erro" role="alert" className="text-label text-critical">
          {state.error}
        </p>
      )}

      {onCodeStep && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-ink-3">
            O código vale por uma hora. Se não chegar, confira o spam.
          </p>
          {/* Saída explícita. Sem ela, quem digitou o e-mail errado só sai
              recarregando a página — que era exatamente o gesto que fazia a
              pessoa perder o passo. */}
          <a
            href="/entrar"
            className="self-start text-caption text-ink-4 underline-offset-4 transition-colors hover:text-ink-2 hover:underline"
          >
            Usar outro e-mail
          </a>
        </div>
      )}
    </form>
  )
}
