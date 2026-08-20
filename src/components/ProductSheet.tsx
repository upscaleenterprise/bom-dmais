'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { OptionGroup, Product, Variant } from '@/lib/types'
import { formatBRL } from '@/lib/money'
import { firstError } from '@/lib/selection'
import { temEspeto } from '@/lib/sabor'
import { Espeto } from './Espeto'
import { useCart } from '@/lib/cart'
import { unitPrice } from '@/lib/pricing'

function Regra({ group }: { group: OptionGroup }) {
  if (group.min_select > 0 && group.max_select === 1) {
    return <span className="etiqueta text-erro">Obrigatório</span>
  }
  if (group.max_select > 1) {
    return (
      <span className="etiqueta text-tinta-fraca">
        Até {group.max_select}
      </span>
    )
  }
  return null
}

export function ProductSheet({
  product,
  onClose,
}: {
  product: Product
  onClose: () => void
}) {
  const add = useCart((s) => s.add)
  const dialogRef = useRef<HTMLDivElement>(null)

  const [variant, setVariant] = useState<Variant>(product.variants[0])
  const [selection, setSelection] = useState<Record<string, string[]>>({})
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [tentou, setTentou] = useState(false)

  // Esc fecha, e o foco vai pro painel — teclado tem que dar conta.
  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Sabor de espeto ganha a grelha; tamanho de refrigerante e fruta de suco
  // continuam em lista comum, porque desenhar espeto ali seria mentira.
  const saborizado = useMemo(
    () => product.variants.every((v) => temEspeto(v.name)),
    [product.variants],
  )

  const erro = useMemo(
    () => firstError(product.option_groups, selection),
    [product.option_groups, selection],
  )

  const escolhidas = useMemo(
    () =>
      product.option_groups.flatMap((g) =>
        (selection[g.id] ?? []).flatMap((id) => {
          const o = g.options.find((x) => x.id === id)
          return o
            ? [{ optionId: o.id, groupName: g.name, optionName: o.name, priceCents: o.price_cents }]
            : []
        }),
      ),
    [product.option_groups, selection],
  )

  const total =
    unitPrice({
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      basePriceCents: variant.price_cents,
      options: escolhidas,
      notes,
    }) * quantity

  function toggle(group: OptionGroup, optionId: string) {
    setSelection((prev) => {
      const atual = prev[group.id] ?? []
      const jaTem = atual.includes(optionId)

      if (group.max_select === 1) {
        // Grupo de escolha única: clicar troca. Clicar no mesmo não desmarca
        // quando é obrigatório — desmarcar só deixaria o pedido inválido.
        if (jaTem && group.min_select > 0) return prev
        return { ...prev, [group.id]: jaTem ? [] : [optionId] }
      }

      if (jaTem) {
        return { ...prev, [group.id]: atual.filter((id) => id !== optionId) }
      }
      if (atual.length >= group.max_select) return prev
      return { ...prev, [group.id]: [...atual, optionId] }
    })
  }

  function adicionar() {
    setTentou(true)
    if (erro) return

    add(
      {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        basePriceCents: variant.price_cents,
        options: escolhidas,
        notes,
      },
      quantity,
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-tinta/40 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-borda bg-superficie sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-borda px-5 py-4">
          <div>
            <h2 className="placa text-2xl leading-tight text-tinta">{product.name}</h2>
            {product.description && (
              <p className="mt-1 text-sm text-tinta-fraca">{product.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-tinta-fraca hover:bg-fundo hover:text-tinta"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {product.image_url && (
            <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-borda">
              <Image
                src={product.image_url}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 32rem"
                priority
                className="object-cover"
              />
              {/* A foto encosta no conteúdo; o degradê evita que o topo do
                  primeiro rótulo brigue com a parte clara da imagem. */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-superficie to-transparent"
              />
            </div>
          )}

          <div className="px-5 py-5">
          {product.variants.length > 1 && (
            <fieldset className="mb-7">
              <legend className="etiqueta mb-3 text-tinta-fraca">
                {saborizado ? 'Sabor' : 'Escolha'}
              </legend>

              {saborizado ? (
                // A grelha: os espetos lado a lado, para a escolha ser por
                // comparação do que tem dentro, e não por leitura de nome.
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {product.variants.map((v) => {
                    const marcada = v.id === variant.id
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVariant(v)}
                        aria-pressed={marcada}
                        className={`group flex flex-col items-center rounded-lg border px-1.5 pb-2 pt-2.5 transition-colors ${
                          marcada
                            ? 'border-laranja bg-amarelo/15'
                            : 'border-borda hover:border-tinta-fraca'
                        }`}
                      >
                        <Espeto
                          sabor={v.name}
                          className={`h-14 w-auto transition-opacity ${
                            marcada ? '' : 'opacity-60 group-hover:opacity-100'
                          }`}
                        />
                        {/* A brasa acende sob o espeto escolhido. */}
                        <span
                          aria-hidden
                          className={`mt-1.5 h-[3px] w-8 rounded-full transition-all ${
                            marcada
                              ? 'bg-laranja shadow-[0_0_9px_1px_var(--color-laranja)]'
                              : 'bg-borda'
                          }`}
                        />
                        <span
                          className={`mt-2 text-center text-[0.68rem] leading-tight ${
                            marcada ? 'font-semibold text-tinta' : 'text-tinta-fraca'
                          }`}
                        >
                          {v.name}
                        </span>
                        <span
                          className={`mt-1 text-[0.7rem] font-semibold tabular-nums ${
                            marcada ? 'text-tinta' : 'text-tinta-fraca'
                          }`}
                        >
                          {formatBRL(v.price_cents)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariant(v)}
                      aria-pressed={v.id === variant.id}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                        v.id === variant.id
                          ? 'border-laranja bg-amarelo/15 text-tinta'
                          : 'border-borda text-tinta-fraca hover:border-tinta-fraca'
                      }`}
                    >
                      {v.name}
                      <span className="ml-2 font-semibold text-tinta">
                        {formatBRL(v.price_cents)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          {product.option_groups.map((group) => {
            const marcadas = selection[group.id] ?? []
            const faltando = tentou && group.min_select > marcadas.length

            return (
              <fieldset key={group.id} className="mb-7">
                <legend className="mb-3 flex w-full items-center justify-between gap-3">
                  <span
                    className={`etiqueta ${faltando ? 'text-erro' : 'text-tinta-fraca'}`}
                  >
                    {group.name}
                  </span>
                  <Regra group={group} />
                </legend>

                <div className="flex flex-col gap-1.5">
                  {group.options.map((o) => {
                    const marcada = marcadas.includes(o.id)
                    const cheio = !marcada && marcadas.length >= group.max_select
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => toggle(group, o.id)}
                        aria-pressed={marcada}
                        disabled={cheio}
                        className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:opacity-35 ${
                          marcada
                            ? 'border-laranja bg-amarelo/15 text-tinta'
                            : 'border-borda text-tinta-fraca hover:border-tinta-fraca'
                        }`}
                      >
                        <span className="font-medium">{o.name}</span>
                        {o.price_cents > 0 && (
                          <span className="font-semibold text-tinta">
                            + {formatBRL(o.price_cents)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}

          <label className="block">
            <span className="etiqueta mb-2 block text-tinta-fraca">Observação</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={140}
              placeholder="Sem sal, capa de gordura fina..."
              className="w-full resize-none rounded-lg border border-borda bg-fundo px-3.5 py-3 text-sm text-tinta placeholder:text-tinta-fraca/60"
            />
          </label>
          </div>
        </div>

        <div className="border-t border-borda px-5 py-4">
          {tentou && erro && (
            <p role="alert" className="mb-3 text-center text-sm font-medium text-erro">
              {erro}
            </p>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-borda">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Menos um"
                className="grid h-11 w-10 place-items-center text-lg text-tinta-fraca hover:text-tinta"
              >
                −
              </button>
              <span
                aria-live="polite"
                className="w-6 text-center text-sm font-semibold tabular-nums text-tinta"
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                aria-label="Mais um"
                className="grid h-11 w-10 place-items-center text-lg text-tinta-fraca hover:text-tinta"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={adicionar}
              className="rounded-xl flex h-11 flex-1 items-center justify-between bg-amarelo px-4 font-semibold text-tinta transition-colors hover:bg-laranja"
            >
              <span>Adicionar</span>
              <span className="tabular-nums">{formatBRL(total)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
