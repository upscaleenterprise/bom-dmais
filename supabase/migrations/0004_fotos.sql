-- Fotos dos produtos no Storage do Supabase.
--
-- O bucket é público na leitura: foto de cardápio é feita pra ser vista, e URL
-- assinada em imagem pública só gastaria requisição e quebraria o cache do CDN.
-- Escrever, só o dono da loja.

insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

create policy "foto de produto e publica"
  on storage.objects for select
  using (bucket_id = 'produtos');

-- O dono manda foto; o resto do mundo não. Sem isso, o bucket público viraria
-- hospedagem de arquivo grátis pra qualquer um com a anon key.
create policy "dono envia foto"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'produtos'
    and exists (select 1 from store_members m where m.user_id = (select auth.uid()))
  );

create policy "dono troca foto"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'produtos'
    and exists (select 1 from store_members m where m.user_id = (select auth.uid()))
  );

create policy "dono apaga foto"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'produtos'
    and exists (select 1 from store_members m where m.user_id = (select auth.uid()))
  );

-- O dono precisa poder mexer no próprio cardápio (a foto é uma coluna daqui).
create policy "dono edita os produtos da sua loja"
  on products for update
  using (e_dono(store_id)) with check (e_dono(store_id));
