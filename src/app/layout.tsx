import type { Metadata, Viewport } from 'next'
import { Baloo_2, Caveat, Nunito } from 'next/font/google'
import './globals.css'

// As três vozes do cardápio impresso: título arredondado, texto limpo e
// preço manuscrito. Famílias do Google mais próximas do material da marca.
const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-baloo',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-caveat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Churrasquinho Bom D+',
  description: 'Aqui é mais gostoso! Espetinho na brasa com acompanhamento.',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${baloo.variable} ${nunito.variable} ${caveat.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
