import test from 'node:test'
import assert from 'node:assert/strict'
import { ingredientesDe, pedacosDoEspeto, temEspeto } from './sabor.ts'

// Os cinco sabores exatamente como estão no cardápio do Bom D+.
test('lê os sabores do cardápio', () => {
  assert.deepEqual(ingredientesDe('Carne'), ['carne'])
  assert.deepEqual(ingredientesDe('Frango'), ['frango'])
  assert.deepEqual(ingredientesDe('Carne com frango'), ['carne', 'frango'])
  assert.deepEqual(ingredientesDe('Carne com linguiça'), ['carne', 'linguica'])
  assert.deepEqual(
    ingredientesDe('Mistão — carne, linguiça e frango'),
    ['carne', 'linguica', 'frango'],
  )
})

test('a ordem é a do nome, não a da lista interna', () => {
  // "linguiça com carne" e "carne com linguiça" desenham espetos diferentes.
  assert.deepEqual(ingredientesDe('Linguiça com carne'), ['linguica', 'carne'])
})

test('linguiça sem cedilha também conta', () => {
  // Ninguém digita cedilha no painel com pressa.
  assert.deepEqual(ingredientesDe('Carne com linguica'), ['carne', 'linguica'])
})

test('não confunde palavra que só contém o ingrediente', () => {
  // "encarnado" contém "carn"; sem limite de palavra, viraria espeto de carne.
  assert.deepEqual(ingredientesDe('Molho encarnado'), [])
  assert.deepEqual(ingredientesDe('Frangipane'), [])
})

test('o que não é espeto não ganha desenho', () => {
  assert.equal(temEspeto('Acerola'), false)
  assert.equal(temEspeto('Lata 350ml'), false)
  assert.equal(temEspeto('Baião de dois'), false)
  assert.equal(temEspeto(''), false)
})

test('o plural do cardápio também é lido', () => {
  assert.deepEqual(ingredientesDe('Espeto de carnes'), ['carne'])
})

test('o espeto tem sempre três pedaços', () => {
  // Um pedaço só pareceria porção menor, e o preço é por espeto.
  assert.equal(pedacosDoEspeto('Carne').length, 3)
  assert.equal(pedacosDoEspeto('Carne com frango').length, 3)
  assert.equal(pedacosDoEspeto('Mistão — carne, linguiça e frango').length, 3)
})

test('um ingrediente enche o espeto', () => {
  assert.deepEqual(pedacosDoEspeto('Carne'), ['carne', 'carne', 'carne'])
})

test('dois ingredientes se alternam', () => {
  assert.deepEqual(pedacosDoEspeto('Carne com frango'), [
    'carne',
    'frango',
    'carne',
  ])
})

test('três ingredientes aparecem um de cada', () => {
  assert.deepEqual(pedacosDoEspeto('Mistão — carne, linguiça e frango'), [
    'carne',
    'linguica',
    'frango',
  ])
})

test('sem ingrediente não há pedaço', () => {
  assert.deepEqual(pedacosDoEspeto('Cupuaçu'), [])
})
