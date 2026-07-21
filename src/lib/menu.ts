import { supabase, STORE_SLUG } from './supabase'
import type { Menu, Category, Store } from './types'

// Um round-trip só: o PostgREST monta o cardápio aninhado inteiro.
const MENU_QUERY = `
  id, name, position,
  products (
    id, name, description, image_url, is_available, position,
    product_variants ( id, name, price_cents, is_available, position ),
    option_groups (
      id, name, min_select, max_select, position,
      options ( id, name, price_cents, is_available, position )
    )
  )
`

type Row = {
  id: string
  name: string
  position: number
  products: {
    id: string
    name: string
    description: string | null
    image_url: string | null
    is_available: boolean
    position: number
    product_variants: {
      id: string
      name: string
      price_cents: number
      is_available: boolean
      position: number
    }[]
    option_groups: {
      id: string
      name: string
      min_select: number
      max_select: number
      position: number
      options: {
        id: string
        name: string
        price_cents: number
        is_available: boolean
        position: number
      }[]
    }[]
  }[]
}

const byPosition = <T extends { position: number }>(a: T, b: T) =>
  a.position - b.position

export async function getMenu(): Promise<Menu> {
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', STORE_SLUG)
    .single<Store>()

  if (storeError || !store) {
    throw new Error(`Loja "${STORE_SLUG}" não encontrada: ${storeError?.message}`)
  }

  const { data, error } = await supabase
    .from('categories')
    .select(MENU_QUERY)
    .eq('store_id', store.id)
    .returns<Row[]>()

  if (error) throw new Error(`Falha ao carregar o cardápio: ${error.message}`)

  // O PostgREST não garante ordem nos aninhados, então ordeno aqui.
  const categories: Category[] = (data ?? [])
    .sort(byPosition)
    .map((category) => ({
      id: category.id,
      name: category.name,
      products: [...category.products].sort(byPosition).map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        image_url: product.image_url,
        is_available: product.is_available,
        variants: [...product.product_variants]
          .sort(byPosition)
          .filter((v) => v.is_available),
        option_groups: [...product.option_groups]
          .sort(byPosition)
          .map((group) => ({
            id: group.id,
            name: group.name,
            min_select: group.min_select,
            max_select: group.max_select,
            options: [...group.options].sort(byPosition).filter((o) => o.is_available),
          })),
      })),
    }))
    // Categoria sem nada disponível não vira seção vazia na tela.
    .filter((category) => category.products.length > 0)

  return { store, categories }
}
