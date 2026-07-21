-- O cliente não manda mais preço. Ele manda intenção (variação, quantidade,
-- opções) e o servidor recalcula tudo a partir do banco.
--
-- Motivo: com insert direto, dava pra mandar total_cents = 0 e comprar picanha
-- de graça. Testado e confirmado. Preço nunca vem de quem está do outro lado.

drop policy "cliente cria pedido" on orders;
drop policy "cliente cria itens" on order_items;
drop policy "cliente cria opcoes" on order_item_options;

-- p_items: [{ "variant_id": uuid, "quantity": int, "notes": text, "option_ids": [uuid] }]
create or replace function create_order(
  p_store_slug         text,
  p_customer_name      text,
  p_customer_phone     text,
  p_address_street     text,
  p_address_number     text,
  p_address_district   text,
  p_payment_method     payment_method,
  p_items              jsonb,
  p_address_complement text default null,
  p_address_reference  text default null,
  p_change_for_cents   integer default null,
  p_notes              text default null
)
returns table (order_id uuid, order_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store    stores%rowtype;
  v_order_id uuid;
  v_item     jsonb;
  v_variant  product_variants%rowtype;
  v_product  products%rowtype;
  v_group    option_groups%rowtype;
  v_item_id  uuid;
  v_option_ids uuid[];
  v_selected integer;
  v_unit     integer;
  v_qty      integer;
  v_subtotal integer := 0;
  v_total    integer;
begin
  select * into v_store from stores where slug = p_store_slug;
  if not found then
    raise exception 'Loja não encontrada.' using errcode = 'P0001';
  end if;

  if not v_store.is_open then
    raise exception 'A loja está fechada no momento.' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'O carrinho está vazio.' using errcode = 'P0001';
  end if;

  if btrim(coalesce(p_customer_name, '')) = '' then
    raise exception 'Informe o nome.' using errcode = 'P0001';
  end if;

  if btrim(coalesce(p_customer_phone, '')) = '' then
    raise exception 'Informe o telefone.' using errcode = 'P0001';
  end if;

  -- Totais entram zerados e são corrigidos no fim, quando a soma real existe.
  insert into orders (
    store_id, customer_name, customer_phone,
    address_street, address_number, address_complement, address_district, address_reference,
    payment_method, change_for_cents, notes,
    subtotal_cents, delivery_fee_cents, total_cents
  ) values (
    v_store.id, btrim(p_customer_name), btrim(p_customer_phone),
    btrim(p_address_street), btrim(p_address_number), p_address_complement,
    btrim(p_address_district), p_address_reference,
    p_payment_method, p_change_for_cents, p_notes,
    0, v_store.delivery_fee_cents, 0
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty <= 0 or v_qty > 99 then
      raise exception 'Quantidade inválida.' using errcode = 'P0001';
    end if;

    select * into v_variant
      from product_variants where id = (v_item->>'variant_id')::uuid;
    if not found or not v_variant.is_available then
      raise exception 'Item indisponível.' using errcode = 'P0001';
    end if;

    select * into v_product from products where id = v_variant.product_id;
    -- Trava de multi-loja: variação de outra loja não entra neste pedido.
    if v_product.store_id <> v_store.id or not v_product.is_available then
      raise exception 'Item indisponível: %.', v_product.name using errcode = 'P0001';
    end if;

    select coalesce(array_agg(t.value::uuid), '{}'::uuid[])
      into v_option_ids
      from jsonb_array_elements_text(coalesce(v_item->'option_ids', '[]'::jsonb)) as t(value);

    -- Toda opção enviada tem que pertencer a um grupo DESTE produto e estar ativa.
    -- Sem isso dá pra pendurar a opção barata de outro produto aqui.
    if exists (
      select 1 from unnest(v_option_ids) as oid
      where not exists (
        select 1 from options o
          join option_groups g on g.id = o.group_id
        where o.id = oid and g.product_id = v_product.id and o.is_available
      )
    ) then
      raise exception 'Opção inválida para %.', v_product.name using errcode = 'P0001';
    end if;

    -- min/max de cada grupo — a mesma regra que a tela mostra, aplicada de novo aqui.
    for v_group in select * from option_groups where product_id = v_product.id loop
      select count(*) into v_selected
        from options o
       where o.group_id = v_group.id and o.id = any(v_option_ids);

      if v_selected < v_group.min_select then
        raise exception 'Escolha % opção(ões) em "%" para %.',
          v_group.min_select, v_group.name, v_product.name using errcode = 'P0001';
      end if;
      if v_selected > v_group.max_select then
        raise exception 'No máximo % opção(ões) em "%" para %.',
          v_group.max_select, v_group.name, v_product.name using errcode = 'P0001';
      end if;
    end loop;

    -- O preço nasce aqui, do banco.
    select v_variant.price_cents + coalesce(sum(o.price_cents), 0)
      into v_unit
      from options o where o.id = any(v_option_ids);

    insert into order_items (
      order_id, product_id, variant_id, product_name, variant_name,
      unit_price_cents, quantity, line_total_cents, notes
    ) values (
      v_order_id, v_product.id, v_variant.id, v_product.name, v_variant.name,
      v_unit, v_qty, v_unit * v_qty, nullif(btrim(coalesce(v_item->>'notes', '')), '')
    ) returning id into v_item_id;

    insert into order_item_options (order_item_id, option_id, group_name, option_name, price_cents)
    select v_item_id, o.id, g.name, o.name, o.price_cents
      from options o join option_groups g on g.id = o.group_id
     where o.id = any(v_option_ids);

    v_subtotal := v_subtotal + (v_unit * v_qty);
  end loop;

  if v_subtotal < v_store.min_order_cents then
    -- Vírgula na mão: os formatos G/D do to_char seguem o locale do servidor,
    -- que é C, e sairia "R$ 40.00" pro cliente.
    raise exception 'O pedido mínimo é de R$ %.',
      replace(to_char(v_store.min_order_cents / 100.0, 'FM999999990.00'), '.', ',')
      using errcode = 'P0001';
  end if;

  v_total := v_subtotal + v_store.delivery_fee_cents;

  -- Troco menor que o total é erro de digitação, não pedido válido.
  if p_payment_method = 'dinheiro'
     and p_change_for_cents is not null
     and p_change_for_cents < v_total then
    raise exception 'O valor do troco é menor que o total do pedido.' using errcode = 'P0001';
  end if;

  update orders
     set subtotal_cents = v_subtotal,
         total_cents    = v_total
   where id = v_order_id;

  return query select o.id, o.code from orders o where o.id = v_order_id;
end;
$$;

-- Quem tem o uuid do pedido vê o pedido. É esse o "login" do cliente.
create or replace function get_order(p_order_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id',             o.id,
    'code',           o.code,
    'status',         o.status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'customer_name',  o.customer_name,
    'created_at',     o.created_at,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'total_cents',    o.total_cents,
    'change_for_cents', o.change_for_cents,
    'notes',          o.notes,
    'address', jsonb_build_object(
      'street', o.address_street, 'number', o.address_number,
      'complement', o.address_complement, 'district', o.address_district,
      'reference', o.address_reference
    ),
    'store', jsonb_build_object('name', s.name, 'phone', s.phone, 'pix_key', s.pix_key),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'variant_name', i.variant_name,
        'quantity',     i.quantity,
        'unit_price_cents', i.unit_price_cents,
        'line_total_cents', i.line_total_cents,
        'notes',        i.notes,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'group_name', op.group_name, 'option_name', op.option_name, 'price_cents', op.price_cents
          ) order by op.group_name)
          from order_item_options op where op.order_item_id = i.id
        ), '[]'::jsonb)
      ) order by i.product_name)
      from order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from orders o join stores s on s.id = o.store_id
  where o.id = p_order_id;
$$;

revoke all on function create_order from public;
revoke all on function get_order   from public;
grant execute on function create_order to anon, authenticated;
grant execute on function get_order   to anon, authenticated;
