'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Nome e endereço ficam no navegador do cliente. Quem pede delivery pede de novo,
 * e redigitar o endereço inteiro é o atrito que faz desistir no meio.
 * Nada disso vai pro servidor até ele confirmar o pedido.
 */
export type Cliente = {
  nome: string
  telefone: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  referencia: string
}

export const CLIENTE_VAZIO: Cliente = {
  nome: '',
  telefone: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  referencia: '',
}

type ClienteState = {
  cliente: Cliente
  salvar: (dados: Partial<Cliente>) => void
}

export const useCliente = create<ClienteState>()(
  persist(
    (set) => ({
      cliente: CLIENTE_VAZIO,
      salvar: (dados) =>
        set((state) => ({ cliente: { ...state.cliente, ...dados } })),
    }),
    { name: 'brasa-cliente' },
  ),
)

/** (98) 99999-9999 — formata enquanto digita, sem brigar com quem apaga. */
export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function telefoneValido(valor: string): boolean {
  return valor.replace(/\D/g, '').length >= 10
}
