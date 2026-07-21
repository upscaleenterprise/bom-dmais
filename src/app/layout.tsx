import type { Metadata, Viewport } from 'next'
import { Anton, Archivo } from 'next/font/google'
import './globals.css'

// Anton: a placa do açougue. Pesada, condensada, sem meio-termo.
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
})

// Archivo é variável no eixo de largura — dá etiqueta condensada de verdade,
// em vez de fingir estreitando com letter-spacing.
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  axes: ['wdth'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Churrasquinho Bom D+',
  description: 'Carne no ponto, entregue quente.',
}

export const viewport: Viewport = {
  themeColor: '#17120f',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${archivo.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
