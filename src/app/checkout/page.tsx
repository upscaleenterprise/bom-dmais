import { getMenu } from '@/lib/menu'
import { Checkout } from '@/components/Checkout'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const { store } = await getMenu()
  return <Checkout store={store} />
}
