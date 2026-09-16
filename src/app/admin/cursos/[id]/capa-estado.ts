/**
 * O estado devolvido pelas ações da capa.
 *
 * Mora fora de `actions.ts` por uma regra do Next: um arquivo `'use server'`
 * só pode exportar função assíncrona. Exportar de lá a constante do estado
 * inicial quebra o build inteiro da rota — e o erro que ele dá ("found
 * object") não aponta para a linha culpada.
 */
export interface EstadoCapa {
  erro: string | null
  url: string | null
}

export const CAPA_PARADA: EstadoCapa = { erro: null, url: null }
