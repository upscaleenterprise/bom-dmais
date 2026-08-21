'use client'

import { useEffect, useState } from 'react'
import type { OrderStatus } from '@/lib/types'
import type { PedidoJson } from '@/lib/order'
import { formatBRL } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { Topo } from './Topo'

const TRILHA: { id: OrderStatus; rotulo: string }[] = [
  { id: 'recebido', rotulo: 'Recebido' },
  { id: 'em_preparo', rotulo: 'Na brasa' },
  { id: 'saiu_entrega', rotulo: 'Saiu pra entrega' },
  { id: 'entregue', rotulo: 'Entregue' },
]

function Trilha({ status }: { status: OrderStatus }) {
  if (status === 'cancelado') {
    return (
      <p className="rounded-lg border border-erro/40 bg-erro/10 px-4 py-3 text-sm text-tinta">
        Este pedido foi cancelado. Fale com a churrascaria se não foi você.
      </p>
    )
  }

  const atual = TRILHA.findIndex((p) => p.id === status)

  return (
    <ol className="flex gap-1.5">
      {TRILHA.map((passo, i) => {
        const feito = i <= atual
        return (
          <li key={passo.id} className="flex-1">
            <span
              aria-hidden
              className={`block h-1 rounded-full ${feito ? 'bg-laranja' : 'bg-borda'}`}
            />
            <span
              aria-current={i === atual ? 'step' : undefined}
              className={`etiqueta mt-2 block text-[0.6rem] ${
                i === atual
                  ? 'text-tinta'
                  : feito
                    ? 'text-tinta-fraca'
                    : 'text-tinta-fraca/45'
              }`}
            >
              {passo.rotulo}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function ChavePix({
  total,
  pix,
}: {
  total: number
  pix: { svg: string; brcode: string }
}) {
  const [copiou, setCopiou] = useState(false)

  return (
    <section className="rounded-lg border border-laranja/40 bg-laranja/8 p-4">
      <h2 className="etiqueta mb-2 text-tinta">Pague com Pix</h2>
      <p className="mb-4 text-sm leading-relaxed text-tinta-fraca">
        Aponte a câmera do app do banco. O valor de{' '}
        <span className="font-semibold text-tinta">{formatBRL(total)}</span> já vai
        preenchido.
      </p>

      <div
        // O SVG vem do nosso servidor, gerado a partir do pedido — não é conteúdo
        // de terceiro. A borda clara existe porque leitor de QR precisa de
        // contraste; sobre o carvão, muitos falham.
        dangerouslySetInnerHTML={{ __html: pix.svg }}
        className="mx-auto w-full max-w-[15rem] overflow-hidden rounded-lg border border-borda bg-fundo [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
      />

      <p className="mt-4 mb-1.5 text-xs text-tinta-fraca">
        Ou use o Pix copia e cola:
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-borda bg-fundo px-3 py-2.5">
        <code className="min-w-0 flex-1 truncate text-xs text-tinta-fraca">
          {pix.brcode}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(pix.brcode)
            setCopiou(true)
            setTimeout(() => setCopiou(false), 2000)
          }}
          className="etiqueta shrink-0 rounded bg-amarelo px-2.5 py-1.5 text-tinta transition-colors hover:bg-laranja"
        >
          {copiou ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </section>
  )
}

export function Pedido({
  inicial,
  pix,
}: {
  inicial: PedidoJson
  pix: { svg: string; brcode: string } | null
}) {
  const [pedido, setPedido] = useState(inicial)

  useEffect(() => {
    // O cliente não pode ler a tabela orders (o RLS barra), então o Realtime não
    // entrega evento pra ele. Consultar a RPC de tempos em tempos é o caminho
    // honesto — e só enquanto o pedido ainda pode mudar.
    if (pedido.status === 'entregue' || pedido.status === 'cancelado') return

    const t = setInterval(async () => {
      const { data } = await supabase.rpc('get_order', { p_order_id: pedido.id })
      if (data) setPedido(data as PedidoJson)
    }, 15_000)

    return () => clearInterval(t)
  }, [pedido.id, pedido.status])

  const { address: e } = pedido

  return (
    <>
      <Topo titulo="Pedido" voltarPara="/" />

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-7 px-4 pb-16 pt-5">
        <section>
          {/* O topo já diz "Pedido". Aqui o rótulo informa o que o número É:
              o código que o cliente fala no telefone. */}
          <span className="etiqueta text-tinta-fraca">Código</span>
          <p className="placa text-4xl leading-none text-tinta">{pedido.code}</p>
          <p className="mt-2 text-sm text-tinta-fraca">
            Guarde este link — é por ele que você acompanha o pedido.
          </p>
        </section>

        <Trilha status={pedido.status} />

        {pedido.payment_method === 'pix' &&
          pedido.payment_status === 'aguardando' &&
          pix && <ChavePix total={pedido.total_cents} pix={pix} />}

        {pedido.payment_status === 'confirmado' && (
          <p className="rounded-lg border border-borda bg-superficie px-4 py-3 text-sm text-tinta">
            Pagamento confirmado.
          </p>
        )}

        <section>
          <h2 className="etiqueta mb-3 text-tinta">Itens</h2>
          <ul className="divide-y divide-borda/60">
            {pedido.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-tinta">
                    {item.quantity}× {item.product_name}{' '}
                    <span className="font-normal text-tinta-fraca">
                      {item.variant_name}
                    </span>
                  </p>
                  {item.options.map((o, j) => (
                    <p key={j} className="mt-0.5 text-xs text-tinta-fraca">
                      {o.option_name}
                    </p>
                  ))}
                  {item.notes && (
                    <p className="mt-1 text-xs italic text-tinta-fraca">{item.notes}</p>
                  )}
                </div>
                <span className="shrink-0 text-sm tabular-nums text-tinta">
                  {formatBRL(item.line_total_cents)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-borda pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-tinta-fraca">Subtotal</dt>
              <dd className="tabular-nums text-tinta">{formatBRL(pedido.subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-tinta-fraca">Entrega</dt>
              <dd className="tabular-nums text-tinta">
                {formatBRL(pedido.delivery_fee_cents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-borda pt-2">
              <dt className="placa text-lg text-tinta">Total</dt>
              <dd className="preco text-xl leading-none text-tinta">
                {formatBRL(pedido.total_cents)}
              </dd>
            </div>
            {pedido.change_for_cents !== null && (
              <div className="flex justify-between">
                <dt className="text-tinta-fraca">Troco para</dt>
                <dd className="tabular-nums text-tinta">
                  {formatBRL(pedido.change_for_cents)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section>
          <h2 className="etiqueta mb-2 text-tinta">Entrega</h2>
          <p className="text-sm leading-relaxed text-tinta">
            {e.street}, {e.number}
            {e.complement && ` — ${e.complement}`}
            <br />
            <span className="text-tinta-fraca">{e.district}</span>
            {e.reference && <span className="text-tinta-fraca"> · {e.reference}</span>}
          </p>
          {pedido.notes && (
            <p className="mt-3 border-l-2 border-borda pl-3 text-sm italic text-tinta-fraca">
              {pedido.notes}
            </p>
          )}
        </section>

        {pedido.store.phone && (
          <a
            href={`https://wa.me/${pedido.store.phone}?text=${encodeURIComponent(
              `Olá! Sobre o pedido ${pedido.code}:`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-borda px-4 py-3 text-center text-sm font-semibold text-tinta transition-colors hover:border-tinta-fraca"
          >
            Falar com a churrascaria
          </a>
        )}
      </main>
    </>
  )
}
