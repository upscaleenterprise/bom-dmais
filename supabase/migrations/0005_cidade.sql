-- A cidade do recebedor é campo obrigatório do BR Code do Pix. Estava chumbada
-- no código; pertence à loja, ainda mais num schema pensado para várias.

alter table stores add column city text not null default 'Sao Luis';

update stores set city = 'Sao Luis' where slug = 'bom-dmais';

-- get_order já devolve os dados da loja; passa a incluir a cidade.
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
    'store', jsonb_build_object(
      'name', s.name, 'phone', s.phone, 'pix_key', s.pix_key, 'city', s.city
    ),
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
