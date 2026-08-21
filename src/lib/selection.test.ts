import test from 'node:test'
import assert from 'node:assert/strict'
import { alternarSelecao, opcaoBloqueada } from './selection.ts'
import type { OptionGroup } from './types.ts'

const grupo = (over: Partial<OptionGroup>): OptionGroup => ({
  id: 'g',
  name: 'Grupo',
  min_select: 0,
  max_select: 1,
  options: [],
  ...over,
})

// O bug que originou estes testes: no grupo Arroz (escolha única obrigatória),
// marcar "Baião de dois" deixava "Arroz branco" bloqueado, e como era
// obrigatório também não dava pra desmarcar — o cliente ficava preso.
const arroz = grupo({ name: 'Arroz', min_select: 1, max_select: 1 })

test('escolha única obrigatória: clicar na outra opção TROCA', () => {
  assert.deepEqual(alternarSelecao(arroz, ['baiao'], 'branco'), ['branco'])
})

test('escolha única obrigatória: a outra opção nunca fica bloqueada', () => {
  // 'branco' não marcada, já há 1 escolhido (o limite) — antes bloqueava.
  assert.equal(opcaoBloqueada(arroz, false, 1), false)
})

test('escolha única obrigatória: clicar na marcada não desmarca', () => {
  // Desmarcar deixaria o pedido sem arroz, que é inválido.
  assert.deepEqual(alternarSelecao(arroz, ['baiao'], 'baiao'), ['baiao'])
})

test('escolha única OPCIONAL: clicar na marcada desmarca', () => {
  const opcional = grupo({ min_select: 0, max_select: 1 })
  assert.deepEqual(alternarSelecao(opcional, ['x'], 'x'), [])
})

const ate3 = grupo({ name: 'Acompanhamentos', min_select: 0, max_select: 3 })

test('escolha múltipla: acumula até o teto', () => {
  assert.deepEqual(alternarSelecao(ate3, ['a', 'b'], 'c'), ['a', 'b', 'c'])
})

test('escolha múltipla: no teto, a nova opção é bloqueada e não entra', () => {
  assert.equal(opcaoBloqueada(ate3, false, 3), true)
  assert.deepEqual(alternarSelecao(ate3, ['a', 'b', 'c'], 'd'), ['a', 'b', 'c'])
})

test('escolha múltipla: a marcada nunca é bloqueada (pode desmarcar)', () => {
  assert.equal(opcaoBloqueada(ate3, true, 3), false)
  assert.deepEqual(alternarSelecao(ate3, ['a', 'b', 'c'], 'b'), ['a', 'c'])
})
