'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Category, Product, Store } from '@/lib/types'
import { formatBRL } from '@/lib/money'
import { ProductSheet } from './ProductSheet'
import { CartBar } from './CartBar'

function precoDe(product: Product): string {
  const precos = product.variants.map((v) => v.price_cents)
  if (precos.length === 0) return ''
  const menor = Math.min(...precos)
  return precos.length > 1 ? `a partir de ${formatBRL(menor)}` : formatBRL(menor)
}

function StoreHeader({ store }: { store: Store }) {
  return (
    <header className="relative overflow-hidden border-b border-borda bg-fumaca">
      {/* A brasa vive atrás do nome. Sem animação: o brilho já é o suficiente. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[42rem] -translate-x-1/2 opacity-45 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--color-brasa) 0%, transparent 68%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-3xl px-5 pb-6 pt-9">
        <h1 className="placa text-[clamp(2.4rem,9vw,4rem)] leading-[0.86] text-sal">
          {store.name}
        </h1>

        {store.description && (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-sal-fraco">
            {store.description}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                store.is_open
                  ? 'bg-brasa-viva shadow-[0_0_10px_var(--color-brasa-viva)]'
                  : 'bg-sal-fraco'
              }`}
            />
            <span className="etiqueta text-sal">
              {store.is_open ? 'Aberta agora' : 'Fechada'}
            </span>
          </span>

          <span className="etiqueta text-sal-fraco">
            Entrega {formatBRL(store.delivery_fee_cents)}
          </span>
          <span className="etiqueta text-sal-fraco">
            Mínimo {formatBRL(store.min_order_cents)}
          </span>
        </div>
      </div>
    </header>
  )
}

function ProductRow({
  product,
  onPick,
  disabled,
}: {
  product: Product
  onPick: () => void
  disabled: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        className="group flex w-full items-start gap-4 border-b border-borda/60 px-5 py-5 text-left transition-colors hover:bg-fumaca/60 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <div className="min-w-0 flex-1">
          <h3 className="placa text-lg leading-tight text-sal">{product.name}</h3>
          {product.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-sal-fraco">
              {product.description}
            </p>
          )}
          <p className="mt-2.5 text-sm font-semibold text-brasa-viva">
            {precoDe(product)}
          </p>
        </div>

        {/* Com foto, o "+" ancora no canto dela; sem foto, vira o único alvo à
            direita. Produto sem imagem não pode virar buraco no cardápio. */}
        {product.image_url ? (
          <div className="relative mt-0.5 shrink-0">
            <Image
              src={product.image_url}
              // A foto ilustra o que o nome e a descrição ao lado já dizem;
              // repetir no alt só faria o leitor de tela falar duas vezes.
              alt=""
              width={96}
              height={96}
              // Sem `sizes` de propósito: em imagem de tamanho fixo ele força o
              // modo responsivo e o Next gera srcset até 3840px pra uma
              // miniatura de 96. Omitido, sai só 1x e 2x.
              className="h-24 w-24 rounded-lg border border-borda object-cover"
            />
            <span
              aria-hidden
              className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full border border-borda bg-fumaca text-lg leading-none text-sal-fraco transition-colors group-hover:border-brasa group-hover:bg-brasa group-hover:text-carvao"
            >
              +
            </span>
          </div>
        ) : (
          <span
            aria-hidden
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-borda text-xl leading-none text-sal-fraco transition-colors group-hover:border-brasa group-hover:bg-brasa group-hover:text-carvao"
          >
            +
          </span>
        )}
      </button>
    </li>
  )
}

export function Cardapio({
  store,
  categories,
}: {
  store: Store
  categories: Category[]
}) {
  const [aberto, setAberto] = useState<Product | null>(null)

  return (
    <>
      <StoreHeader store={store} />

      <nav
        aria-label="Categorias"
        className="sticky top-0 z-20 border-b border-borda bg-carvao/95 backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}">
          {categories.map((c) => (
            <li key={c.id}>
              <a
                href={`#cat-${c.id}`}
                className="etiqueta block whitespace-nowrap rounded-full px-3.5 py-2 text-sal-fraco transition-colors hover:bg-fumaca hover:text-sal"
              >
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 pb-32">
        {categories.map((category) => (
          <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-14">
            <h2 className="etiqueta sticky top-14 z-10 bg-carvao/95 px-5 py-3 text-brasa backdrop-blur">
              {category.name}
            </h2>
            <ul>
              {category.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  disabled={!store.is_open}
                  onPick={() => setAberto(product)}
                />
              ))}
            </ul>
          </section>
        ))}
      </main>

      {aberto && (
        <ProductSheet product={aberto} onClose={() => setAberto(null)} />
      )}

      <CartBar store={store} />
    </>
  )
}
