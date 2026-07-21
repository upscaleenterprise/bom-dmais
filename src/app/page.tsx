import { getMenu } from '@/lib/menu'
import { Cardapio } from '@/components/Cardapio'

// O cardápio muda quando a loja mexe nele, e o aberto/fechado muda durante o dia.
// Nada aqui pode vir de cache.
export const dynamic = 'force-dynamic'

export default async function Page() {
  const { store, categories } = await getMenu()

  return <Cardapio store={store} categories={categories} />
}
