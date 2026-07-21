'use client'

/*
  O sino de pedido novo, sintetizado no Web Audio.

  Sem arquivo de áudio de propósito: um mp3 é mais um arquivo pra hospedar,
  baixar e falhar justo quando a cozinha depende dele. Um oscilador não pede rede.

  O som é um bater de sino duplo em quinta (880Hz -> 1320Hz), agudo o bastante
  pra passar por cima de exaustor e conversa, e curto pra não irritar em noite
  de movimento.
*/

let contexto: AudioContext | null = null

function pegarContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!contexto) {
    const Ctor = window.AudioContext ?? (window as unknown as {
      webkitAudioContext?: typeof AudioContext
    }).webkitAudioContext
    if (!Ctor) return null
    contexto = new Ctor()
  }
  return contexto
}

/**
 * O navegador só deixa tocar áudio depois de um gesto do usuário. O login é um
 * gesto — mas se o dono recarregar a página com a sessão já ativa, não há gesto
 * nenhum e o contexto nasce suspenso. Devolve se o som está de fato liberado.
 */
export async function liberarSom(): Promise<boolean> {
  const ctx = pegarContexto()
  if (!ctx) return false
  if (ctx.state === 'suspended') await ctx.resume()
  return ctx.state === 'running'
}

function badalada(ctx: AudioContext, hz: number, atraso: number) {
  const osc = ctx.createOscillator()
  const ganho = ctx.createGain()

  osc.type = 'triangle' // menos áspero que a onda quadrada, mais presente que a senoide
  osc.frequency.value = hz

  const t = ctx.currentTime + atraso
  // Ataque rápido e queda exponencial: é o que faz soar como sino batido, e não
  // como um bipe de micro-ondas.
  ganho.gain.setValueAtTime(0.0001, t)
  ganho.gain.exponentialRampToValueAtTime(0.3, t + 0.012)
  ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)

  osc.connect(ganho).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.6)
}

export function tocarSino() {
  const ctx = pegarContexto()
  if (!ctx || ctx.state !== 'running') return

  badalada(ctx, 880, 0)
  badalada(ctx, 1320, 0.14)
}
