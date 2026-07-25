import { supabase, STORE_SLUG } from './supabase'

/*
  Edição do cardápio pelo dono. Cada função é um write pontual atrás do RLS —
  quem não é dono da loja não muda nada (garantido no banco, testado em
  check5.mjs). Aqui a régua é a validação de UX; a autoridade é a policy.
*/

export type VarEdit = {
  id: string
  name: string
  price_cents: number
  is_available: boolean
}

export type ProdEdit = {
  id: string
  name: string
  description: string | null
  is_available: boolean
  variants: VarEdit[]
}

export type CatEdit = {
  id: string
  name: string
  products: ProdEdit[]
}

const QUERY = `
  id, name, position,
  products (
    id, name, description, is_available, position,
    product_variants ( id, name, price_cents, is_available, position )
  )
`

const porPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position

/**
 * O cardápio inteiro, INCLUINDO o que está indisponível — o dono precisa ver o
 * que desligou para poder religar. É por isso que não reusa o getMenu público,
 * que esconde o indisponível do cliente.
 */
export async function carregarParaEditar(): Promise<CatEdit[]> {
  const { data: store, error: se } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', STORE_SLUG)
    .single()
  if (se || !store) throw new Error(se?.message ?? 'Loja não encontrada.')

  const { data, error } = await supabase
    .from('categories')
    .select(QUERY)
    .eq('store_id', store.id)
  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      position: c.position as number,
      products: (c.products ?? [])
        .map((p) => ({
          id: p.id as string,
          name: p.name as string,
          description: p.description as string | null,
          is_available: p.is_available as boolean,
          position: p.position as number,
          variants: (p.product_variants ?? [])
            .map((v) => ({
              id: v.id as string,
              name: v.name as string,
              price_cents: v.price_cents as number,
              is_available: v.is_available as boolean,
              position: v.position as number,
            }))
            .sort(porPos),
        }))
        .sort(porPos),
    }))
    .sort(porPos)
}

export async function salvarPrecoVariacao(id: string, price_cents: number) {
  const { error } = await supabase
    .from('product_variants')
    .update({ price_cents })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function alternarVariacao(id: string, is_available: boolean) {
  const { error } = await supabase
    .from('product_variants')
    .update({ is_available })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function alternarProduto(id: string, is_available: boolean) {
  const { error } = await supabase
    .from('products')
    .update({ is_available })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function salvarTextoProduto(
  id: string,
  campos: { name: string; description: string | null },
) {
  const { error } = await supabase.from('products').update(campos).eq('id', id)
  if (error) throw new Error(error.message)
}
