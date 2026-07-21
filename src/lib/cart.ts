'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sameLine, subtotal } from './pricing'
import type { CartItem, NewCartItem } from './pricing'

export type { CartItem, CartOption, NewCartItem } from './pricing'
export { unitPrice, lineTotal } from './pricing'

type CartState = {
  items: CartItem[]
  add: (item: NewCartItem, quantity?: number) => void
  remove: (lineId: string) => void
  setQuantity: (lineId: string, quantity: number) => void
  clear: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((line) => sameLine(item, line))
          if (existing) {
            return {
              items: state.items.map((line) =>
                line.lineId === existing.lineId
                  ? { ...line, quantity: line.quantity + quantity }
                  : line,
              ),
            }
          }
          return {
            items: [
              ...state.items,
              { ...item, lineId: crypto.randomUUID(), quantity },
            ],
          }
        }),

      remove: (lineId) =>
        set((state) => ({
          items: state.items.filter((line) => line.lineId !== lineId),
        })),

      setQuantity: (lineId, quantity) =>
        set((state) => ({
          // Chegou a zero, a linha sai — evita item fantasma com quantidade 0.
          items:
            quantity <= 0
              ? state.items.filter((line) => line.lineId !== lineId)
              : state.items.map((line) =>
                  line.lineId === lineId ? { ...line, quantity } : line,
                ),
        })),

      clear: () => set({ items: [] }),
    }),
    { name: 'brasa-cart' },
  ),
)

export const selectSubtotal = (state: CartState) => subtotal(state.items)

export const selectCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0)
