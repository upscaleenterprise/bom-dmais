'use client'

import { useSyncExternalStore } from 'react'

const semInscricao = () => () => {}

/**
 * Falso no servidor e no primeiro render, verdadeiro depois de hidratar.
 *
 * Carrinho e dados do cliente moram no localStorage, que o servidor não enxerga:
 * renderizar direto daria mismatch de hidratação. O jeito antigo era
 * useState + useEffect(() => setPronto(true)), que custa um render extra em
 * cascata. useSyncExternalStore é o primitivo feito pra exatamente isso.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    semInscricao,
    () => true, // cliente
    () => false, // servidor
  )
}
