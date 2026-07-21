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
