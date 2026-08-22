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
  image_url: string | null
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
    id, name, description, is_available, position, image_url,
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
          image_url: p.image_url as string | null,
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

const BUCKET = 'produtos'

/** O caminho do arquivo dentro do bucket, extraído da URL pública — ou null se
 *  a URL não for do nosso Storage (foto antiga, link externo). */
function caminhoNoBucket(url: string | null): string | null {
  if (!url) return null
  const marca = `/${BUCKET}/`
  const i = url.indexOf(marca)
  return i === -1 ? null : url.slice(i + marca.length)
}

/**
 * Sobe uma foto pro produto e aponta o image_url pra ela.
 *
 * Nome único (id + timestamp): evita o cache do CDN servir a foto velha depois
 * de trocar. A foto antiga é apagada depois — só o que era do nosso bucket, pra
 * não deixar lixo acumulando de graça.
 */
export async function enviarFotoProduto(
  productId: string,
  file: File,
  urlAtual: string | null,
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const caminho = `${productId}-${Date.now()}.${ext || 'jpg'}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, file, { cacheControl: '3600', contentType: file.type || undefined })
  if (upErr) throw new Error(upErr.message)

  const url = supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl

  const { error: dbErr } = await supabase
    .from('products')
    .update({ image_url: url })
    .eq('id', productId)
  if (dbErr) throw new Error(dbErr.message)

  const antiga = caminhoNoBucket(urlAtual)
  if (antiga && antiga !== caminho) {
    // Best-effort: a nova já está no ar; se a limpeza falhar, não é erro do usuário.
    await supabase.storage.from(BUCKET).remove([antiga])
  }
  return url
}

export async function removerFotoProduto(productId: string, urlAtual: string | null) {
  const { error } = await supabase
    .from('products')
    .update({ image_url: null })
    .eq('id', productId)
  if (error) throw new Error(error.message)

  const caminho = caminhoNoBucket(urlAtual)
  if (caminho) await supabase.storage.from(BUCKET).remove([caminho])
}
