'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PaymentMethod, Store } from '@/lib/types'
import { formatBRL, parseBRL } from '@/lib/money'
import { meetsMinimum } from '@/lib/pricing'
import { selectSubtotal, useCart } from '@/lib/cart'
import { mascaraTelefone, telefoneValido, useCliente } from '@/lib/cliente'
import { useHidratado } from '@/lib/hidratado'
import { supabase, STORE_SLUG } from '@/lib/supabase'
import { Topo } from './Topo'

const PAGAMENTOS: { id: PaymentMethod; nome: string; nota: string }[] = [
  { id: 'pix', nome: 'Pix', nota: 'A chave aparece no fim' },
  { id: 'dinheiro', nome: 'Dinheiro', nota: 'Na entrega' },
  { id: 'cartao_entrega', nome: 'Cartão', nota: 'Maquininha na entrega' },
]

function Campo({
  label,
  value,
  onChange,
  erro,
  ...props
}: {
  label: string
  value: string
  onChange: (v: string) => void
  erro?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block">
      <span className="etiqueta mb-1.5 block text-sal-fraco">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!erro}
        className={`w-full rounded-lg border bg-carvao px-3.5 py-3 text-sm text-sal placeholder:text-sal-fraco/50 ${
          erro ? 'border-mal' : 'border-borda'
        }`}
      />
      {erro && <span className="mt-1 block text-xs text-mal">{erro}</span>}
    </label>
  )
}

