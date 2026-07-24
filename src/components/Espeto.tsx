import { COR_INGREDIENTE, pedacosDoEspeto } from '@/lib/sabor'

/**
 * O espeto do sabor, desenhado com o que tem dentro dele.
 *
 * Decorativo por definição: o nome do sabor está sempre escrito ao lado, então
 * o desenho não carrega informação que só ele tenha — daí o aria-hidden.
 */
export function Espeto({ sabor, className = '' }: { sabor: string; className?: string }) {
  const pedacos = pedacosDoEspeto(sabor)
  if (pedacos.length === 0) return null

  return (
    <svg viewBox="0 0 34 76" aria-hidden className={className}>
      <path d="M17 2V74" stroke="#c9b49a" strokeWidth="1.6" strokeLinecap="round" />
      {pedacos.map((ing, i) => (
        <g key={i}>
          <rect
            x="4"
            y={9 + i * 21}
            width="26"
            height="17"
            rx="6"
            fill={COR_INGREDIENTE[ing]}
          />
          {/* Marca da grelha: é o que faz ler como assado, não como bloco. */}
          <path
            d={`M7 ${17 + i * 21}h20`}
            stroke="#3d1c10"
            strokeWidth="1.4"
            opacity="0.5"
          />
        </g>
      ))}
    </svg>
  )
}
