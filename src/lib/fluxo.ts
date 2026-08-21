// Regras do painel, sem Supabase e sem React — testáveis direto no node.

import type { OrderStatus, PaymentMethod } from './types'

export const ATIVOS: OrderStatus[] = ['recebido', 'em_preparo', 'saiu_entrega']

/**
 * Para onde o pedido pode ir a partir de onde está — pode ser mais de um.
 *
 * Ao receber, o dono ESCOLHE: "Pôr na brasa" (avisa o cliente que está
 * preparando) ou "Saiu pra entrega" (pula direto, quando já está pronto). Daí
 * em diante o caminho é único até "Entregue".
 */
export function proximosStatus(status: OrderStatus): OrderStatus[] {
  const fluxo: Partial<Record<OrderStatus, OrderStatus[]>> = {
    recebido: ['em_preparo', 'saiu_entrega'],
    em_preparo: ['saiu_entrega'],
    saiu_entrega: ['entregue'],
  }
  return fluxo[status] ?? []
}

export const ROTULO_STATUS: Record<OrderStatus, string> = {
  recebido: 'Recebido',
  em_preparo: 'Na brasa',
  saiu_entrega: 'Saiu pra entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

/**
 * O rótulo do botão descreve PARA ONDE ele leva, não o estado atual — porque
 * um mesmo estado (recebido) pode ter dois botões, cada um pra um destino.
 */
export const ROTULO_ACAO: Partial<Record<OrderStatus, string>> = {
  em_preparo: 'Pôr na brasa',
  saiu_entrega: 'Saiu pra entrega',
  entregue: 'Marcar entregue',
}

export const ROTULO_PAGAMENTO: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao_entrega: 'Cartão na entrega',
}

/**
 * Quais pedidos são novidade em relação ao que o painel já conhecia.
 *
 * O painel recarrega a cada evento do banco, inclusive quando o próprio dono
 * muda um status. Tocar em toda mudança transformaria o alerta em ruído — e
 * alerta que vira ruído é alerta desligado. Só é "novo" o que ainda não existia.
 */
export function pedidosNovos<T extends { id: string }>(
  conhecidos: ReadonlySet<string>,
  atuais: readonly T[],
): T[] {
  return atuais.filter((p) => !conhecidos.has(p.id))
}

/**
 * "há 4 min" — o dono precisa saber há quanto tempo o pedido está esperando.
 * O relógio entra por parâmetro: função que lê Date.now() por dentro é
 * impossível de testar sem viajar no tempo.
 */
export function haQuantoTempo(iso: string, agora: number): string {
  const min = Math.floor((agora - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h${min % 60 ? ` ${min % 60}min` : ''}`
  return `há ${Math.floor(h / 24)}d`
}
