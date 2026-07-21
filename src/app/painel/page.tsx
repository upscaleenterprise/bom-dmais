import type { Metadata } from 'next'
import { Painel } from '@/components/Painel'

export const metadata: Metadata = {
  title: 'Painel · Brasa Viva',
  // O painel não é conteúdo público; não faz sentido em buscador.
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Painel />
}
