'use client'

import { useRef, useState, useTransition } from 'react'
import { Textarea } from '@/components/primitives/field'
import { salvarTexto } from './actions'

type Estado = 'limpo' | 'editando' | 'salvando' | 'salvo' | 'erro'

const LEGENDA: Record<Estado, string> = {
  limpo: '',
  editando: 'alterações não salvas',
  salvando: 'salvando…',
  salvo: 'salvo',
  erro: 'não consegui salvar — copie o texto antes de sair',
}

/**
 * Campo longo com salvamento ao sair do foco.
 *
 * Sem debounce por tecla: salvar a cada letra gera dezenas de escritas e um
 * "salvando…" piscando o tempo todo. Salvar ao sair do campo cobre o risco real
 * (fechar a aba, navegar) com uma escrita por edição.
 */
export function CampoLongo({
  lessonId,
  field,
  label,
  hint,
  defaultValue,
  accent = false,
  rows = 6,
}: {
  lessonId: string
  field: 'para_saber' | 'para_fazer' | 'description'
  label: string
  hint: string
  defaultValue: string
  /** Para Fazer ganha destaque: é a unidade de valor da Allen. */
  accent?: boolean
  rows?: number
}) {
  const [estado, setEstado] = useState<Estado>('limpo')
  const [pending, startTransition] = useTransition()
  const salvo = useRef(defaultValue)

  const id = `${field}-${lessonId}`

  function aoSair(value: string) {
    if (value === salvo.current) {
      setEstado('limpo')
      return
    }
    setEstado('salvando')
    startTransition(async () => {
      const result = await salvarTexto(lessonId, field, value)
      if (result.ok) {
        salvo.current = value
        setEstado('salvo')
      } else {
        setEstado('erro')
      }
    })
  }

  const mostrado = pending ? 'salvando' : estado

  return (
    <div
      className={
        accent
          ? 'flex flex-col gap-2 rounded-[var(--radius-card)] border-l-2 border-l-blue-light bg-[rgba(76,65,255,0.05)] p-4'
          : 'flex flex-col gap-2 rounded-[var(--radius-card)] border-l-2 border-l-line-strong p-4'
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label font-medium text-ink">
          {label}
        </label>
        <span
          className={
            mostrado === 'erro'
              ? 'text-caption text-critical'
              : mostrado === 'salvo'
                ? 'text-caption text-positive'
                : 'text-caption text-ink-4'
          }
          aria-live="polite"
        >
          {LEGENDA[mostrado]}
        </span>
      </div>

      <p className="text-caption text-ink-4">{hint}</p>

      <Textarea
        id={id}
        rows={rows}
        defaultValue={defaultValue}
        onChange={() => setEstado('editando')}
        onBlur={(e) => aoSair(e.target.value)}
        className="bg-navy-deep/60"
      />
    </div>
  )
}
