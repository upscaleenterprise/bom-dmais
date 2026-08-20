import test from 'node:test'
import assert from 'node:assert/strict'
import { contraste, passaAA } from './contraste.ts'

// Os mesmos valores do globals.css — a paleta medida por pixel do manual da
// marca (Churrasquinho bom d+.pdf). Se a paleta mudar lá e não aqui, o teste
// para de descrever o app: mudar cor obriga a passar por este arquivo.
const FUNDO = '#ffffff'
const SUPERFICIE = '#faf3e5'
const TINTA = '#241824'
const TINTA_FRACA = '#585959'
const AMARELO = '#fcc600'
const CORAL = '#f0665f'
const LARANJA = '#e2672b'
const ERRO = '#c23428'

test('a fórmula bate com os valores de referência do WCAG', () => {
  assert.equal(Math.round(contraste('#000000', '#ffffff')), 21)
  assert.equal(contraste('#ffffff', '#ffffff'), 1)
})

test('texto principal e secundário passam em AA nos dois fundos', () => {
  assert.ok(passaAA(TINTA, FUNDO), 'tinta sobre branco')
  assert.ok(passaAA(TINTA, SUPERFICIE), 'tinta sobre creme')
  assert.ok(passaAA(TINTA_FRACA, FUNDO), 'cinza sobre branco')
  assert.ok(passaAA(TINTA_FRACA, SUPERFICIE), 'cinza sobre creme')
})

test('o amarelo da marca é decorativo: NUNCA carrega texto sozinho', () => {
  // 1.6:1 sobre branco. No logotipo o amarelo sempre vem com contorno escuro —
  // no app, sempre com texto tinta por cima, nunca como cor de texto.
  assert.ok(contraste(AMARELO, FUNDO) < 3)
})

test('o CTA da marca: fundo amarelo com texto tinta', () => {
  // A dupla do logotipo (10.7:1) — é o botão primário do app inteiro.
  assert.ok(contraste(TINTA, AMARELO) > 10)
  assert.ok(passaAA(TINTA, AMARELO))
})

test('hover do CTA (laranja) mantém o texto tinta legível', () => {
  assert.ok(passaAA(TINTA, LARANJA), 'tinta sobre laranja no hover')
})

test('coral e laranja passam só como UI e texto grande', () => {
  for (const cor of [CORAL, LARANJA]) {
    assert.ok(passaAA(cor, FUNDO, true), `${cor} como componente de UI`)
    assert.equal(passaAA(cor, FUNDO), false, `${cor} reprova em texto pequeno`)
  }
})

test('branco sobre coral reprova — CTA coral exigiria texto tinta', () => {
  // 3.1:1. Registrado para ninguém fazer botão coral com texto branco.
  assert.equal(passaAA(FUNDO, CORAL), false)
  assert.ok(passaAA(TINTA, CORAL), 'tinta sobre coral passa')
})

test('o vermelho de erro segura texto pequeno nos dois fundos', () => {
  // Coral escurecido até passar: mensagem de erro é onde mais precisa ler.
  assert.ok(passaAA(ERRO, FUNDO))
  assert.ok(passaAA(ERRO, SUPERFICIE))
})

test('o anel de foco é visível nos dois fundos', () => {
  // Foco é laranja porque o amarelo (1.6:1) seria invisível sobre branco.
  assert.ok(passaAA(LARANJA, FUNDO, true))
  assert.ok(passaAA(LARANJA, SUPERFICIE, true))
})
