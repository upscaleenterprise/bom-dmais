'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Preferências do painel, no navegador de quem trabalha nele.
 * Mesmo padrão do carrinho e dos dados do cliente — nada disso é do servidor.
 */
type Preferencias = {
  mudo: boolean
  setMudo: (mudo: boolean) => void
}

export const usePreferencias = create<Preferencias>()(
  persist(
    (set) => ({
      mudo: false,
      setMudo: (mudo) => set({ mudo }),
    }),
    { name: 'brasa-painel' },
  ),
)
