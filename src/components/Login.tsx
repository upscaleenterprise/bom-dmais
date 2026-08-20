'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEntrando(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      // A mensagem do Supabase vem em inglês e diz "Invalid login credentials".
      // Quem está do outro lado é o dono da churrascaria, às 19h, com fila.
      setErro(
        error.message.includes('Invalid login')
          ? 'Email ou senha incorretos.'
          : 'Não foi possível entrar. Tente de novo.',
      )
      setEntrando(false)
    }
    // O onAuthStateChange do Painel cuida da troca de tela.
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-16">
      <h1 className="placa text-3xl leading-none text-tinta">Painel</h1>
      <p className="mt-2 text-sm text-tinta-fraca">Entre para ver os pedidos.</p>

      <form onSubmit={entrar} className="mt-8 space-y-3">
        <label className="block">
          <span className="etiqueta mb-1.5 block text-tinta-fraca">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="w-full rounded-lg border border-borda bg-fundo px-3.5 py-3 text-sm text-tinta"
          />
        </label>

        <label className="block">
          <span className="etiqueta mb-1.5 block text-tinta-fraca">Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-borda bg-fundo px-3.5 py-3 text-sm text-tinta"
          />
        </label>

        {erro && (
          <p role="alert" className="text-sm font-medium text-erro">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="h-12 w-full rounded-lg bg-amarelo font-semibold text-tinta transition-colors hover:bg-laranja disabled:opacity-60"
        >
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
