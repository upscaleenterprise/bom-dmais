/*
  Razão de contraste WCAG 2.1.

  Existe para a paleta ser conferida por teste, e não por opinião: qualquer cor
  nova de texto precisa passar aqui antes de entrar no app.
*/

function canal(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminancia(hex: string): number {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}

/** 1 (nenhum contraste) a 21 (preto sobre branco). */
export function contraste(a: string, b: string): number {
  const la = luminancia(a)
  const lb = luminancia(b)
  const [claro, escuro] = la > lb ? [la, lb] : [lb, la]
  return (claro + 0.05) / (escuro + 0.05)
}

/** AA: 4.5 para texto normal, 3.0 para texto grande e componente de UI. */
export function passaAA(a: string, b: string, grande = false): boolean {
  return contraste(a, b) >= (grande ? 3 : 4.5)
}
