import { supabase } from './supabase'
import type { OrderStatus, PaymentMethod, PaymentStatus } from './types'

/** O que a função get_order devolve. Quem tem o uuid do pedido, vê. */
export type PedidoJson = {
  id: string
  code: string
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  customer_name: string
  created_at: string
  subtotal_cents: number
  delivery_fee_cents: number
  total_cents: number
  change_for_cents: number | null
  notes: string | null
  address: {
    street: string
    number: string
    complement: string | null
    district: string
    reference: string | null
  }
  store: {
    name: string
    phone: string | null
    pix_key: string | null
    city: string | null
    /** Titular da conta do Pix — o nome que o cliente vê ao pagar. */
    pix_name: string | null
  }
  items: {
    product_name: string
    variant_name: string
    quantity: number
    unit_price_cents: number
    line_total_cents: number
    notes: string | null
    options: { group_name: string; option_name: string; price_cents: number }[]
  }[]
}

export async function getOrder(id: string): Promise<PedidoJson | null> {
  // uuid inválido faz o Postgres reclamar do cast; para quem digitou o link
  // errado, isso é "não encontrado", não erro de servidor.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null

  const { data, error } = await supabase.rpc('get_order', { p_order_id: id })
  if (error) return null
  return (data as PedidoJson) ?? null
}
