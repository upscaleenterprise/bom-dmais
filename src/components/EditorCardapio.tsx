'use client'

import { useEffect, useState } from 'react'
import { parseBRL } from '@/lib/money'
import {
  alternarProduto,
  carregarParaEditar,
  salvarPrecoVariacao,
  type CatEdit,
  type ProdEdit,
  type VarEdit,
} from '@/lib/cardapioAdmin'

/** Interruptor acessível — estado no rótulo, não só na cor. */
function Chave({
  ligado,
  onToggle,
  rotuloLigado = 'No cardápio',
  rotuloDesligado = 'Fora',
}: {
  ligado: boolean
  onToggle: () => void
  rotuloLigado?: string
  rotuloDesligado?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={ligado}
      className="flex items-center gap-2"
    >
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          ligado ? 'bg-amarelo' : 'bg-borda'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-carvao transition-all ${
            ligado ? 'left-4' : 'left-0.5'
          }`}
        />
      </span>
      <span className={`etiqueta ${ligado ? 'text-sal' : 'text-sal-fraco'}`}>
        {ligado ? rotuloLigado : rotuloDesligado}
      </span>
    </button>
  )
}

/** Preço editável in loco: só salva quando muda de verdade, e avisa o resultado. */
function PrecoVariacao({
  variante,
  onErro,
}: {
  variante: VarEdit
  onErro: (m: string) => void
}) {
  const emReais = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

  // O último preço confirmado pelo banco vive aqui, não na prop: mutar a prop
  // é anti-padrão e o React não revê os filhos por isso.
  const [salvoCents, setSalvoCents] = useState(variante.price_cents)
  const [texto, setTexto] = useState(() => emReais(variante.price_cents))
  const [salvo, setSalvo] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function commit() {
    const cents = parseBRL(texto)
    if (cents === null) {
      // Volta pro último valor bom em vez de gravar lixo.
      setTexto(emReais(salvoCents))
      onErro('Preço inválido — voltei pro valor anterior.')
      return
    }
    if (cents === salvoCents) return // nada mudou

    setSalvando(true)
    try {
      await salvarPrecoVariacao(variante.id, cents)
      setSalvoCents(cents)
      setTexto(emReais(cents))
      setSalvo(true)
      setTimeout(() => setSalvo(false), 1500)
    } catch (e) {
      onErro(e instanceof Error ? e.message : 'Não foi possível salvar o preço.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-sal-fraco">{variante.name}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-sal-fraco">
          R$
        </span>
        <input
          inputMode="decimal"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          disabled={salvando}
          aria-label={`Preço de ${variante.name}`}
          className="w-24 rounded-lg border border-borda bg-carvao py-1.5 pl-8 pr-2 text-right text-sm tabular-nums text-sal disabled:opacity-50"
        />
      </div>
      {salvo && <span className="etiqueta text-amarelo">Salvo</span>}
    </div>
  )
}

function ProdutoEditor({
  produto,
  onErro,
}: {
  produto: ProdEdit
  onErro: (m: string) => void
}) {
  const [disponivel, setDisponivel] = useState(produto.is_available)
  const [pendente, setPendente] = useState(false)

  async function toggle() {
    const novo = !disponivel
    setDisponivel(novo) // otimista: a cozinha não espera round-trip
    setPendente(true)
    try {
      await alternarProduto(produto.id, novo)
    } catch (e) {
      setDisponivel(!novo) // desfaz se o banco recusou
      onErro(e instanceof Error ? e.message : 'Não foi possível mudar a disponibilidade.')
    } finally {
      setPendente(false)
    }
  }

  return (
    <article
      className={`rounded-xl border border-borda bg-fumaca p-4 transition-opacity ${
        disponivel ? '' : 'opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="placa text-lg leading-tight text-sal">{produto.name}</h4>
        <span className={pendente ? 'opacity-50' : ''}>
          <Chave ligado={disponivel} onToggle={toggle} />
        </span>
      </div>

      {produto.description && (
        <p className="mt-1 text-sm text-sal-fraco">{produto.description}</p>
      )}

      <div className="mt-3 space-y-2 border-t border-borda/60 pt-3">
        {produto.variants.map((v) => (
          <PrecoVariacao key={v.id} variante={v} onErro={onErro} />
        ))}
      </div>
    </article>
  )
}

export function EditorCardapio() {
  const [cats, setCats] = useState<CatEdit[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    carregarParaEditar()
      .then(setCats)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Falha ao carregar o cardápio.'))
  }, [])

  if (erro && !cats) {
    return (
      <p className="rounded-lg border border-erro/40 bg-erro/10 px-4 py-3 text-sm text-sal">
        {erro}
      </p>
    )
  }

  if (!cats) return <p className="text-sm text-sal-fraco">Carregando o cardápio...</p>

  return (
    <div className="space-y-8">
      <p className="text-sm text-sal-fraco">
        Mudou o preço? Digite e saia do campo — salva sozinho. Acabou um item? É
        só desligar; ele some do cardápio na hora e volta quando você religar.
      </p>

      {erro && (
        <p role="alert" className="rounded-lg border border-erro/40 bg-erro/10 px-4 py-3 text-sm text-sal">
          {erro}
        </p>
      )}

      {cats.map((cat) => (
        <section key={cat.id}>
          <h3 className="etiqueta mb-3 text-brasa">{cat.name}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {cat.products.map((p) => (
              <ProdutoEditor key={p.id} produto={p} onErro={setErro} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
