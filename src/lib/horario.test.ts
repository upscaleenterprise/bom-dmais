import test from 'node:test'
import assert from 'node:assert/strict'
import {
  dentroDaJanela,
  emMinutos,
  estadoDaLoja,
  estadoParaODono,
  formatarHora,
  horaNaLoja,
  recadoDeFechado,
} from './horario.ts'

test('lê a hora do Postgres e a abreviada', () => {
  assert.equal(emMinutos('19:00:00'), 19 * 60)
  assert.equal(emMinutos('19:30'), 19 * 60 + 30)
  assert.equal(emMinutos('00:00:00'), 0)
})

test('hora inválida não vira número torto', () => {
  assert.equal(emMinutos('25:00'), null)
  assert.equal(emMinutos('19:70'), null)
  assert.equal(emMinutos('abacaxi'), null)
})

test('formata como se fala', () => {
  assert.equal(formatarHora('19:00:00'), '19h')
  assert.equal(formatarHora('19:30:00'), '19h30')
  assert.equal(formatarHora('23:05:00'), '23h05')
})

test('janela normal do Bom D+ (19h às 23h)', () => {
  assert.equal(dentroDaJanela('19:00', '19:00', '23:00'), true, 'abre pontual')
  assert.equal(dentroDaJanela('21:30', '19:00', '23:00'), true)
  assert.equal(dentroDaJanela('22:59', '19:00', '23:00'), true)
  assert.equal(dentroDaJanela('23:00', '19:00', '23:00'), false, 'fecha pontual')
  assert.equal(dentroDaJanela('15:00', '19:00', '23:00'), false)
  assert.equal(dentroDaJanela('03:00', '19:00', '23:00'), false)
})

test('janela que cruza a meia-noite (19h às 2h)', () => {
  // 19h às 2h é horário normal de churrasquinho; comparar só com >= e < daria
  // sempre fechado.
  assert.equal(dentroDaJanela('23:59', '19:00', '02:00'), true)
  assert.equal(dentroDaJanela('00:30', '19:00', '02:00'), true)
  assert.equal(dentroDaJanela('01:59', '19:00', '02:00'), true)
  assert.equal(dentroDaJanela('02:00', '19:00', '02:00'), false)
  assert.equal(dentroDaJanela('15:00', '19:00', '02:00'), false)
})

test('janela de duração zero é fechado, não aberto pra sempre', () => {
  assert.equal(dentroDaJanela('19:00', '19:00', '19:00'), false)
})

// 20h em São Luís é 23h em UTC — testar com Date em UTC pega inversão de fuso.
const asUTC = (iso: string) => new Date(iso)

test('a hora que vale é a da loja, não a de quem acessa', () => {
  assert.equal(horaNaLoja('America/Fortaleza', asUTC('2026-07-16T23:00:00Z')), '20:00')
  assert.equal(horaNaLoja('America/Fortaleza', asUTC('2026-07-16T18:00:00Z')), '15:00')
})

const base = {
  isOpen: true,
  opensAt: '19:00:00',
  closesAt: '23:00:00',
  timezone: 'America/Fortaleza',
}

test('aberta dentro do horário', () => {
  // 23h UTC = 20h em São Luís
  assert.deepEqual(estadoDaLoja({ ...base, agora: asUTC('2026-07-16T23:00:00Z') }), {
    aberta: true,
  })
})

test('fora do horário fecha sozinha, sem o dono lembrar', () => {
  // 18h UTC = 15h em São Luís
  assert.deepEqual(estadoDaLoja({ ...base, agora: asUTC('2026-07-16T18:00:00Z') }), {
    aberta: false,
    motivo: 'fora_do_horario',
  })
})

test('o interruptor do dono fecha mesmo dentro do horário', () => {
  // "Acabou a carne às 21h" — precisa poder fechar antes da hora.
  const e = estadoDaLoja({ ...base, isOpen: false, agora: asUTC('2026-07-16T23:00:00Z') })
  assert.deepEqual(e, { aberta: false, motivo: 'fechada_pelo_dono' })
})

test('o interruptor ligado não abre fora do horário', () => {
  const e = estadoDaLoja({ ...base, agora: asUTC('2026-07-16T12:00:00Z') })
  assert.equal(e.aberta, false)
})

test('o painel do dono distingue "fora do horário" de "eu fechei"', () => {
  // Os dois recusam pedido, mas exigem reação diferente: num caso é só esperar,
  // no outro o dono precisa religar a chave.
  const dentro = estadoParaODono({ ...base, agora: asUTC('2026-07-16T23:00:00Z') })
  assert.equal(dentro.rotulo, 'Recebendo')
  assert.equal(dentro.recebendo, true)

  const fora = estadoParaODono({ ...base, agora: asUTC('2026-07-16T12:00:00Z') })
  assert.equal(fora.rotulo, 'Fora do horário')
  assert.equal(fora.recebendo, false)
  assert.match(fora.explicacao, /sozinha às 19h/)

  const fechada = estadoParaODono({
    ...base,
    isOpen: false,
    agora: asUTC('2026-07-16T23:00:00Z'),
  })
  assert.equal(fechada.rotulo, 'Fechada')
  assert.equal(fechada.recebendo, false)
  assert.match(fechada.explicacao, /Você fechou/)
})

test('o painel nunca diz "Recebendo" quando o pedido seria recusado', () => {
  // A regressão que este teste existe para pegar: o botão mostrava "Aberta"
  // às 9h da manhã porque só olhava a chave manual, e o dono achava que
  // estava vendendo.
  for (const horaUTC of ['12:00', '18:00', '02:00', '22:00']) {
    const e = estadoParaODono({ ...base, agora: asUTC(`2026-07-16T${horaUTC}:00Z`) })
    const aceita = estadoDaLoja({ ...base, agora: asUTC(`2026-07-16T${horaUTC}:00Z`) }).aberta
    assert.equal(e.recebendo, aceita, `às ${horaUTC} UTC`)
  }
})

test('o recado diz quando voltar, não só que está fechado', () => {
  const fora = { aberta: false, motivo: 'fora_do_horario' } as const
  assert.equal(recadoDeFechado(fora, '19:00:00'), 'Abrimos às 19h')

  const dono = { aberta: false, motivo: 'fechada_pelo_dono' } as const
  assert.equal(recadoDeFechado(dono, '19:00:00'), 'Fechado no momento')

  assert.equal(recadoDeFechado({ aberta: true }, '19:00:00'), null)
})
