'use client'

import Link from 'next/link'
import type { Store } from '@/lib/types'
import { formatBRL } from '@/lib/money'
import { meetsMinimum } from '@/lib/pricing'
import { selectCount, selectSubtotal, useCart } from '@/lib/cart'
import { useHidratado } from '@/lib/hidratado'

export function CartBar({ store }: { store: Store }) {
  const count = useCart(selectCount)
  const subtotal = useCart(selectSubtotal)
  const pronto = useHidratado()

  if (!pronto || count === 0) return null

  const bate = meetsMinimum(subtotal, store.min_order_cents)
  const falta = store.min_order_cents - subtotal

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-fumaca/95 backdrop-blur">
      <div className="mx-auto w-full max-w-3xl px-5 py-3.5">
        {!bate && (
          <p className="mb-2.5 text-center text-xs text-sal-fraco">
            Faltam <span className="font-semibold text-brasa-viva">{formatBRL(falta)}</span>{' '}
            para o pedido mínimo
          </p>
        )}

        <Link
          href="/carrinho"
          aria-disabled={!bate}
          tabIndex={bate ? undefined : -1}
          onClick={(e) => !bate && e.preventDefault()}
          className={`flex h-12 items-center justify-between rounded-lg px-4 font-semibold transition-colors ${
            bate
              ? 'bg-brasa text-carvao hover:bg-brasa-viva'
              : 'pointer-events-none cursor-not-allowed bg-borda text-sal-fraco'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-carvao/25 px-1.5 text-xs tabular-nums">
              {count}
            </span>
            Ver carrinho
          </span>
          <span className="tabular-nums">{formatBRL(subtotal)}</span>
        </Link>
      </div>
    </div>
  )
}
