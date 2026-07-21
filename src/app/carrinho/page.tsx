import { getMenu } from '@/lib/menu'
import { Carrinho } from '@/components/Carrinho'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { store } = await getMenu()
  return <Carrinho store={store} />
}
