import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltam NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copie .env.local.example para .env.local e preencha com as chaves do painel do Supabase.',
  )
}

// A anon key é pública de propósito: ela vai no bundle do navegador. Quem protege
// os dados é o RLS no banco, não o segredo da chave.
export const supabase = createClient(url, anonKey)

export const STORE_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG ?? 'bom-dmais'
