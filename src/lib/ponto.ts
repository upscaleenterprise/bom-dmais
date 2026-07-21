/*
  A régua do ponto da carne, desenhada como corte transversal:
  crosta selada por fora, miolo vermelho por dentro. Conforme passa do mal ao
  bem, o miolo encolhe e escurece até sumir.

  Isso não é enfeite — muita gente não sabe a diferença entre "ao ponto para mal"
  e "ao ponto". Vendo a cor, sabe.
*/

type Corte = { miolo: string; tamanho: number }

const CRAVO = '#3a2015' // crosta selada
const COZIDO = '#8b5a3c' // carne cozida, o que sobra quando o miolo some

const ESCALA: Corte[] = [
  { miolo: '#b01f26', tamanho: 70 }, // mal passada — miolo cru e largo
  { miolo: '#c0392e', tamanho: 54 },
  { miolo: '#cb5b45', tamanho: 38 }, // ao ponto — rosado
  { miolo: '#a9613f', tamanho: 20 },
  { miolo: COZIDO, tamanho: 0 }, // bem passada — sem miolo
]

/** O grupo "Ponto da carne" ganha o tratamento visual; os outros são lista comum. */
export function isPonto(groupName: string): boolean {
  return groupName.toLowerCase().includes('ponto da carne')
}

/**
 * Posição na régua a partir do índice da opção no grupo, para o desenho não
 * depender do texto do nome — se a loja renomear "Mal passada", continua certo.
 */
export function corteDoPonto(index: number, total: number): string {
  const passo = total <= 1 ? 0 : (index / (total - 1)) * (ESCALA.length - 1)
  const { miolo, tamanho } = ESCALA[Math.round(passo)] ?? ESCALA[ESCALA.length - 1]

  return `radial-gradient(circle, ${miolo} 0 ${tamanho}%, ${COZIDO} ${tamanho}% 78%, ${CRAVO} 78% 100%)`
}
