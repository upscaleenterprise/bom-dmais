/*
  BR Code do Pix — o "copia e cola" e o conteúdo do QR Code.

  Formato EMV® MPM, especificado pelo Banco Central. Cada campo é
  ID (2 dígitos) + tamanho (2 dígitos) + valor, e o último campo é um CRC16 sobre
  tudo o que veio antes. Um dígito errado no CRC faz o app do banco recusar o
  código sem dizer o motivo — por isso isto aqui é função pura e testada.
*/

/** ID + tamanho (2 dígitos, com zero à esquerda) + valor. */
function campo(id: string, valor: string): string {
  return id + String(valor.length).padStart(2, '0') + valor
}

/**
 * CRC16/CCITT-FALSE: polinômio 0x1021, inicial 0xFFFF, sem reflexão e sem XOR
 * final. É o que a especificação do BC exige — as outras variantes de CRC16
 * geram números plausíveis que o banco rejeita.
 */
export function crc16(texto: string): string {
  let crc = 0xffff

  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * O BR Code aceita só ASCII imprimível: acento vira caractere inválido e o
 * leitor do banco embola o resto do payload. "São Luís" precisa virar "Sao Luis".
 */
function ascii(texto: string, limite: number): string {
  // NFD separa "ã" em "a" + til solto; o filtro seguinte descarta o til junto
  // com qualquer outro caractere fora do ASCII imprimível.
  return texto
    .normalize('NFD')
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .slice(0, limite)
}

/** txid aceita só letras e números, até 25. Sem isso o código é recusado. */
function txid(texto: string): string {
  const limpo = texto.replace(/[^A-Za-z0-9]/g, '').slice(0, 25)
  return limpo || '***' // "***" é o valor previsto para "sem identificador"
}

export type DadosPix = {
  chave: string
  /** Nome do recebedor — máximo 25 caracteres no padrão. */
  nome: string
  /** Cidade do recebedor — máximo 15. */
  cidade: string
  /** Em centavos, como todo dinheiro neste projeto. */
  valorCents: number
  /** Identificador do pedido; aparece no extrato de quem recebe. */
  referencia: string
}

export function gerarBRCode({
  chave,
  nome,
  cidade,
  valorCents,
  referencia,
}: DadosPix): string {
  const conta =
    campo('00', 'br.gov.bcb.pix') + campo('01', chave)

  const payload =
    campo('00', '01') + // versão do formato
    campo('01', '12') + // uso único: o valor é deste pedido, não de qualquer um
    campo('26', conta) +
    campo('52', '0000') + // categoria do estabelecimento: não informada
    campo('53', '986') + // moeda: real
    campo('54', (valorCents / 100).toFixed(2)) +
    campo('58', 'BR') +
    campo('59', ascii(nome, 25)) +
    campo('60', ascii(cidade, 15)) +
    campo('62', campo('05', txid(referencia)))

  // O CRC é calculado sobre o payload JÁ com "6304" no fim.
  const comMarcador = payload + '6304'
  return comMarcador + crc16(comMarcador)
}

/**
 * Desmonta um BR Code em {id: valor} — para testes e depuração.
 *
 * Devolve também `consumido`: quantos caracteres o parser leu. Se um tamanho
 * declarado estiver errado, a leitura desalinha e para antes do fim — comparar
 * `consumido` com o tamanho do código é o que denuncia isso. Só o objeto de
 * campos não serviria: JavaScript reordena chave que parece número inteiro.
 */
export function lerBRCode(codigo: string): Record<string, string> & {
  consumido: number
} {
  const campos: Record<string, string> = {}
  let i = 0

  while (i < codigo.length - 4) {
    const id = codigo.slice(i, i + 2)
    const tamanho = Number(codigo.slice(i + 2, i + 4))
    if (!Number.isInteger(tamanho)) break

    const valor = codigo.slice(i + 4, i + 4 + tamanho)
    if (valor.length < tamanho) break // tamanho declarado maior que o conteúdo

    campos[id] = valor
    i += 4 + tamanho
  }

  return { ...campos, consumido: i } as Record<string, string> & {
    consumido: number
  }
}

export function crcValido(codigo: string): boolean {
  const corpo = codigo.slice(0, -4)
  return crc16(corpo) === codigo.slice(-4).toUpperCase()
}
