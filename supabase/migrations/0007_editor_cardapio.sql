-- Editor de cardápio: o dono muda preço e disponibilidade sozinho, sem SQL.
--
-- Até aqui o cardápio só era editável por quem tinha acesso ao banco. Isso
-- transforma cada reajuste de preço num pedido de suporte — e num produto
-- vendável para vários clientes, suporte manual é o que come o lucro.
--
-- A regra de autorização é a mesma de sempre: e_dono(store_id). Variações,
-- grupos e opções não têm store_id direto, então a policy sobe a hierarquia
-- até a loja. Quem não é dono não muda nada; o cardápio segue público na leitura.

-- ------------------------------------------------------------------ categorias
create policy "dono edita categorias" on categories
  for update using (e_dono(store_id)) with check (e_dono(store_id));
create policy "dono cria categorias" on categories
  for insert with check (e_dono(store_id));
create policy "dono apaga categorias" on categories
  for delete using (e_dono(store_id));

-- ------------------------------------------------------------------- produtos
-- O UPDATE nasceu na 0004 (migration de fotos), o que deixa a autorização de
-- edição de produto longe de onde se procura por ela. Recrio aqui, junto das
-- outras policies de edição, para esta migration ser auto-suficiente.
drop policy if exists "dono edita os produtos da sua loja" on products;
create policy "dono edita produtos" on products
  for update using (e_dono(store_id)) with check (e_dono(store_id));
create policy "dono cria produtos" on products
  for insert with check (e_dono(store_id));
create policy "dono apaga produtos" on products
  for delete using (e_dono(store_id));

-- ------------------------------------------------------------------ variações
-- A variação é dona do preço — é o campo mais editado do cardápio inteiro.
-- store_id chega via product.
create policy "dono edita variacoes" on product_variants
  for update using (
    exists (select 1 from products p where p.id = product_id and e_dono(p.store_id))
  ) with check (
    exists (select 1 from products p where p.id = product_id and e_dono(p.store_id))
  );
create policy "dono cria variacoes" on product_variants
  for insert with check (
    exists (select 1 from products p where p.id = product_id and e_dono(p.store_id))
  );
create policy "dono apaga variacoes" on product_variants
  for delete using (
    exists (select 1 from products p where p.id = product_id and e_dono(p.store_id))
  );

-- ------------------------------------------------------------- grupos de opção
create policy "dono edita grupos" on option_groups
  for update using (
    exists (select 1 from products p where p.id = product_id and e_dono(p.store_id))
  ) with check (
    exists (select 1 from products p where p.id = product_id and e_dono(p.store_id))
  );
create policy "dono cria grupos" on option_groups
  for insert with check (
    exists (select 1 from products p where p.id = product_id and e_dono(p.store_id))
  );
create policy "dono apaga grupos" on option_groups
  for delete using (
    exists (select 1 from products p where p.id = product_id and e_dono(p.store_id))
  );

-- -------------------------------------------------------------------- opções
create policy "dono edita opcoes" on options
  for update using (
    exists (
      select 1 from option_groups g join products p on p.id = g.product_id
      where g.id = group_id and e_dono(p.store_id)
    )
  ) with check (
    exists (
      select 1 from option_groups g join products p on p.id = g.product_id
      where g.id = group_id and e_dono(p.store_id)
    )
  );
create policy "dono cria opcoes" on options
  for insert with check (
    exists (
      select 1 from option_groups g join products p on p.id = g.product_id
      where g.id = group_id and e_dono(p.store_id)
    )
  );
create policy "dono apaga opcoes" on options
  for delete using (
    exists (
      select 1 from option_groups g join products p on p.id = g.product_id
      where g.id = group_id and e_dono(p.store_id)
    )
  );
