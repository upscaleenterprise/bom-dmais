# Bom D+ — delivery de churrasquinho

**No ar em [bom-dmais.vercel.app](https://bom-dmais.vercel.app)**

Sistema de delivery completo: cardápio, carrinho, checkout com Pix, acompanhamento
do pedido e painel da cozinha em tempo real.

Roda inteiro no plano gratuito de Vercel e Supabase — a restrição de custo zero é
o que define várias decisões aqui.

> Os dados deste repositório são de uma churrascaria fictícia, usada como exemplo.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (Postgres,
Auth, Realtime) · Vercel

## As decisões que sustentam o resto

### Preço nasce no banco, nunca no cliente

O checkout envia **intenção** — ids de variação, quantidades e opções escolhidas.
Quem calcula é a função [`create_order`](supabase/migrations/0002_create_order.sql):
busca os preços reais, valida as regras de cada grupo de opção, soma e grava tudo
numa transação só.

Não é preciosismo. A primeira versão gravava o pedido por `insert` direto, e um
teste mostrou que dava para enviar `total_cents = 0` e comprar picanha de graça.
O `insert` foi revogado; hoje o cliente não tem como opinar sobre preço.

A mesma função também recusa opção que não pertence ao produto — sem isso dava
para pendurar a opção barata de um item em outro.

### Autorização por vínculo, não por "estar logado"

A policy original liberava os pedidos para `auth.role() = 'authenticated'`. Como o
Supabase aceita cadastro público por padrão, qualquer pessoa criava uma conta e
lia nome, telefone e endereço de todos os clientes.

Hoje existe [`store_members`](supabase/migrations/0003_painel.sql): quem enxerga
pedido é quem está declarado dono daquela loja. Verificado com dois usuários — o
dono vê tudo, um autenticado sem vínculo vê zero.

O cliente anônimo continua vendo **o próprio** pedido pelo uuid, que funciona como
senha: aleatório, não sequencial, e a leitura passa por uma função `get_order` em
vez de acesso direto à tabela.

### Dinheiro é inteiro em centavos

Do banco até a tela, sem exceção. Float em preço perde centavo no arredondamento
e o caixa não fecha no fim do mês.

### O item do pedido congela nome e preço

Reajustar a picanha amanhã não reescreve o pedido de ontem. O histórico continua
contando a história certa.

### Multi-loja desde o início

Tudo pendura em `store_id`, mesmo com uma loja só. Vira marketplace depois sem
migração dolorosa; custa quase nada agora.

### Pix com BR Code próprio

O [payload EMV do Banco Central](src/lib/pix.ts) é montado à mão, incluindo o
CRC16/CCITT-FALSE — um dígito errado faz o app do banco recusar sem explicar por
quê. O teste confere o algoritmo contra o vetor de verificação padrão
(`"123456789"` → `0x29B1`), então a validação não depende de eu ter acertado por
sorte.

### Realtime no painel, consulta no cliente

O painel da cozinha usa Supabase Realtime; o acompanhamento do cliente usa
consulta periódica. A diferença não é preguiça: o RLS impede o cliente anônimo de
ler a tabela `orders`, então o Realtime nunca entregaria evento para ele.

## Regras do cardápio

Grupos de opção com mínimo e máximo cobrem os três casos difíceis de uma
churrascaria com uma estrutura só:

| Caso | Como é modelado |
|---|---|
| Picanha 500g e 1kg | Um produto, duas variações — não dois produtos |
| Ponto da carne obrigatório | Grupo com `min_select = 1` e `max_select = 1` |
| Até 3 acompanhamentos | Grupo com `min_select = 0` e `max_select = 3` |

A regra é aplicada duas vezes de propósito: em [`selection.ts`](src/lib/selection.ts)
para a tela avisar na hora, e no banco para valer. A tela é conveniência; o banco
é a autoridade.

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

No SQL Editor do Supabase, execute na ordem os arquivos de
[`supabase/migrations`](supabase/migrations) e depois
[`supabase/seed.sql`](supabase/seed.sql).

Para acessar o painel, crie um usuário em Authentication → Users e vincule-o à
loja:

```sql
insert into store_members (store_id, user_id)
select s.id, u.id
from stores s, auth.users u
where s.slug = 'bom-dmais' and u.email = 'seu-email@exemplo.com';
```

## Testes

```bash
npm test          # Node 24 roda TypeScript direto, sem Jest nem Vitest
npx tsc --noEmit
npx eslint src
```

A lógica de preço, as regras de seleção e o BR Code do Pix são funções puras,
separadas de React e de I/O justamente para serem testáveis sem simular navegador.
