'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { Category, Product, Store } from '@/lib/types'
import { faixaDePreco, formatBRL } from '@/lib/money'
import { estadoDaLoja, formatarHora, recadoDeFechado } from '@/lib/horario'
import { useHidratado } from '@/lib/hidratado'
import { ProductSheet } from './ProductSheet'
import { CartBar } from './CartBar'

const precoDe = (product: Product) =>
  faixaDePreco(product.variants.map((v) => v.price_cents))

function StoreHeader({ store, aberta }: { store: Store; aberta: boolean }) {
  const estado = aberta
    ? ({ aberta: true } as const)
    : ({ aberta: false, motivo: store.is_open ? 'fora_do_horario' : 'fechada_pelo_dono' } as const)
  const recado = recadoDeFechado(estado, store.opens_at)

  return (
    <header className="relative overflow-hidden border-b border-borda bg-fundo">
      {/* O padrão de asteriscos da capa do manual da marca, bem discreto. */}
      <div aria-hidden className="asteriscos pointer-events-none absolute inset-0 opacity-[0.08]" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-5 pb-6 pt-6 text-center">
        {/* O logotipo é imagem: o arco amarelo com contorno e o slogan não se
            reproduzem em texto. O h1 continua existindo para leitor de tela. */}
        <h1 className="sr-only">{store.name}</h1>
        <Image
          src="/marca/lockup.png"
          alt=""
          width={264}
          height={194}
          priority
          className="h-auto w-40 sm:w-44"
        />

        {store.description && (
          <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-tinta-fraca">
            {store.description}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                aberta
                  ? 'bg-laranja shadow-[0_0_10px_var(--color-laranja)]'
                  : 'bg-tinta-fraca'
              }`}
            />
            {/* Fechado sem dizer quando volta faz a pessoa desistir de vez. */}
            <span className="etiqueta text-tinta">{aberta ? 'Aberto agora' : recado}</span>
          </span>

          <span className="etiqueta text-tinta-fraca">
            Todo dia, {formatarHora(store.opens_at)} às {formatarHora(store.closes_at)}
          </span>

          <span className="etiqueta text-tinta-fraca">
            Entrega {formatBRL(store.delivery_fee_cents)}
          </span>

          {/* Sem pedido mínimo, "Mínimo R$ 0,00" é ruído. */}
          {store.min_order_cents > 0 && (
            <span className="etiqueta text-tinta-fraca">
              Mínimo {formatBRL(store.min_order_cents)}
            </span>
          )}
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
        className="group flex w-full items-start gap-4 border-b border-borda/60 px-5 py-5 text-left transition-colors hover:bg-superficie/60 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <div className="min-w-0 flex-1">
          <h3 className="placa text-lg leading-tight text-tinta">{product.name}</h3>
          {product.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-tinta-fraca">
              {product.description}
            </p>
          )}
          <p className="preco mt-2 text-lg leading-none text-tinta">
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
              className="absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full border border-borda bg-superficie text-lg leading-none text-tinta-fraca transition-colors group-hover:border-laranja group-hover:bg-laranja group-hover:text-tinta"
            >
              +
            </span>
          </div>
        ) : (
          <span
            aria-hidden
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-borda text-xl leading-none text-tinta-fraca transition-colors group-hover:border-laranja group-hover:bg-laranja group-hover:text-tinta"
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

  // O relógio do servidor e o do navegador não batem no segundo, e isso daria
  // mismatch de hidratação. Antes de hidratar, trata como aberta — quem barra
  // pedido fora de hora é o banco, não esta tela.
  const hidratado = useHidratado()
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    // A janela é curta (4h). Sem isto, quem deixa a página aberta às 22h59
    // continua vendo "Aberto agora" depois das 23h.
    const t = setInterval(() => setAgora(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const aberta = !hidratado
    ? true
    : estadoDaLoja({
        isOpen: store.is_open,
        opensAt: store.opens_at,
        closesAt: store.closes_at,
        timezone: store.timezone,
        agora,
      }).aberta

  return (
    <>
      <StoreHeader store={store} aberta={aberta} />

      <nav
        aria-label="Categorias"
        className="sticky top-0 z-20 border-b border-borda bg-fundo/95 backdrop-blur"
      >
        <ul className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]{display:none}">
          {categories.map((c) => (
            <li key={c.id}>
              <a
                href={`#cat-${c.id}`}
                className="etiqueta block whitespace-nowrap rounded-full px-3.5 py-2 text-tinta-fraca transition-colors hover:bg-superficie hover:text-tinta"
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
            <h2 className="etiqueta sticky top-14 z-10 bg-fundo/95 px-5 py-3 text-tinta backdrop-blur">
              {category.name}
            </h2>
            <ul>
              {category.products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  disabled={!aberta}
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
