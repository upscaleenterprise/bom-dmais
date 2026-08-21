'use client'

import { useEffect, useState } from 'react'
import type { OrderStatus } from '@/lib/types'
import type { PedidoJson } from '@/lib/order'
import { formatBRL } from '@/lib/money'
import { supabase } from '@/lib/supabase'
import { AnimacaoStatus } from './AnimacaoStatus'
import { Topo } from './Topo'

// Recebido → (Na brasa) → Saiu → Entregue. O "Na brasa" aparece sempre na
// linha, mas o pedido pode pular direto pra "Saiu" — aí ele conta só como fase
// já vencida, sem prender o cliente.
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

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 pb-16 pt-4">
        {/* A cena diz o status "de barriga" — o cliente entende antes de ler. */}
        <AnimacaoStatus status={pedido.status} />

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
          <p className="flex items-center gap-2.5 rounded-lg border border-sucesso/40 bg-sucesso/10 px-4 py-3 text-sm font-semibold text-sucesso">
            <span
              aria-hidden
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sucesso text-[0.7rem] font-bold text-fundo"
            >
              ✓
            </span>
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
            className="flex items-center justify-center gap-2.5 rounded-lg border border-borda px-4 py-3 text-center text-sm font-semibold text-tinta transition-colors hover:border-tinta-fraca"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-5 w-5 shrink-0"
              fill="#25D366"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
            </svg>
            Falar com a churrascaria
          </a>
        )}
      </main>
    </>
  )
}
