import test from 'node:test'
import assert from 'node:assert/strict'
import { crc16, crcValido, gerarBRCode, lerBRCode } from './pix.ts'

test('CRC16/CCITT-FALSE bate com o vetor de verificação padrão', () => {
  // "123456789" -> 0x29B1 é o check value oficial dessa variante de CRC16.
  // Se isto passa, o algoritmo é o que o Banco Central exige — e não uma das
  // outras variantes de CRC16, que dão números plausíveis e código recusado.
  assert.equal(crc16('123456789'), '29B1')
})

const dados = {
  chave: 'pix@bomdmais.com.br',
  nome: 'Churrasquinho Bom D+',
  cidade: 'Sao Luis',
  valorCents: 19760,
  referencia: 'B647',
}

test('o BR Code gerado tem CRC válido', () => {
  assert.ok(crcValido(gerarBRCode(dados)))
})

test('mexer em um caractere invalida o CRC', () => {
  const codigo = gerarBRCode(dados)
  // Troca um dígito do valor: é exatamente o ataque que o CRC existe pra pegar.
  const adulterado = codigo.replace('197.60', '017.60')
  assert.equal(crcValido(adulterado), false)
})

test('os campos obrigatórios estão no lugar', () => {
  const campos = lerBRCode(gerarBRCode(dados))
  assert.equal(campos['00'], '01', 'versão do formato')
  assert.equal(campos['53'], '986', 'moeda: real')
  assert.equal(campos['54'], '197.60', 'valor com ponto e 2 casas')
  assert.equal(campos['58'], 'BR')
  assert.equal(campos['59'], 'Churrasquinho Bom D+')
  assert.equal(campos['60'], 'Sao Luis')
})

test('a chave Pix vai dentro do campo do arranjo', () => {
  const campos = lerBRCode(gerarBRCode(dados))
  const conta = lerBRCode(campos['26'])
  assert.equal(conta['00'], 'br.gov.bcb.pix')
  assert.equal(conta['01'], 'pix@bomdmais.com.br')
})

test('o código do pedido vira o identificador da transação', () => {
  const campos = lerBRCode(gerarBRCode(dados))
  assert.equal(lerBRCode(campos['62'])['05'], 'B647')
})

test('acento é removido — o padrão só aceita ASCII', () => {
  const campos = lerBRCode(
    gerarBRCode({ ...dados, nome: 'Churrascaria São João', cidade: 'São Luís' }),
  )
  assert.equal(campos['59'], 'Churrascaria Sao Joao')
  assert.equal(campos['60'], 'Sao Luis')
})

test('nome e cidade são cortados nos limites do padrão', () => {
  const campos = lerBRCode(
    gerarBRCode({
      ...dados,
      nome: 'Churrascaria Do Seu Ze Com Nome Enorme Demais',
      cidade: 'Cidade Com Nome Muito Grande',
    }),
  )
  assert.equal(campos['59'].length, 25, 'nome: máximo 25')
  assert.equal(campos['60'].length, 15, 'cidade: máximo 15')
})

test('txid sem letra nem número vira "***"', () => {
  const campos = lerBRCode(gerarBRCode({ ...dados, referencia: '---' }))
  assert.equal(lerBRCode(campos['62'])['05'], '***')
})

test('valores redondos e quebrados saem com 2 casas', () => {
  assert.equal(lerBRCode(gerarBRCode({ ...dados, valorCents: 5000 }))['54'], '50.00')
  assert.equal(lerBRCode(gerarBRCode({ ...dados, valorCents: 5 }))['54'], '0.05')
  assert.equal(lerBRCode(gerarBRCode({ ...dados, valorCents: 123456 }))['54'], '1234.56')
})

test('o tamanho declarado de cada campo bate com o conteúdo', () => {
  // Se um length estiver errado, o leitor do banco desalinha e lê lixo daí em
  // diante. A leitura só chega exatamente no campo do CRC se todos os tamanhos
  // estiverem corretos — sobrar ou faltar caractere denuncia o erro.
  // O campo do CRC ("6304XXXX") também é TLV, então a leitura correta termina
  // no fim da string, sem sobrar nem faltar caractere.
  const codigo = gerarBRCode(dados)
  const { consumido } = lerBRCode(codigo)
  assert.equal(consumido, codigo.length, 'a leitura consome o código inteiro')
})

test('tamanho declarado maior que o conteúdo não é lido como válido', () => {
  const codigo = gerarBRCode(dados)
  // Adultera o tamanho declarado do campo 59: diz que o nome tem 99 caracteres.
  // O padrão é montado a partir de `dados`, não escrito à mão — trocar o nome
  // da loja não pode quebrar um teste que não é sobre o nome.
  const campo59 = `59${String(dados.nome.length).padStart(2, '0')}${dados.nome}`
  const quebrado = codigo.replace(campo59, `5999${dados.nome}`)
  const { consumido } = lerBRCode(quebrado)
  assert.notEqual(consumido, quebrado.length)
})

test('o BR Code começa com o cabeçalho que os apps de banco esperam', () => {
  // "000201" (versão) + "010212" (uso único) — é por esses bytes que o leitor
  // reconhece um Pix antes de tentar interpretar o resto.
  assert.ok(gerarBRCode(dados).startsWith('000201' + '010212'))
})
