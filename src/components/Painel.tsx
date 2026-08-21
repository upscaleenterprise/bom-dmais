'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { OrderStatus } from '@/lib/types'
import { formatBRL } from '@/lib/money'
import { supabase, STORE_SLUG } from '@/lib/supabase'
import {
  ATIVOS,
  ROTULO_ACAO,
  ROTULO_PAGAMENTO,
  ROTULO_STATUS,
  haQuantoTempo,
  pedidosNovos,
  proximosStatus,
} from '@/lib/fluxo'
import { estadoParaODono } from '@/lib/horario'
import { liberarSom, tocarSino } from '@/lib/sino'
import { usePreferencias } from '@/lib/preferencias'
import {
  confirmarPagamento,
  definirLojaAberta,
  listarPedidos,
  mudarStatus,
  type PedidoPainel,
} from '@/lib/painel'
import { Login } from './Login'
import { EditorCardapio } from './EditorCardapio'

type Loja = {
  is_open: boolean
  opens_at: string
  closes_at: string
  timezone: string
}

// Cada estado precisa ser distinguível de relance, de longe, numa cozinha.
// O fundo colorido diferencia; o texto é sempre legível (tinta ou erro —
// amarelo e laranja não seguram texto deste tamanho sobre fundo claro).
const COR_STATUS: Record<OrderStatus, string> = {
  recebido: 'bg-amarelo/40 text-tinta', // o que exige ação agora
  em_preparo: 'bg-laranja/25 text-tinta',
  saiu_entrega: 'bg-tinta/10 text-tinta', // saiu da cozinha: sai do calor
  entregue: 'bg-borda text-tinta-fraca',
  cancelado: 'bg-erro/15 text-erro',
}

