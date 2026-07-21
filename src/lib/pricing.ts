// Regra de preço, sem React e sem storage — dá pra testar direto no node.

export type CartOption = {
  optionId: string
  groupName: string
  optionName: string
  priceCents: number
}

export type CartItem = {
  /** id da linha do carrinho — duas picanhas com pontos diferentes são linhas distintas */
  lineId: string
  productId: string
  productName: string
  variantId: string
  variantName: string
  /** preço da variação, sem as opções */
  basePriceCents: number
  options: CartOption[]
  quantity: number
  notes: string
}

export type NewCartItem = Omit<CartItem, 'lineId' | 'quantity'>

/** Preço cheio de uma unidade: variação + tudo que foi escolhido em cima. */
export function unitPrice(item: NewCartItem | CartItem): number {
  return (
    item.basePriceCents +
    item.options.reduce((sum, option) => sum + option.priceCents, 0)
  )
}

export function lineTotal(item: CartItem): number {
  return unitPrice(item) * item.quantity
}

export function subtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0)
}

/**
 * Mesma variação + exatamente as mesmas opções + mesma observação = mesma linha,
 * então some a quantidade em vez de empilhar linhas repetidas.
 */
export function sameLine(a: NewCartItem, b: CartItem): boolean {
  if (a.variantId !== b.variantId) return false
  if (a.notes.trim() !== b.notes.trim()) return false
  if (a.options.length !== b.options.length) return false
  const idsA = a.options.map((o) => o.optionId).sort()
  const idsB = b.options.map((o) => o.optionId).sort()
  return idsA.every((id, i) => id === idsB[i])
}

/** Frete só entra se o pedido bate o mínimo — a tela precisa saber o porquê. */
export function orderTotal(params: {
  subtotalCents: number
  deliveryFeeCents: number
}): number {
  return params.subtotalCents + params.deliveryFeeCents
}

export function meetsMinimum(subtotalCents: number, minOrderCents: number): boolean {
  return subtotalCents >= minOrderCents
}
