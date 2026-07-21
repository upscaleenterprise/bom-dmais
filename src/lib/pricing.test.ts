import test from 'node:test'
import assert from 'node:assert/strict'
import { unitPrice, lineTotal, subtotal, sameLine, meetsMinimum } from './pricing.ts'
import { validateGroup, firstError } from './selection.ts'
import { faixaDePreco, formatBRL, parseBRL } from './money.ts'
import type { CartItem, NewCartItem } from './pricing.ts'

const picanha = (over: Partial<CartItem> = {}): CartItem => ({
  lineId: 'line-1',
  productId: 'prod-picanha',
  productName: 'Picanha',
  variantId: 'var-500g',
  variantName: '500g',
  basePriceCents: 7990,
  options: [],
  quantity: 1,
  notes: '',
  ...over,
})

const farofa = { optionId: 'opt-farofa', groupName: 'Acompanhamentos extras', optionName: 'Farofa da casa', priceCents: 1490 }
const paoDeAlho = { optionId: 'opt-pao', groupName: 'Acompanhamentos extras', optionName: 'Pão de alho', priceCents: 1590 }
const aoPonto = { optionId: 'opt-ao-ponto', groupName: 'Ponto da carne', optionName: 'Ao ponto', priceCents: 0 }

test('opções entram no preço da unidade', () => {
  assert.equal(unitPrice(picanha()), 7990)
  assert.equal(unitPrice(picanha({ options: [aoPonto] })), 7990, 'ponto da carne não custa nada')
  assert.equal(unitPrice(picanha({ options: [aoPonto, farofa, paoDeAlho] })), 7990 + 1490 + 1590)
})

test('quantidade multiplica a unidade cheia, não só a base', () => {
  const item = picanha({ options: [farofa], quantity: 3 })
  assert.equal(lineTotal(item), (7990 + 1490) * 3)
})

test('subtotal soma as linhas', () => {
  const items = [
    picanha({ lineId: 'a', options: [farofa], quantity: 2 }),
    picanha({ lineId: 'b', variantId: 'var-1kg', variantName: '1kg', basePriceCents: 14990 }),
  ]
  assert.equal(subtotal(items), (7990 + 1490) * 2 + 14990)
})

test('carrinho vazio custa zero, não NaN', () => {
  assert.equal(subtotal([]), 0)
})

const novo = (over: Partial<NewCartItem> = {}): NewCartItem => ({
  productId: 'prod-picanha',
  productName: 'Picanha',
  variantId: 'var-500g',
  variantName: '500g',
  basePriceCents: 7990,
  options: [],
  notes: '',
  ...over,
})

test('mesma escolha agrupa na mesma linha', () => {
  assert.ok(sameLine(novo({ options: [aoPonto, farofa] }), picanha({ options: [aoPonto, farofa] })))
})

test('ordem das opções não cria linha nova', () => {
  assert.ok(
    sameLine(novo({ options: [farofa, aoPonto] }), picanha({ options: [aoPonto, farofa] })),
    'escolher farofa antes do ponto é o mesmo item',
  )
})

test('ponto diferente é linha separada', () => {
  const malPassada = { ...aoPonto, optionId: 'opt-mal', optionName: 'Mal passada' }
  assert.equal(sameLine(novo({ options: [malPassada] }), picanha({ options: [aoPonto] })), false)
})

test('observação diferente é linha separada', () => {
  assert.equal(sameLine(novo({ notes: 'sem sal' }), picanha({ notes: '' })), false)
})

test('variação diferente é linha separada', () => {
  assert.equal(sameLine(novo({ variantId: 'var-1kg' }), picanha()), false)
})

const pontoDaCarne = {
  id: 'g-ponto',
  name: 'Ponto da carne',
  min_select: 1,
  max_select: 1,
  options: [],
}

const acompanhamentos = {
  id: 'g-acomp',
  name: 'Acompanhamentos extras',
  min_select: 0,
  max_select: 3,
  options: [],
}

test('ponto da carne é obrigatório', () => {
  assert.equal(validateGroup(pontoDaCarne, []), 'Escolha ponto da carne.')
  assert.equal(validateGroup(pontoDaCarne, ['opt-ao-ponto']), null)
})

test('ponto da carne aceita só um', () => {
  assert.match(validateGroup(pontoDaCarne, ['a', 'b']) ?? '', /no máximo 1/)
})

test('acompanhamento é opcional e limitado a 3', () => {
  assert.equal(validateGroup(acompanhamentos, []), null)
  assert.equal(validateGroup(acompanhamentos, ['a', 'b', 'c']), null)
  assert.match(validateGroup(acompanhamentos, ['a', 'b', 'c', 'd']) ?? '', /no máximo 3/)
})

test('produto sem o ponto escolhido não passa', () => {
  const erro = firstError([pontoDaCarne, acompanhamentos], { 'g-acomp': ['a'] })
  assert.equal(erro, 'Escolha ponto da carne.')
})

test('produto completo passa', () => {
  assert.equal(firstError([pontoDaCarne, acompanhamentos], { 'g-ponto': ['x'] }), null)
})

test('pedido mínimo', () => {
  assert.equal(meetsMinimum(3990, 4000), false)
  assert.equal(meetsMinimum(4000, 4000), true, 'bater exato o mínimo vale')
})

test('formata em real', () => {
  assert.equal(formatBRL(7990).replace(/ /g, ' '), 'R$ 79,90')
  assert.equal(formatBRL(0).replace(/ /g, ' '), 'R$ 0,00')
})

// O toLocaleString('pt-BR') separa "R$" do número com espaço não-quebrável
// (U+00A0). Normalizo pelo código do caractere, não pelo caractere literal —
// digitado, ele é indistinguível de um espaço comum e a troca vira no-op.
const semNbsp = (s: string) => s.replace(/\u00a0/g, ' ')

test('preço único não vira "a partir de"', () => {
  // H2OH e Limoneto custam os dois R$ 7 — "a partir de" sugeriria um preço
  // maior escondido dentro do item.
  assert.equal(semNbsp(faixaDePreco([700, 700])), 'R$ 7,00')
  assert.equal(semNbsp(faixaDePreco([300])), 'R$ 3,00')
})

test('preço que varia mostra o menor com "a partir de"', () => {
  // Os sucos vão de R$ 6 (acerola) a R$ 8 (cupuaçu).
  assert.equal(semNbsp(faixaDePreco([600, 600, 700, 800])), 'a partir de R$ 6,00')
})

test('produto sem variação não quebra', () => {
  assert.equal(faixaDePreco([]), '')
})

test('lê o que o usuário digita', () => {
  assert.equal(parseBRL('79,90'), 7990)
  assert.equal(parseBRL('R$ 79,90'), 7990)
  assert.equal(parseBRL('79.90'), 7990)
  assert.equal(parseBRL('100'), 10000)
  assert.equal(parseBRL(''), null)
})
