import QRCode from 'qrcode'

/**
 * SVG do QR Code, gerado no servidor: assim a biblioteca não entra no bundle
 * que o cliente baixa. O payload do pedido não muda depois de criado, então
 * gerar uma vez por render é suficiente.
 */
export function qrSvg(conteudo: string): Promise<string> {
  return QRCode.toString(conteudo, {
    type: 'svg',
    errorCorrectionLevel: 'M', // suficiente para tela; 'H' engorda o desenho à toa
    margin: 1,
    color: {
      dark: '#241824', // a tinta do contorno do logo
      light: '#FFFFFF', // leitor de QR quer fundo branco de verdade
    },
  })
}
