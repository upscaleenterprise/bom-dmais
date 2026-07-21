-- Delivery de churrascaria — schema inicial.
-- Multi-loja desde o início: tudo pendura em store_id, mesmo com uma loja só hoje.

create type order_status as enum (
  'recebido', 'em_preparo', 'saiu_entrega', 'entregue', 'cancelado'
);

create type payment_method as enum ('pix', 'dinheiro', 'cartao_entrega');

create type payment_status as enum ('aguardando', 'confirmado', 'estornado');

create table stores (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  description        text,
  phone              text,
  pix_key            text,
  is_open            boolean not null default false,
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  min_order_cents    integer not null default 0 check (min_order_cents >= 0),
  created_at         timestamptz not null default now()
);

create table categories (
  id       uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  name     text not null,
  position integer not null default 0
);

create index on categories (store_id, position);

create table products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references stores (id) on delete cascade,
  category_id  uuid not null references categories (id) on delete cascade,
  name         text not null,
  description  text,
  image_url    text,
  is_available boolean not null default true,
  position     integer not null default 0
);

create index on products (store_id, category_id, position);

-- Peso/tamanho é variação do mesmo produto, não produto separado.
-- Picanha 500g e Picanha 1kg são uma linha em products e duas aqui.
create table product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products (id) on delete cascade,
  name         text not null,
  price_cents  integer not null check (price_cents >= 0),
  is_available boolean not null default true,
  position     integer not null default 0
);

create index on product_variants (product_id, position);

-- min_select = 1 força a escolha (ponto da carne).
-- max_select > 1 permite múltiplos (acompanhamentos).
create table option_groups (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  name       text not null,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  position   integer not null default 0,
  constraint max_gte_min check (max_select >= min_select)
);

create index on option_groups (product_id, position);

create table options (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references option_groups (id) on delete cascade,
  name         text not null,
  price_cents  integer not null default 0 check (price_cents >= 0),
  is_available boolean not null default true,
  position     integer not null default 0
);

create index on options (group_id, position);

-- Código curto e legível pro cliente falar no telefone ("pedido 7F3K").
create sequence order_code_seq;

create table orders (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references stores (id) on delete restrict,
  code               text not null unique default upper(to_hex(nextval('order_code_seq') + 46655)),
  status             order_status not null default 'recebido',
  customer_name      text not null,
  customer_phone     text not null,
  address_street     text not null,
  address_number     text not null,
  address_complement text,
  address_district   text not null,
  address_reference  text,
  payment_method     payment_method not null,
  payment_status     payment_status not null default 'aguardando',
  change_for_cents   integer check (change_for_cents >= 0),
  subtotal_cents     integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents        integer not null check (total_cents >= 0),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index on orders (store_id, status, created_at desc);

-- Nome e preço são congelados na hora do pedido. Se a loja reajustar a picanha
-- amanhã, o pedido de hoje continua contando a história certa.
create table order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references orders (id) on delete cascade,
  product_id       uuid references products (id) on delete set null,
  variant_id       uuid references product_variants (id) on delete set null,
  product_name     text not null,
  variant_name     text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity         integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  notes            text
);

create index on order_items (order_id);

create table order_item_options (
  id            uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items (id) on delete cascade,
  option_id     uuid references options (id) on delete set null,
  group_name    text not null,
  option_name   text not null,
  price_cents   integer not null default 0 check (price_cents >= 0)
);

create index on order_item_options (order_item_id);

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_touch_updated_at
  before update on orders
  for each row execute function touch_updated_at();

-- Realtime no painel do dono.
alter publication supabase_realtime add table orders;

-- ---------------------------------------------------------------------------
-- RLS: cardápio é público, pedido é escrita pública / leitura por posse do id,
-- e o dono (autenticado) enxerga e mexe em tudo da sua loja.
-- ---------------------------------------------------------------------------

alter table stores             enable row level security;
alter table categories         enable row level security;
alter table products           enable row level security;
alter table product_variants   enable row level security;
alter table option_groups      enable row level security;
alter table options            enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table order_item_options enable row level security;

create policy "cardapio publico" on stores           for select using (true);
create policy "cardapio publico" on categories       for select using (true);
create policy "cardapio publico" on products         for select using (true);
create policy "cardapio publico" on product_variants for select using (true);
create policy "cardapio publico" on option_groups    for select using (true);
create policy "cardapio publico" on options          for select using (true);

-- Cliente cria o pedido; o id (uuid) que ele recebe é o segredo que dá acesso
-- ao acompanhamento. Sem o id, não lista nada.
create policy "cliente cria pedido" on orders
  for insert with check (true);

create policy "cliente cria itens" on order_items
  for insert with check (true);

create policy "cliente cria opcoes" on order_item_options
  for insert with check (true);

create policy "dono ve pedidos" on orders
  for select using (auth.role() = 'authenticated');

create policy "dono atualiza pedidos" on orders
  for update using (auth.role() = 'authenticated');

create policy "dono ve itens" on order_items
  for select using (auth.role() = 'authenticated');

create policy "dono ve opcoes dos itens" on order_item_options
  for select using (auth.role() = 'authenticated');
