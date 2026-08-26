'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/primitives/button'
import { Field, Input, Textarea } from '@/components/primitives/field'
import { abrirChamado, type ChamadoState } from './actions'

const INITIAL: ChamadoState = { error: null, nonce: 0 }

function Submit() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Enviando…' : 'Enviar'}
    </Button>
  )
}

/**
 * O formulário pede duas coisas, e nenhuma delas é "categoria do problema".
 *
 * Menu de categoria existe para o lado de dentro se organizar, e faz a pessoa
 * que está travada adivinhar em qual gaveta o problema dela cabe. O contexto
 * vai escondido nos campos abaixo — de onde ela veio, qual aula — e chega mais
 * preciso do que qualquer gaveta que ela escolhesse.
 */
export function NovoChamado({
  contextPath,
  lessonId,
  courseId,
  contexto,
}: {
  contextPath: string | null
  lessonId: string | null
  courseId: string | null
  contexto: string | null
}) {
  const [state, action] = useActionState(abrirChamado, INITIAL)

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="context_path" value={contextPath ?? ''} />
      <input type="hidden" name="lesson_id" value={lessonId ?? ''} />
      <input type="hidden" name="course_id" value={courseId ?? ''} />

      <Field label="O que houve" htmlFor="subject" hint="Uma linha. Ex.: “o vídeo da aula 3 não abre”.">
        <Input
          id="subject"
          name="subject"
          placeholder="Resuma em poucas palavras"
          maxLength={120}
          required
        />
      </Field>

      <Field
        label="Conte com detalhe"
        htmlFor="body"
        hint="O que você tentou fazer, e o que aconteceu no lugar. Quanto mais específico, menos idas e voltas."
      >
        <Textarea id="body" name="body" rows={5} required />
      </Field>

      {contexto && (
        <p className="text-caption text-ink-4">
          Vamos junto com sua mensagem: <span className="text-ink-3">{contexto}</span>. Assim você
          não precisa explicar onde estava.
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-label text-critical">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        <span className="text-caption text-ink-4">
          Respondemos por aqui e no seu e-mail, em até um dia útil.
        </span>
      </div>
    </form>
  )
}
