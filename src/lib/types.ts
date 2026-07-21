export type OrderStatus =
  | 'recebido'
  | 'em_preparo'
  | 'saiu_entrega'
  | 'entregue'
  | 'cancelado'

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao_entrega'

export type PaymentStatus = 'aguardando' | 'confirmado' | 'estornado'

export type Store = {
  id: string
  slug: string
  name: string
  description: string | null
  phone: string | null
  pix_key: string | null
  is_open: boolean
  delivery_fee_cents: number
  min_order_cents: number
}

export type Variant = {
  id: string
  name: string
  price_cents: number
  is_available: boolean
}

export type Option = {
  id: string
  name: string
  price_cents: number
  is_available: boolean
}

export type OptionGroup = {
  id: string
  name: string
  min_select: number
  max_select: number
  options: Option[]
}

export type Product = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  is_available: boolean
  variants: Variant[]
  option_groups: OptionGroup[]
}

export type Category = {
  id: string
  name: string
  products: Product[]
}

export type Menu = {
  store: Store
  categories: Category[]
}