function Cartao({
  pedido,
  agora,
  onMudar,
  onConfirmar,
}: {
  pedido: PedidoPainel
  agora: number
  onMudar: (id: string, s: OrderStatus) => void
  onConfirmar: (id: string) => void
}) {
  const destinos = proximosStatus(pedido.status)
  const aguardandoPix =
    pedido.payment_method === 'pix' && pedido.payment_status === 'aguardando'

  return (
    <article className="flex flex-col rounded-xl border border-borda bg-superficie">
      <header className="flex items-center justify-between gap-3 border-b border-borda px-4 py-3">
        <div className="flex items-baseline gap-2.5">
          <h3 className="placa text-xl leading-none text-tinta">{pedido.code}</h3>
          <span className="text-xs text-tinta-fraca">
            {haQuantoTempo(pedido.created_at, agora)}
          </span>
        </div>
        <span className={`etiqueta rounded-full px-2.5 py-1 ${COR_STATUS[pedido.status]}`}>
          {ROTULO_STATUS[pedido.status]}
        </span>
      </header>

      <div className="flex-1 space-y-4 px-4 py-3.5">
        <ul className="space-y-2">
          {pedido.order_items.map((item, i) => (
            <li key={i}>
              <p className="text-sm font-semibold text-tinta">
                {item.quantity}× {item.product_name}{' '}
                <span className="font-normal text-tinta-fraca">{item.variant_name}</span>
              </p>
              {/* Toda escolha muda o preparo — nenhuma vale menos que a outra
                  na hora de montar a marmita. */}
              {item.order_item_options.map((o, j) => (
                <p key={j} className="text-xs text-tinta-fraca">
                  <span className="text-tinta">{o.option_name}</span>
                </p>
              ))}
              {item.notes && (
                <p className="mt-0.5 text-xs italic text-erro">“{item.notes}”</p>
              )}
            </li>
          ))}
        </ul>

        <div className="border-t border-borda/60 pt-3 text-xs leading-relaxed text-tinta-fraca">
          <p className="font-semibold text-tinta">{pedido.customer_name}</p>
          <p>
            {pedido.address_street}, {pedido.address_number}
            {pedido.address_complement && ` — ${pedido.address_complement}`}
          </p>
          <p>{pedido.address_district}</p>
          {pedido.address_reference && <p>{pedido.address_reference}</p>}
          <a
            href={`https://wa.me/55${pedido.customer_phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-tinta underline underline-offset-2"
          >
            {pedido.customer_phone}
          </a>
          {pedido.notes && (
            <p className="mt-2 border-l-2 border-laranja pl-2 italic text-tinta">
              {pedido.notes}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-borda/60 pt-3">
          <div className="text-xs">
            <span className="text-tinta-fraca">
              {ROTULO_PAGAMENTO[pedido.payment_method]}
            </span>
            {aguardandoPix && (
              <span className="ml-1.5 text-erro">· aguardando</span>
            )}
            {pedido.payment_status === 'confirmado' && (
              <span className="ml-1.5 text-tinta-fraca">· pago</span>
            )}
            {pedido.change_for_cents !== null && (
              <span className="ml-1.5 text-tinta-fraca">
                · troco p/ {formatBRL(pedido.change_for_cents)}
              </span>
            )}
          </div>
          <span className="placa text-lg leading-none text-tinta">
            {formatBRL(pedido.total_cents)}
          </span>
        </div>
      </div>

      {(aguardandoPix || destinos.length > 0) && (
        <footer className="flex flex-wrap gap-2 border-t border-borda px-4 py-3">
          {aguardandoPix && (
            <button
              type="button"
              onClick={() => onConfirmar(pedido.id)}
              className="flex-1 rounded-lg border border-laranja px-3 py-2.5 text-sm font-semibold text-tinta transition-colors hover:bg-laranja"
            >
              Confirmar Pix
            </button>
          )}
          {/* Um botão por destino. O primeiro (o passo natural) fica preenchido;
              o segundo, quando existe (o atalho "saiu pra entrega"), é discreto. */}
          {destinos.map((destino, i) => (
            <button
              key={destino}
              type="button"
              onClick={() => onMudar(pedido.id, destino)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                i === 0
                  ? 'bg-amarelo text-tinta hover:bg-laranja'
                  : 'border border-borda text-tinta-fraca hover:border-laranja hover:text-tinta'
              }`}
            >
              {ROTULO_ACAO[destino]}
            </button>
          ))}
          {pedido.status === 'recebido' && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Cancelar o pedido ${pedido.code}?`)) {
                  onMudar(pedido.id, 'cancelado')
                }
              }}
              className="rounded-lg border border-borda px-3 py-2.5 text-sm text-tinta-fraca transition-colors hover:border-erro hover:text-erro"
            >
              Cancelar
            </button>
          )}
        </footer>
      )}
    </article>
  )
}

export function Painel() {
  const [session, setSession] = useState<Session | null>(null)
  const [carregandoSessao, setCarregandoSessao] = useState(true)
  const [pedidos, setPedidos] = useState<PedidoPainel[]>([])
  const [aba, setAba] = useState<'ativos' | 'finalizados' | 'cardapio'>('ativos')
  const [loja, setLoja] = useState<Loja | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const mudo = usePreferencias((s) => s.mudo)
  const setMudo = usePreferencias((s) => s.setMudo)
  const [somPronto, setSomPronto] = useState(true)

  // Refs, não state: mudam sem precisar redesenhar nem refazer a inscrição do
  // Realtime, que é o que aconteceria se entrassem nas dependências.
  const conhecidos = useRef<Set<string>>(new Set())
  const primeiraCarga = useRef(true)
  const mudoRef = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregandoSessao(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    mudoRef.current = mudo
  }, [mudo])

  const recarregar = useCallback(async () => {
    try {
      const lista = await listarPedidos()
      const novos = pedidosNovos(conhecidos.current, lista)

      // A carga inicial traz o histórico inteiro; tocar aí seria tocar por
      // pedido de ontem. Só badala pedido que chegou com o painel aberto.
      const chegou = novos.some((p) => p.status === 'recebido')
      if (!primeiraCarga.current && chegou && !mudoRef.current) tocarSino()

      conhecidos.current = new Set(lista.map((p) => p.id))
      primeiraCarga.current = false

      setPedidos(lista)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar os pedidos.')
    }
  }, [])

  useEffect(() => {
    if (!session) return

    supabase
      .from('stores')
      .select('is_open, opens_at, closes_at, timezone')
      .eq('slug', STORE_SLUG)
      .single()
      .then(({ data }) => setLoja(data as Loja | null))

    // Busca IMEDIATA, sem esperar nada: é o que garante que os pedidos
    // aparecem. (Antes a primeira carga só rodava quando o Realtime conectava —
    // se o WebSocket falhava, o painel ficava eternamente vazio mesmo com
    // pedidos no banco.)
    //
    // recarregar() é async: o setState só ocorre depois do await, então não há
    // render em cascata. O lint não enxerga isso através do useCallback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar()

    // Realtime dá a atualização instantânea, quando conecta.
    const canal = supabase
      .channel('painel-pedidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => recarregar(),
      )
      .subscribe()

    // Polling de rede como rede de segurança: numa cozinha o painel não pode
    // depender só do WebSocket. Se o Realtime cair ou nem conectar, o pedido
    // novo ainda aparece em até 15s.
    const t = setInterval(recarregar, 15_000)

    return () => {
      supabase.removeChannel(canal)
      clearInterval(t)
    }
  }, [session, recarregar])

  // O "há X min" precisa envelhecer sozinho enquanto o painel fica aberto.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Entrar no painel é um gesto, e gesto libera áudio. Recarregar a página com
  // a sessão já ativa não é — aí o contexto nasce suspenso e o sino ficaria mudo
  // sem avisar ninguém. Detectar isso é o que evita a cozinha perder pedido
  // achando que o som está ligado.
  useEffect(() => {
    if (!session) return
    liberarSom().then((ok) => setSomPronto(ok))
  }, [session])

  async function agir(fn: () => Promise<void>) {
    try {
      await fn()
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.')
    }
  }

  if (carregandoSessao) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-tinta-fraca">Carregando...</p>
      </main>
    )
  }

  if (!session) return <Login />

  // Recalculado a cada tick de `agora`, então às 23h o rótulo vira sozinho sem
  // ninguém recarregar a página.
  const estadoLoja = loja
    ? estadoParaODono({
        isOpen: loja.is_open,
        opensAt: loja.opens_at,
        closesAt: loja.closes_at,
        timezone: loja.timezone,
        agora: new Date(agora),
      })
    : null

  const ativos = pedidos.filter((p) => ATIVOS.includes(p.status))
  const finalizados = pedidos.filter((p) => !ATIVOS.includes(p.status))
  const lista = aba === 'ativos' ? ativos : finalizados

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-borda bg-fundo/95 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="placa text-2xl leading-none text-tinta">Painel</h1>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const novo = !mudo
                  setMudo(novo)
                  // Toca ao ligar: interruptor de som que não faz som ao ser
                  // ligado deixa a dúvida de se funcionou.
                  if (!novo) {
                    liberarSom().then((ok) => {
                      setSomPronto(ok)
                      if (ok) tocarSino()
                    })
                  }
                }}
                aria-pressed={!mudo}
                title={mudo ? 'Som desligado' : 'Som ligado'}
                className="grid h-8 w-8 place-items-center rounded-full border border-borda text-sm transition-colors hover:border-tinta-fraca"
              >
                <span aria-hidden>{mudo ? '🔇' : '🔔'}</span>
                <span className="sr-only">
                  {mudo ? 'Ligar o som de pedido novo' : 'Desligar o som de pedido novo'}
                </span>
              </button>

              {estadoLoja && loja && (
                <button
                  type="button"
                  onClick={() =>
                    agir(async () => {
                      await definirLojaAberta(!loja.is_open)
                      setLoja({ ...loja, is_open: !loja.is_open })
                    })
                  }
                  aria-pressed={loja.is_open}
                  title={estadoLoja.explicacao}
                  className="flex items-center gap-2 rounded-full border border-borda px-3 py-1.5 text-left transition-colors hover:border-tinta-fraca"
                >
                  <span
                    aria-hidden
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      estadoLoja.recebendo
                        ? 'bg-laranja shadow-[0_0_8px_var(--color-laranja)]'
                        : 'bg-tinta-fraca'
                    }`}
                  />
                  <span className="leading-tight">
                    <span className="etiqueta block text-tinta">{estadoLoja.rotulo}</span>
                    {/* O porquê importa: "fora do horário" o dono só espera;
                        "fechada" ele precisa religar a chave. */}
                    <span className="block text-[0.6rem] text-tinta-fraca">
                      {estadoLoja.explicacao}
                    </span>
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="etiqueta text-tinta-fraca underline-offset-4 hover:text-tinta hover:underline"
              >
                Sair
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-1">
            {(['ativos', 'finalizados', 'cardapio'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setAba(id)}
                aria-pressed={aba === id}
                className={`etiqueta rounded-full px-3.5 py-2 transition-colors ${
                  aba === id
                    ? 'bg-superficie text-tinta'
                    : 'text-tinta-fraca hover:text-tinta'
                }`}
              >
                {id === 'ativos'
                  ? `Ativos · ${ativos.length}`
                  : id === 'finalizados'
                    ? 'Finalizados'
                    : 'Cardápio'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        {!somPronto && !mudo && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-laranja/40 bg-laranja/8 px-4 py-3">
            <p className="text-sm text-tinta">
              O navegador bloqueou o som. Sem ele, pedido novo entra calado.
            </p>
            <button
              type="button"
              onClick={() =>
                liberarSom().then((ok) => {
                  setSomPronto(ok)
                  if (ok) tocarSino()
                })
              }
              className="etiqueta shrink-0 rounded bg-amarelo px-3 py-2 text-tinta transition-colors hover:bg-laranja"
            >
              Ativar som
            </button>
          </div>
        )}

        {erro && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-erro/40 bg-erro/10 px-4 py-3 text-sm text-tinta"
          >
            {erro}
          </p>
        )}

        {aba === 'cardapio' ? (
          <EditorCardapio />
        ) : lista.length === 0 ? (
          <div className="py-24 text-center">
            <p className="placa text-2xl text-tinta">
              {aba === 'ativos' ? 'Nenhum pedido na fila' : 'Nada finalizado ainda'}
            </p>
            <p className="mt-2 text-sm text-tinta-fraca">
              {aba === 'ativos'
                ? 'Pedido novo aparece aqui sozinho, sem atualizar a página.'
                : 'Pedidos entregues e cancelados ficam neste histórico.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((pedido) => (
              <Cartao
                key={pedido.id}
                pedido={pedido}
                agora={agora}
                onMudar={(id, s) => agir(() => mudarStatus(id, s))}
                onConfirmar={(id) => agir(() => confirmarPagamento(id))}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}
