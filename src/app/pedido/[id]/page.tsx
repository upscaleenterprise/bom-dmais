import { notFound } from 'next/navigation'
import { getOrder } from '@/lib/order'
import { gerarBRCode } from '@/lib/pix'
import { qrSvg } from '@/lib/qr'
import { Pedido } from '@/components/Pedido'

export const dynamic = 'force-dynamic'

// Next 16: params é Promise. O acesso síncrono foi removido, não só descontinuado.
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pedido = await getOrder(id)

  if (!pedido) notFound()

  // O QR é montado no servidor: o payload não muda depois que o pedido existe,
  // e assim a biblioteca de QR não vai parar no navegador do cliente.
  let pix: { svg: string; brcode: string } | null = null

  if (pedido.payment_method === 'pix' && pedido.store.pix_key) {
    const brcode = gerarBRCode({
      chave: pedido.store.pix_key,
      nome: pedido.store.name,
      cidade: pedido.store.city ?? 'Brasil',
      valorCents: pedido.total_cents,
      referencia: pedido.code,
    })
    pix = { svg: await qrSvg(brcode), brcode }
  }

  return <Pedido inicial={pedido} pix={pix} />
}
