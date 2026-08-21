import test from 'node:test'
import assert from 'node:assert/strict'
import { proximoStatus, haQuantoTempo, pedidosNovos, ATIVOS } from './fluxo.ts'

test('fluxo enxuto: recebido pula direto pra saiu pra entrega', () => {
  // "Na brasa" (em_preparo) saiu do caminho — o dono não clica 3x por pedido.
  assert.equal(proximoStatus('recebido'), 'saiu_entrega')
  assert.equal(proximoStatus('saiu_entrega'), 'entregue')
})

test('um pedido legado em em_preparo ainda sabe avançar', () => {
  // O estado não é mais gerado, mas não pode travar quem já estivesse nele.
  assert.equal(proximoStatus('em_preparo'), 'saiu_entrega')
})

test('pedido finalizado não tem próximo passo', () => {
  assert.equal(proximoStatus('entregue'), null)
  assert.equal(proximoStatus('cancelado'), null, 'cancelado não volta pro fluxo')
})

test('ativos são os que a cozinha ainda precisa tocar', () => {
  assert.deepEqual(ATIVOS, ['recebido', 'em_preparo', 'saiu_entrega'])
  assert.ok(!ATIVOS.includes('entregue'))
  assert.ok(!ATIVOS.includes('cancelado'))
})

test('pedido que o painel já conhecia não é novidade', () => {
  const conhecidos = new Set(['a', 'b'])
  assert.deepEqual(pedidosNovos(conhecidos, [{ id: 'a' }, { id: 'b' }]), [])
})

test('pedido inédito é novidade', () => {
  const conhecidos = new Set(['a'])
  assert.deepEqual(pedidosNovos(conhecidos, [{ id: 'a' }, { id: 'c' }]), [{ id: 'c' }])
})

test('mudar o status de um pedido conhecido não toca o sino', () => {
  const conhecidos = new Set(['a'])
  // Mesmo id, outro status: é o próprio dono mexendo, não pedido chegando.
  const atuais = [{ id: 'a', status: 'em_preparo' }]
  assert.deepEqual(pedidosNovos(conhecidos, atuais), [])
})

test('painel vazio recebendo a primeira carga vê tudo como novo', () => {
  // Quem decide não tocar na carga inicial é o Painel, não esta função.
  assert.equal(pedidosNovos(new Set(), [{ id: 'a' }, { id: 'b' }]).length, 2)
})

// O relógio entra por parâmetro: teste de tempo que depende de Date.now() falha
// sozinho de madrugada.
const AGORA = new Date('2026-07-16T15:00:00Z').getTime()
const atras = (min: number) => new Date(AGORA - min * 60000).toISOString()

test('quanto tempo o pedido está esperando', () => {
  assert.equal(haQuantoTempo(atras(0), AGORA), 'agora')
  assert.equal(haQuantoTempo(atras(1), AGORA), 'há 1 min')
  assert.equal(haQuantoTempo(atras(45), AGORA), 'há 45 min')
  assert.equal(haQuantoTempo(atras(60), AGORA), 'há 1h')
  assert.equal(haQuantoTempo(atras(95), AGORA), 'há 1h 35min')
  assert.equal(haQuantoTempo(atras(60 * 26), AGORA), 'há 1d')
})