export function Checkout({ store }: { store: Store }) {
  const router = useRouter()
  const items = useCart((s) => s.items)
  const subtotal = useCart(selectSubtotal)
  const limpar = useCart((s) => s.clear)
  const { cliente, salvar } = useCliente()

  const [pagamento, setPagamento] = useState<PaymentMethod>('pix')
  const [troco, setTroco] = useState('')
  const [obs, setObs] = useState('')
  const [tentou, setTentou] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  const pronto = useHidratado()

  // Carrinho vazio (ou esvaziado noutra aba) não tem checkout.
  useEffect(() => {
    if (pronto && items.length === 0 && !enviando) router.replace('/carrinho')
  }, [pronto, items.length, enviando, router])

  if (!pronto || items.length === 0) return <Topo titulo="Checkout" voltarPara="/carrinho" />

  const total = subtotal + store.delivery_fee_cents
  const trocoCents = parseBRL(troco)

  const erros: Record<string, string> = {}
  if (!cliente.nome.trim()) erros.nome = 'Informe seu nome.'
  if (!telefoneValido(cliente.telefone)) erros.telefone = 'Telefone incompleto.'
  if (!cliente.rua.trim()) erros.rua = 'Informe a rua.'
  if (!cliente.numero.trim()) erros.numero = 'Informe o número.'
  if (!cliente.bairro.trim()) erros.bairro = 'Informe o bairro.'
  if (pagamento === 'dinheiro' && troco.trim() && trocoCents !== null && trocoCents < total) {
    erros.troco = `O troco precisa ser de pelo menos ${formatBRL(total)}.`
  }
  const valido = Object.keys(erros).length === 0 && meetsMinimum(subtotal, store.min_order_cents)

  async function enviar() {
    setTentou(true)
    setFalha(null)
    if (!valido) return

    setEnviando(true)

    // O servidor recebe intenção, não preço: ids, quantidades e opções.
    const { data, error } = await supabase.rpc('create_order', {
      p_store_slug: STORE_SLUG,
      p_customer_name: cliente.nome,
      p_customer_phone: cliente.telefone,
      p_address_street: cliente.rua,
      p_address_number: cliente.numero,
      p_address_complement: cliente.complemento || null,
      p_address_district: cliente.bairro,
      p_address_reference: cliente.referencia || null,
      p_payment_method: pagamento,
      p_change_for_cents: pagamento === 'dinheiro' ? trocoCents : null,
      p_notes: obs || null,
      p_items: items.map((i) => ({
        variant_id: i.variantId,
        quantity: i.quantity,
        notes: i.notes || null,
        option_ids: i.options.map((o) => o.optionId),
      })),
    })

    if (error || !data?.[0]) {
      // A mensagem do banco já vem escrita pro cliente ler.
      setFalha(error?.message ?? 'Não foi possível registrar o pedido.')
      setEnviando(false)
      return
    }

    limpar()
    router.replace(`/pedido/${data[0].order_id}`)
  }

  return (
    <>
      <Topo titulo="Checkout" voltarPara="/carrinho" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-40 pt-5">
        <section className="mb-8">
          <h2 className="etiqueta mb-3 text-brasa">Quem vai receber</h2>
          <div className="space-y-3">
            <Campo
              label="Nome"
              value={cliente.nome}
              onChange={(v) => salvar({ nome: v })}
              erro={tentou ? erros.nome : undefined}
              placeholder="Como te brasa-vivamos"
              autoComplete="name"
            />
            <Campo
              label="Telefone"
              value={cliente.telefone}
              onChange={(v) => salvar({ telefone: mascaraTelefone(v) })}
              erro={tentou ? erros.telefone : undefined}
              placeholder="(98) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="etiqueta mb-3 text-brasa">Endereço da entrega</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_5.5rem] gap-3">
              <Campo
                label="Rua"
                value={cliente.rua}
                onChange={(v) => salvar({ rua: v })}
                erro={tentou ? erros.rua : undefined}
                autoComplete="address-line1"
              />
              <Campo
                label="Número"
                value={cliente.numero}
                onChange={(v) => salvar({ numero: v })}
                erro={tentou ? erros.numero : undefined}
                inputMode="numeric"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo
                label="Bairro"
                value={cliente.bairro}
                onChange={(v) => salvar({ bairro: v })}
                erro={tentou ? erros.bairro : undefined}
              />
              <Campo
                label="Complemento"
                value={cliente.complemento}
                onChange={(v) => salvar({ complemento: v })}
                placeholder="Apto, bloco"
              />
            </div>
            <Campo
              label="Ponto de referência"
              value={cliente.referencia}
              onChange={(v) => salvar({ referencia: v })}
              placeholder="Portão verde, ao lado da praça"
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="etiqueta mb-3 text-brasa">Pagamento</h2>
          <div className="grid grid-cols-3 gap-2">
            {PAGAMENTOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPagamento(p.id)}
                aria-pressed={pagamento === p.id}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                  pagamento === p.id
                    ? 'border-brasa bg-brasa/12'
                    : 'border-borda hover:border-sal-fraco'
                }`}
              >
                <span className="block text-sm font-semibold text-sal">{p.nome}</span>
                <span className="mt-0.5 block text-[0.65rem] leading-tight text-sal-fraco">
                  {p.nota}
                </span>
              </button>
            ))}
          </div>

          {pagamento === 'dinheiro' && (
            <div className="mt-3">
              <Campo
                label="Troco para quanto?"
                value={troco}
                onChange={setTroco}
                erro={tentou ? erros.troco : undefined}
                placeholder={`Deixe vazio se tiver o valor certo`}
                inputMode="decimal"
              />
            </div>
          )}

          {pagamento === 'pix' && (
            <p className="mt-3 rounded-lg border border-borda bg-fumaca px-3.5 py-3 text-xs leading-relaxed text-sal-fraco">
              A chave Pix aparece na próxima tela. O pedido entra na cozinha assim
              que a churrascaria confirmar o pagamento.
            </p>
          )}
        </section>

        <section className="mb-8">
          <label className="block">
            <span className="etiqueta mb-1.5 block text-sal-fraco">
              Observação do pedido
            </span>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Interfone quebrado, ligar ao chegar"
              className="w-full resize-none rounded-lg border border-borda bg-carvao px-3.5 py-3 text-sm text-sal placeholder:text-sal-fraco/50"
            />
          </label>
        </section>

        <dl className="space-y-2.5 border-t border-borda pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-sal-fraco">
              Subtotal · {items.length} {items.length === 1 ? 'item' : 'itens'}
            </dt>
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
          {falha && (
            <p role="alert" className="mb-2.5 text-center text-sm font-medium text-mal">
              {falha}
            </p>
          )}
          {tentou && !valido && !falha && (
            <p role="alert" className="mb-2.5 text-center text-xs text-mal">
              Confira os campos destacados acima.
            </p>
          )}
          <button
            type="button"
            onClick={enviar}
            disabled={enviando}
            className="flex h-12 w-full items-center justify-between rounded-lg bg-brasa px-4 font-semibold text-carvao transition-colors hover:bg-brasa-viva disabled:opacity-60"
          >
            <span>{enviando ? 'Enviando...' : 'Fazer pedido'}</span>
            <span className="tabular-nums">{formatBRL(total)}</span>
          </button>
        </div>
      </div>
    </>
  )
}
