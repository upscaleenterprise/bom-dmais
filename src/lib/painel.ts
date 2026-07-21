import { supabase, STORE_SLUG } from './supabase'
import type { OrderStatus, PaymentMethod, PaymentStatus } from './types'

export type PedidoPainel = {
  id: string
  code: string
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  customer_name: string
  customer_phone: string
  address_street: string
  address_number: string
  address_complement: string | null
  address_district: string
  address_reference: string | null
  subtotal_cents: number
  delivery_fee_cents: number
  total_cents: number
  change_for_cents: number | null
  notes: string | null
  created_at: string
  order_items: {
    product_name: string
    variant_name: string
    quantity: number
    line_total_cents: number
    notes: string | null
    order_item_options: { group_name: string; option_name: string }[]
  }[]
}

const CAMPOS = `
  id, code, status, payment_method, payment_status,
  customer_name, customer_phone,
  address_street, address_number, address_complement, address_district, address_reference,
  subtotal_cents, delivery_fee_cents, total_cents, change_for_cents, notes, created_at,
  order_items (
    product_name, variant_name, quantity, line_total_cents, notes,
    order_item_options ( group_name, option_name )
  )
`

/** O RLS decide o que aparece: sem vínculo em store_members, volta vazio. */
export async function listarPedidos(): Promise<PedidoPainel[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(CAMPOS)
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<PedidoPainel[]>()

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function mudarStatus(id: string, status: OrderStatus) {
  const { error } = await supabase.rpc('set_order_status', {
    p_order_id: id,
    p_status: status,
  })
  if (error) throw new Error(error.message)
}

export async function confirmarPagamento(id: string) {
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: 'confirmado' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function definirLojaAberta(aberta: boolean) {
  const { error } = await supabase
    .from('stores')
    .update({ is_open: aberta })
    .eq('slug', STORE_SLUG)
  if (error) throw new Error(error.message)
}
