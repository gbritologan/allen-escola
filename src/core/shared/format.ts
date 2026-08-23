/**
 * Formatação de duração e progresso, em português.
 *
 * Regra de copy do briefing: direto, humano, sem hype. "1h 12min", não
 * "1 hora e 12 minutos de conteúdo transformador".
 */

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return '—'

  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 1) return 'menos de 1min'
  if (totalMinutes < 60) return `${totalMinutes}min`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`
}

/** "12min restantes" — o que importa para quem vai continuar, não o total. */
export function formatRemaining(totalSeconds: number, positionSeconds: number): string {
  const remaining = Math.max(0, totalSeconds - positionSeconds)
  if (remaining === 0) return 'Concluída'
  return `${formatDuration(remaining)} restantes`
}

/** Inteiro de 0 a 100. Progresso nunca aparece com casa decimal. */
export function formatPercent(value: number): string {
  return `${clampPercent(value)}%`
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function percentOf(done: number, total: number): number {
  if (total <= 0) return 0
  return clampPercent((done / total) * 100)
}

/** "Módulo 02 · Aula 04" — posição sempre com dois dígitos. */
export function formatPosition(position: number): string {
  return String(position).padStart(2, '0')
}
