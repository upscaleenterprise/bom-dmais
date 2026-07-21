import type { Metadata } from 'next'
import { Painel } from '@/components/Painel'

export const metadata: Metadata = {
  title: 'Painel · Bom D+',
  // O painel não é conteúdo público; não faz sentido em buscador.
  robots: { index: false, follow: false },
}

export default function Page() {
  return <Painel />
}
