import test from 'node:test'
import assert from 'node:assert/strict'
import { contraste, passaAA } from './contraste.ts'

// Os mesmos valores do globals.css. Se a paleta mudar lá e não aqui, o teste
// para de descrever o app — então mudar cor obriga a passar por este arquivo.
const CARVAO = '#17120f'
const FUMACA = '#221a16'
const SAL = '#f4efe7'
const SAL_FRACO = '#a2938a'
const AMARELO = '#f2b705'
const VERMELHO = '#c8321f'

test('a fórmula bate com os valores de referência do WCAG', () => {
  assert.equal(Math.round(contraste('#000000', '#ffffff')), 21)
  assert.equal(contraste('#ffffff', '#ffffff'), 1)
})

test('texto principal e secundário passam em AA', () => {
  assert.ok(passaAA(SAL, CARVAO), 'sal sobre carvão')
  assert.ok(passaAA(SAL_FRACO, CARVAO), 'sal-fraco sobre carvão')
  assert.ok(passaAA(SAL_FRACO, FUMACA), 'sal-fraco sobre os cartões')
})

test('o amarelo da marca serve para texto de qualquer tamanho', () => {
  // 10.2:1 — é o que permite usá-lo em preço e etiqueta pequena.
  assert.ok(contraste(AMARELO, CARVAO) > 10)
  assert.ok(passaAA(AMARELO, CARVAO))
  assert.ok(passaAA(AMARELO, FUMACA))
})

test('o vermelho da marca NÃO serve para texto pequeno', () => {
  // 3.5:1 — passa como componente de UI e texto grande, reprova em texto
  // corrido. Por isso ele é cor de fundo de botão, nunca de rótulo.
  assert.equal(passaAA(VERMELHO, CARVAO), false, 'texto normal: reprova')
  assert.ok(passaAA(VERMELHO, CARVAO, true), 'texto grande e UI: passa')
})

test('o texto de dentro dos botões passa', () => {
  assert.ok(passaAA(CARVAO, AMARELO), 'carvão sobre o botão amarelo')
  assert.ok(passaAA(SAL, VERMELHO), 'sal sobre o botão vermelho')
})

test('o par errado dentro do botão seria ilegível', () => {
  // Sal sobre amarelo dá 1.6:1 — registrado para ninguém tentar "clarear" o
  // texto do botão principal achando que melhora.
  assert.ok(contraste(SAL, AMARELO) < 2)
})

test('o anel de foco é visível sobre os dois fundos', () => {
  assert.ok(passaAA(AMARELO, CARVAO, true))
  assert.ok(passaAA(AMARELO, FUMACA, true))
})
