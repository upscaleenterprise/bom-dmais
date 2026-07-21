import Link from 'next/link'

/** Cabeçalho das telas internas: volta e título. Sem brasa — o brilho é do cardápio. */
export function Topo({ titulo, voltarPara }: { titulo: string; voltarPara: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-borda bg-carvao/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
        <Link
          href={voltarPara}
          aria-label="Voltar"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-sal-fraco hover:bg-fumaca hover:text-sal"
        >
          ←
        </Link>
        <h1 className="placa text-xl leading-none text-sal">{titulo}</h1>
      </div>
    </header>
  )
}
