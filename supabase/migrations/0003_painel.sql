-- "Está logado" não é autorização.
--
-- As policies anteriores liberavam os pedidos para auth.role() = 'authenticated'.
-- Como o Supabase aceita cadastro público por padrão, qualquer pessoa que criasse
-- uma conta leria nome, telefone e endereço de todos os clientes. Quem enxerga
-- pedido é quem é dono da loja — e isso precisa estar escrito no banco.

create table store_members (
  store_id   uuid not null references stores (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

alter table store_members enable row level security;

create policy "membro ve o proprio vinculo" on store_members
  for select using (user_id = (select auth.uid()));

-- Em SECURITY INVOKER a policy de store_members se aplicaria de novo aqui e a
-- checagem ficaria recursiva. DEFINER resolve o vínculo uma vez, direto.
create or replace function e_dono(p_store_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from store_members m
     where m.store_id = p_store_id
       and m.user_id = (select auth.uid())
  );
$$;

drop policy "dono ve pedidos" on orders;
drop policy "dono atualiza pedidos" on orders;
drop policy "dono ve itens" on order_items;
drop policy "dono ve opcoes dos itens" on order_item_options;

create policy "dono ve pedidos da sua loja" on orders
  for select using (e_dono(store_id));

create policy "dono atualiza pedidos da sua loja" on orders
  for update using (e_dono(store_id)) with check (e_dono(store_id));

create policy "dono ve itens da sua loja" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_items.order_id and e_dono(o.store_id))
  );

create policy "dono ve opcoes da sua loja" on order_item_options
  for select using (
    exists (
      select 1 from order_items i
        join orders o on o.id = i.order_id
       where i.id = order_item_options.order_item_id and e_dono(o.store_id)
    )
  );

-- O dono também precisa abrir e fechar a loja.
create policy "dono atualiza a sua loja" on stores
  for update using (e_dono(id)) with check (e_dono(id));

-- Mudança de status passa por aqui em vez de update solto: assim o pedido não
-- pula etapa nem volta do entregue, e o painel tem uma regra só.
create or replace function set_order_status(p_order_id uuid, p_status order_status)
returns order_status
language plpgsql
security invoker -- o RLS acima é quem autoriza; não dá pra escapar por aqui
as $$
declare
  v_atual order_status;
begin
  select status into v_atual from orders where id = p_order_id;
  if not found then
    raise exception 'Pedido não encontrado.' using errcode = 'P0001';
  end if;

  if v_atual in ('entregue', 'cancelado') then
    raise exception 'O pedido já foi finalizado.' using errcode = 'P0001';
  end if;

  update orders set status = p_status where id = p_order_id;
  return p_status;
end;
$$;

grant execute on function set_order_status to authenticated;
