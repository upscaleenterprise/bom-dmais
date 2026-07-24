/*
  Horário de funcionamento — funções puras, sem React e sem banco.

  O relógio entra por parâmetro de propósito: função que lê `new Date()` por
  dentro só dá pra testar viajando no tempo.

  Atenção: quem decide de verdade se o pedido entra é o banco, dentro de
  create_order. Isto aqui é para a tela avisar antes de a pessoa montar o
  carrinho inteiro à toa.
*/

/** "19:00:00" (Postgres) ou "19:00" → minutos desde a meia-noite. */
export function emMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** "19:00:00" → "19h" · "19:30:00" → "19h30" — como se fala, não como se armazena. */
export function formatarHora(hora: string): string {
  const total = emMinutos(hora)
  if (total === null) return hora
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** A hora atual no fuso da loja, em "HH:MM". O fuso é da loja, não do cliente. */
export function horaNaLoja(timezone: string, agora: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(agora)
}

/**
 * A janela pode cruzar a meia-noite — 19h às 2h é um horário perfeitamente
 * normal para churrasquinho, e comparar só com `>=` e `<` daria sempre fechado.
 */
export function dentroDaJanela(
  agora: string,
  abre: string,
  fecha: string,
): boolean {
  const a = emMinutos(agora)
  const i = emMinutos(abre)
  const f = emMinutos(fecha)
  if (a === null || i === null || f === null) return false

  if (i === f) return false // janela de duração zero: fechado
  return i < f ? a >= i && a < f : a >= i || a < f
}

export type EstadoLoja =
  | { aberta: true }
  | { aberta: false; motivo: 'fora_do_horario' | 'fechada_pelo_dono' }

/**
 * `isOpen` é a chave manual do dono ("acabou a carne"), não o horário.
 * Os dois precisam estar de acordo para a loja aceitar pedido.
 */
export function estadoDaLoja(params: {
  isOpen: boolean
  opensAt: string
  closesAt: string
  timezone: string
  agora: Date
}): EstadoLoja {
  if (!params.isOpen) return { aberta: false, motivo: 'fechada_pelo_dono' }

  const hora = horaNaLoja(params.timezone, params.agora)
  return dentroDaJanela(hora, params.opensAt, params.closesAt)
    ? { aberta: true }
    : { aberta: false, motivo: 'fora_do_horario' }
}

/** "Abrimos às 19h" diz mais que "Fechada" — a pessoa sabe quando voltar. */
export function recadoDeFechado(estado: EstadoLoja, abre: string): string | null {
  if (estado.aberta) return null
  return estado.motivo === 'fora_do_horario'
    ? `Abrimos às ${formatarHora(abre)}`
    : 'Fechado no momento'
}

/**
 * O que o painel mostra para o dono — que é outra pergunta da que o cliente faz.
 *
 * O cliente quer saber se pode pedir. O dono precisa saber se está recebendo
 * pedido AGORA, e por que não, se não estiver. Um painel escrito "Aberta" com a
 * loja recusando pedido por horário é pior que não informar nada.
 */
export function estadoParaODono(params: {
  isOpen: boolean
  opensAt: string
  closesAt: string
  timezone: string
  agora: Date
}): { rotulo: string; recebendo: boolean; explicacao: string } {
  const estado = estadoDaLoja(params)

  if (estado.aberta) {
    return {
      rotulo: 'Recebendo',
      recebendo: true,
      explicacao: `Aberta até ${formatarHora(params.closesAt)}`,
    }
  }

  if (estado.motivo === 'fora_do_horario') {
    return {
      rotulo: 'Fora do horário',
      recebendo: false,
      // A chave está ligada: quando der a hora, abre sozinha.
      explicacao: `Abre sozinha às ${formatarHora(params.opensAt)}`,
    }
  }

  return {
    rotulo: 'Fechada',
    recebendo: false,
    explicacao: 'Você fechou a loja',
  }
}
