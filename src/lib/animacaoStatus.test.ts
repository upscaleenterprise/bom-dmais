import test from 'node:test'
import assert from 'node:assert/strict'
import { cenaDoStatus } from './animacaoStatus.ts'
import { SCENES } from '../components/cenasStatus.ts'

test('cada etapa da jornada tem sua cena', () => {
  assert.equal(cenaDoStatus('recebido'), 'recebido')
  assert.equal(cenaDoStatus('em_preparo'), 'brasa')
  assert.equal(cenaDoStatus('saiu_entrega'), 'entrega')
  assert.equal(cenaDoStatus('entregue'), 'entregue')
})

test('cancelado não é etapa: não tem cena', () => {
  assert.equal(cenaDoStatus('cancelado'), null)
})

test('toda cena que o mapa aponta existe de verdade no arquivo de arte', () => {
  // Se alguém renomear uma chave em cenasStatus.ts e esquecer aqui, o cliente
  // veria uma caixa vazia no lugar da animação. Este teste barra isso.
  for (const status of ['recebido', 'em_preparo', 'saiu_entrega', 'entregue'] as const) {
    const cena = cenaDoStatus(status)
    assert.ok(cena && cena in SCENES, `cena "${cena}" existe em SCENES`)
    assert.ok(SCENES[cena].includes('<svg'), `cena "${cena}" tem SVG`)
  }
})
