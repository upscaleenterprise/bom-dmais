// Dinheiro é sempre inteiro em centavos, do banco até a tela.
// Float em preço perde centavo no arredondamento e o caixa não fecha.

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/** "79,90" e "79.90" viram 7990. Aceita o que o usuário digita de verdade. */
export function parseBRL(input: string): number | null {
  const cleaned = input.replace(/[^\d,.]/g, '').replace(',', '.')
  if (!cleaned) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}
