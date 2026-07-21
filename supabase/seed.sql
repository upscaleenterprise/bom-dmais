-- Cardápio de exemplo. Roda depois da 0001_init.sql.

insert into stores (slug, name, description, phone, pix_key, is_open, delivery_fee_cents, min_order_cents)
values (
  'brasa-viva',
  'Brasa Viva Churrascaria',
  'Carne no ponto, entregue quente.',
  '5598999999999',
  'contato@brasaviva.com.br',
  true,
  800,
  4000
);

insert into categories (store_id, name, position)
select id, nome, pos from stores, (values
  ('Kits Churrasco', 0),
  ('Carnes', 1),
  ('Espetos', 2),
  ('Acompanhamentos', 3),
  ('Bebidas', 4)
) as c (nome, pos)
where slug = 'brasa-viva';

insert into products (store_id, category_id, name, description, position)
select s.id, c.id, p.nome, p.descricao, p.pos
from stores s
join categories c on c.store_id = s.id
join (values
  ('Kits Churrasco',  'Kit Churrasco 4 Pessoas', 'Picanha, linguiça e frango. Acompanha farofa, vinagrete e pão de alho.', 0),
  ('Kits Churrasco',  'Kit Churrasco 8 Pessoas', 'Picanha, maminha, linguiça e frango. Acompanha farofa, vinagrete, pão de alho e arroz.', 1),
  ('Carnes',          'Picanha',                 'Peça inteira, maturada, com capa de gordura.', 0),
  ('Carnes',          'Maminha',                 'Macia e suculenta, corte tradicional.', 1),
  ('Carnes',          'Fraldinha',               'Marmoreio generoso, ótima na brasa.', 2),
  ('Carnes',          'Costela Bovina',          'Assada 6 horas, desmancha no garfo.', 3),
  ('Carnes',          'Linguiça Toscana',        'Artesanal, defumada na hora.', 4),
  ('Espetos',         'Espeto de Picanha',       'Servido com farofa.', 0),
  ('Espetos',         'Espeto de Frango',        'Coxa e sobrecoxa temperadas.', 1),
  ('Espetos',         'Espeto de Coração',       'Coração de frango na brasa.', 2),
  ('Acompanhamentos', 'Farofa da Casa',          'Com bacon e ovos.', 0),
  ('Acompanhamentos', 'Vinagrete',               'Feito na hora.', 1),
  ('Acompanhamentos', 'Pão de Alho',             'Recheado, 4 unidades.', 2),
  ('Bebidas',         'Coca-Cola',               'Gelada.', 0),
  ('Bebidas',         'Guaraná Antarctica',      'Gelada.', 1),
  ('Bebidas',         'Cerveja Heineken',        'Long neck 330ml.', 2)
) as p (categoria, nome, descricao, pos) on p.categoria = c.name
where s.slug = 'brasa-viva';

insert into product_variants (product_id, name, price_cents, position)
select p.id, v.tamanho, v.preco, v.pos
from products p
join (values
  ('Kit Churrasco 4 Pessoas', 'Serve 4 pessoas',  18990, 0),
  ('Kit Churrasco 8 Pessoas', 'Serve 8 pessoas',  34990, 0),
  ('Picanha',                 '500g',              7990, 0),
  ('Picanha',                 '1kg',              14990, 1),
  ('Maminha',                 '500g',              5490, 0),
  ('Maminha',                 '1kg',               9990, 1),
  ('Fraldinha',               '500g',              4990, 0),
  ('Fraldinha',               '1kg',               8990, 1),
  ('Costela Bovina',          '1kg',               8990, 0),
  ('Linguiça Toscana',        '500g',              2990, 0),
  ('Espeto de Picanha',       'Unidade',           1890, 0),
  ('Espeto de Frango',        'Unidade',           1190, 0),
  ('Espeto de Coração',       'Unidade',           1390, 0),
  ('Farofa da Casa',          'Porção 300g',        1490, 0),
  ('Vinagrete',               'Porção 300g',        1090, 0),
  ('Pão de Alho',             '4 unidades',         1590, 0),
  ('Coca-Cola',               'Lata 350ml',          690, 0),
  ('Coca-Cola',               '2 litros',           1290, 1),
  ('Guaraná Antarctica',      'Lata 350ml',          590, 0),
  ('Guaraná Antarctica',      '2 litros',           1190, 1),
  ('Cerveja Heineken',        'Long neck 330ml',     890, 0)
) as v (produto, tamanho, preco, pos) on v.produto = p.name;

-- Ponto da carne: obrigatório e exatamente um (min = max = 1).
insert into option_groups (product_id, name, min_select, max_select, position)
select p.id, 'Ponto da carne', 1, 1, 0
from products p
where p.name in ('Picanha', 'Maminha', 'Fraldinha', 'Espeto de Picanha', 'Kit Churrasco 4 Pessoas', 'Kit Churrasco 8 Pessoas');

insert into options (group_id, name, price_cents, position)
select g.id, o.nome, 0, o.pos
from option_groups g
join (values
  ('Mal passada', 0),
  ('Ao ponto para mal', 1),
  ('Ao ponto', 2),
  ('Ao ponto para bem', 3),
  ('Bem passada', 4)
) as o (nome, pos) on true
where g.name = 'Ponto da carne';

-- Acompanhamentos extras: opcional, até 3 (min 0, max 3).
insert into option_groups (product_id, name, min_select, max_select, position)
select p.id, 'Acompanhamentos extras', 0, 3, 1
from products p
where p.name in ('Picanha', 'Maminha', 'Fraldinha', 'Costela Bovina', 'Kit Churrasco 4 Pessoas', 'Kit Churrasco 8 Pessoas');

insert into options (group_id, name, price_cents, position)
select g.id, o.nome, o.preco, o.pos
from option_groups g
join (values
  ('Farofa da casa',  1490, 0),
  ('Vinagrete',       1090, 1),
  ('Pão de alho',     1590, 2),
  ('Arroz branco',     990, 3),
  ('Maionese temperada', 1290, 4)
) as o (nome, preco, pos) on true
where g.name = 'Acompanhamentos extras';
