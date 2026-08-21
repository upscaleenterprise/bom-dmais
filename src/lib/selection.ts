import type { OptionGroup } from './types'

/**
 * Regra do grupo de opções, aplicada na tela antes de deixar somar ao carrinho.
 * O banco garante a forma do grupo (min/max); quem garante a escolha é aqui.
 *
 * Retorna a mensagem de erro, ou null se a escolha está válida.
 */
export function validateGroup(
  group: OptionGroup,
  selectedIds: string[],
): string | null {
  const count = selectedIds.length

  if (count < group.min_select) {
    return group.min_select === 1
      ? `Escolha ${group.name.toLowerCase()}.`
      : `Escolha pelo menos ${group.min_select} em ${group.name}.`
  }

  if (count > group.max_select) {
    return `Escolha no máximo ${group.max_select} em ${group.name}.`
  }

  return null
}

export function isGroupRequired(group: OptionGroup): boolean {
  return group.min_select > 0
}

/**
 * O que fica selecionado ao clicar numa opção. Lógica pura, testável — porque
 * já errou uma vez (escolha única bloqueava a troca).
 *
 * - Escolha única (max 1): clicar em outra TROCA; clicar na mesma só desmarca
 *   se o grupo for opcional (desmarcar um obrigatório deixaria o pedido inválido).
 * - Escolha múltipla: alterna, respeitando o teto.
 */
export function alternarSelecao(
  group: OptionGroup,
  atual: string[],
  optionId: string,
): string[] {
  const jaTem = atual.includes(optionId)

  if (group.max_select === 1) {
    if (jaTem) return group.min_select > 0 ? atual : []
    return [optionId]
  }

  if (jaTem) return atual.filter((id) => id !== optionId)
  if (atual.length >= group.max_select) return atual
  return [...atual, optionId]
}

/**
 * Se a opção deve aparecer bloqueada. Só faz sentido em escolha MÚLTIPLA que
 * bateu o teto: aí as não-marcadas travam. Em escolha única, clicar sempre
 * troca, então nada bloqueia — era exatamente aqui que o Arroz travava.
 */
export function opcaoBloqueada(
  group: OptionGroup,
  marcada: boolean,
  qtdMarcadas: number,
): boolean {
  return group.max_select > 1 && !marcada && qtdMarcadas >= group.max_select
}

/** Primeira pendência do produto inteiro, pra destacar no botão de adicionar. */
export function firstError(
  groups: OptionGroup[],
  selection: Record<string, string[]>,
): string | null {
  for (const group of groups) {
    const error = validateGroup(group, selection[group.id] ?? [])
    if (error) return error
  }
  return null
}
