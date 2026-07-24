/*
  O espeto desenhado mostra o que tem dentro dele.

  "Carne com linguiça" desenha carne e linguiça; "Mistão" desenha os três. Não é
  enfeite: o cliente lê o espeto mais rápido do que lê o nome, e a diferença
  entre os sabores fica visível sem precisar comparar texto.

  Quando o nome não tem ingrediente nenhum — "Acerola", "Lata 350ml" —, não há
  espeto, e a tela cai na lista comum.
*/

export type Ingrediente = 'carne' | 'frango' | 'linguica'

export const COR_INGREDIENTE: Record<Ingrediente, string> = {
  carne: '#8b4a2b', // vermelho tostado
  frango: '#c9a227', // dourado
  linguica: '#a03a28', // avermelhado
}

export const NOME_INGREDIENTE: Record<Ingrediente, string> = {
  carne: 'carne',
  frango: 'frango',
  linguica: 'linguiça',
}

const PADROES: [Ingrediente, RegExp][] = [
  ['carne', /\bcarnes?\b/],
  ['frango', /\bfrangos?\b/],
  ['linguica', /\blingui[çc]as?\b/],
]

/**
 * Os ingredientes citados no nome, na ordem em que aparecem — "carne com
 * linguiça" e "linguiça com carne" desenham espetos diferentes, como devem.
 */
export function ingredientesDe(nome: string): Ingrediente[] {
  const texto = nome.toLowerCase()

  return PADROES.map(([ing, re]) => [ing, texto.search(re)] as const)
    .filter(([, pos]) => pos >= 0)
    .sort((a, b) => a[1] - b[1])
    .map(([ing]) => ing)
}

export function temEspeto(nome: string): boolean {
  return ingredientesDe(nome).length > 0
}

/**
 * Os pedaços do espeto, de cima para baixo. São sempre 3 — um espeto com um
 * pedaço só pareceria porção menor, e o preço é por espeto, não por peso.
 * Com dois ingredientes eles se alternam; com três, um de cada.
 */
export function pedacosDoEspeto(nome: string, total = 3): Ingrediente[] {
  const ings = ingredientesDe(nome)
  if (ings.length === 0) return []
  return Array.from({ length: total }, (_, i) => ings[i % ings.length])
}
