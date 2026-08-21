import type { OrderStatus } from './types'

// As cenas que o dono desenhou usam nomes próprios ("brasa", "entrega"); os
// status do banco são outros. Este é o único ponto que traduz um no outro.
export type Cena = 'recebido' | 'brasa' | 'entrega' | 'entregue'

/**
 * Qual animação representa cada status na tela do cliente.
 *
 * "cancelado" não tem cena: pedido cancelado não é uma etapa da jornada, é uma
 * saída dela — a tela mostra o aviso de cancelamento, não um bonequinho.
 */
export function cenaDoStatus(status: OrderStatus): Cena | null {
  switch (status) {
    case 'recebido':
      return 'recebido'
    case 'em_preparo':
      return 'brasa'
    case 'saiu_entrega':
      return 'entrega'
    case 'entregue':
      return 'entregue'
    case 'cancelado':
      return null
  }
}
