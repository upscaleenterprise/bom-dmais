'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { parseBRL } from '@/lib/money'
import {
  alternarProduto,
  carregarParaEditar,
  enviarFotoProduto,
  removerFotoProduto,
  salvarPrecoVariacao,
  type CatEdit,
  type ProdEdit,
  type VarEdit,
} from '@/lib/cardapioAdmin'

const TAMANHO_MAX = 5 * 1024 * 1024 // 5 MB: foto de celular cabe folgado

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
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-fundo transition-all ${
            ligado ? 'left-4' : 'left-0.5'
          }`}
        />
      </span>
      <span className={`etiqueta ${ligado ? 'text-tinta' : 'text-tinta-fraca'}`}>
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
      <span className="text-sm text-tinta-fraca">{variante.name}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-tinta-fraca">
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
          className="w-24 rounded-lg border border-borda bg-fundo py-1.5 pl-8 pr-2 text-right text-sm tabular-nums text-tinta disabled:opacity-50"
        />
      </div>
      {salvo && <span className="etiqueta text-tinta">Salvo</span>}
    </div>
  )
}

/** Foto do produto: mostra a atual, deixa trocar e remover. O arquivo vai
 *  direto do dono pro Storage dele — nunca passa por fora. */
function FotoProduto({
  produto,
  onErro,
}: {
  produto: ProdEdit
  onErro: (m: string) => void
}) {
  const [url, setUrl] = useState(produto.image_url)
  const [enviando, setEnviando] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reescolher o MESMO arquivo depois
    if (!file) return

    if (!file.type.startsWith('image/')) {
      onErro('Escolha um arquivo de imagem (JPG ou PNG).')
      return
    }
    if (file.size > TAMANHO_MAX) {
      onErro('Foto muito grande — o limite é 5 MB.')
      return
    }

    setEnviando(true)
    try {
      const nova = await enviarFotoProduto(produto.id, file, url)
      setUrl(nova)
    } catch (err) {
      onErro(err instanceof Error ? err.message : 'Não foi possível enviar a foto.')
    } finally {
      setEnviando(false)
    }
  }

  async function remover() {
    setEnviando(true)
    try {
      await removerFotoProduto(produto.id, url)
      setUrl(null)
    } catch (err) {
      onErro(err instanceof Error ? err.message : 'Não foi possível remover a foto.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3 border-t border-borda/60 pt-3">
      {url ? (
        <Image
          src={url}
          alt=""
          width={56}
          height={56}
          // A foto muda com a mesma URL raramente; o nome único já quebra cache.
          unoptimized
          className="h-14 w-14 shrink-0 rounded-lg border border-borda object-cover"
        />
      ) : (
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg border border-dashed border-borda text-lg text-tinta-fraca">
          🍽️
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={enviando}
          className="etiqueta w-fit rounded-lg bg-amarelo px-3 py-1.5 text-tinta transition-colors hover:bg-laranja disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : url ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        {url && !enviando && (
          <button
            type="button"
            onClick={remover}
            className="etiqueta w-fit text-tinta-fraca underline-offset-4 hover:text-erro hover:underline"
          >
            Remover
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        onChange={aoEscolher}
        className="hidden"
      />
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
      className={`rounded-xl border border-borda bg-superficie p-4 transition-opacity ${
        disponivel ? '' : 'opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="placa text-lg leading-tight text-tinta">{produto.name}</h4>
        <span className={pendente ? 'opacity-50' : ''}>
          <Chave ligado={disponivel} onToggle={toggle} />
        </span>
      </div>

      {produto.description && (
        <p className="mt-1 text-sm text-tinta-fraca">{produto.description}</p>
      )}

      <div className="mt-3 space-y-2 border-t border-borda/60 pt-3">
        {produto.variants.map((v) => (
          <PrecoVariacao key={v.id} variante={v} onErro={onErro} />
        ))}
      </div>

      <FotoProduto produto={produto} onErro={onErro} />
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
      <p className="rounded-lg border border-erro/40 bg-erro/10 px-4 py-3 text-sm text-tinta">
        {erro}
      </p>
    )
  }

  if (!cats) return <p className="text-sm text-tinta-fraca">Carregando o cardápio...</p>

  return (
    <div className="space-y-8">
      <p className="text-sm text-tinta-fraca">
        Mudou o preço? Digite e saia do campo — salva sozinho. Acabou um item? É
        só desligar; ele some do cardápio na hora e volta quando você religar.
      </p>

      {erro && (
        <p role="alert" className="rounded-lg border border-erro/40 bg-erro/10 px-4 py-3 text-sm text-tinta">
          {erro}
        </p>
      )}

      {cats.map((cat) => (
        <section key={cat.id}>
          <h3 className="etiqueta mb-3 text-tinta">{cat.name}</h3>
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
