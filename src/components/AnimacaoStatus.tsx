import type { OrderStatus } from '@/lib/types'
import { cenaDoStatus } from '@/lib/animacaoStatus'
import { SCENES, DEFS } from './cenasStatus'

/**
 * O herói da tela de acompanhamento: a cena que o dono desenhou pra cada
 * status. Renderiza o SVG direto (sem web component nem shadow DOM), então
 * já sai pronto no HTML do servidor — sem piscar esperando JavaScript.
 *
 * `key={cena}` faz o React trocar o nó ao mudar de status, e a troca dispara a
 * animação de entrada (sceneIn) — a cena nova "chega" em vez de aparecer seca.
 *
 * aria-hidden: a Trilha logo abaixo já anuncia o status em texto pro leitor de
 * tela. A animação é o reforço visual — repetir viraria eco.
 */
export function AnimacaoStatus({ status }: { status: OrderStatus }) {
  const cena = cenaDoStatus(status)
  if (!cena) return null

  return (
    <div
      aria-hidden
      className="mx-auto w-full max-w-[17rem] overflow-hidden rounded-2xl border border-borda shadow-sm"
    >
      <div className="as-root">
        {/* Gradientes compartilhados pelas cenas (rosto, céu, brasa). */}
        <div dangerouslySetInnerHTML={{ __html: DEFS }} />
        <div
          key={cena}
          className="as-scene"
          dangerouslySetInnerHTML={{ __html: SCENES[cena] }}
        />
      </div>
    </div>
  )
}
