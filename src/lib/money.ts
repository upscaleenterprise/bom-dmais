// Dinheiro é sempre inteiro em centavos, do banco até a tela.
// Float em preço perde centavo no arredondamento e o caixa não fecha.

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * O preço que aparece no cardápio, antes de abrir o item.
 *
 * "a partir de" só quando os preços realmente variam. Duas variações do mesmo
 * valor — H2OH e Limoneto, ambos R$ 7 — davam "a partir de R$ 7,00", que sugere
 * um preço maior escondido lá dentro.
 */
export function faixaDePreco(precos: number[]): string {
  if (precos.length === 0) return ''
  const menor = Math.min(...precos)
  const maior = Math.max(...precos)
  return menor === maior ? formatBRL(menor) : `a partir de ${formatBRL(menor)}`
}

/** "79,90" e "79.90" viram 7990. Aceita o que o usuário digita de verdade. */
export function parseBRL(input: string): number | null {
  const cleaned = input.replace(/[^\d,.]/g, '').replace(',', '.')
  if (!cleaned) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}
