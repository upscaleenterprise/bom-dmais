'use client'

import Link from 'next/link'
import type { Store } from '@/lib/types'
import { formatBRL } from '@/lib/money'
import { lineTotal, meetsMinimum } from '@/lib/pricing'
import { selectSubtotal, useCart } from '@/lib/cart'
import { useHidratado } from '@/lib/hidratado'
import { Topo } from './Topo'

export function Carrinho({ store }: { store: Store }) {
  const items = useCart((s) => s.items)
  const subtotal = useCart(selectSubtotal)
  const setQuantity = useCart((s) => s.setQuantity)
  const remove = useCart((s) => s.remove)

  // O carrinho só existe no navegador; renderizar no servidor daria mismatch.
  const pronto = useHidratado()

  if (!pronto) return <Topo titulo="Carrinho" voltarPara="/" />

  if (items.length === 0) {
    return (
      <>
        <Topo titulo="Carrinho" voltarPara="/" />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-5 py-24 text-center">
          <p className="placa text-2xl text-sal">Seu carrinho está vazio</p>
          <p className="max-w-xs text-sm text-sal-fraco">
            Escolha uma carne, diga o ponto e a gente coloca na brasa.
          </p>
          <Link
            href="/"
            className="mt-1 rounded-lg bg-brasa px-5 py-3 font-semibold text-carvao transition-colors hover:bg-brasa-viva"
          >
            Ver o cardápio
          </Link>
        </main>
      </>
    )
  }

  const bate = meetsMinimum(subtotal, store.min_order_cents)
  const total = subtotal + store.delivery_fee_cents

  return (
    <>
      <Topo titulo="Carrinho" voltarPara="/" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-40 pt-2">
        <ul className="divide-y divide-borda/60">
          {items.map((item) => (
            <li key={item.lineId} className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="placa text-base leading-tight text-sal">
                    {item.productName}
                  </h2>
                  <p className="mt-0.5 text-xs text-sal-fraco">{item.variantName}</p>

                  {item.options.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {item.options.map((o) => (
                        <li key={o.optionId} className="text-xs text-sal-fraco">
                          {o.optionName}
                          {o.priceCents > 0 && (
                            <span className="text-brasa-viva">
                              {' '}
                              + {formatBRL(o.priceCents)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.notes && (
                    <p className="mt-2 border-l-2 border-borda pl-2 text-xs italic text-sal-fraco">
                      {item.notes}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-sm font-semibold tabular-nums text-sal">
                  {formatBRL(lineTotal(item))}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-borda">
                  <button
                    type="button"
                    onClick={() => setQuantity(item.lineId, item.quantity - 1)}
                    aria-label={`Menos um ${item.productName}`}
                    className="grid h-9 w-9 place-items-center text-sal-fraco hover:text-sal"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums text-sal">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.lineId, item.quantity + 1)}
                    aria-label={`Mais um ${item.productName}`}
                    className="grid h-9 w-9 place-items-center text-sal-fraco hover:text-sal"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(item.lineId)}
                  className="etiqueta text-sal-fraco underline-offset-4 hover:text-mal hover:underline"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="etiqueta mt-6 inline-block text-brasa underline-offset-4 hover:underline"
        >
          + Adicionar mais itens
        </Link>

        <dl className="mt-8 space-y-2.5 border-t border-borda pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-sal-fraco">Subtotal</dt>
            <dd className="tabular-nums text-sal">{formatBRL(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sal-fraco">Entrega</dt>
            <dd className="tabular-nums text-sal">
              {formatBRL(store.delivery_fee_cents)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-borda pt-2.5">
            <dt className="placa text-lg text-sal">Total</dt>
            <dd className="placa text-lg tabular-nums text-brasa-viva">
              {formatBRL(total)}
            </dd>
          </div>
        </dl>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-fumaca/95 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-4 py-3.5">
          {!bate && (
            <p className="mb-2.5 text-center text-xs text-sal-fraco">
              Faltam{' '}
              <span className="font-semibold text-brasa-viva">
                {formatBRL(store.min_order_cents - subtotal)}
              </span>{' '}
              para o pedido mínimo
            </p>
          )}
          <Link
            href="/checkout"
            aria-disabled={!bate}
            tabIndex={bate ? undefined : -1}
            className={`flex h-12 items-center justify-between rounded-lg px-4 font-semibold transition-colors ${
              bate
                ? 'bg-brasa text-carvao hover:bg-brasa-viva'
                : 'pointer-events-none bg-borda text-sal-fraco'
            }`}
          >
            <span>Continuar</span>
            <span className="tabular-nums">{formatBRL(total)}</span>
          </Link>
        </div>
      </div>
    </>
  )
}
