-- =============================================================================
-- 0030 — A grade de temas fecha em oito.
--
-- Entram Filosofia e Liderança e Gestão. "Desenvolvimento pessoal" (0025, de
-- hoje) vira Softskills — o nome que o mercado corporativo usa, e esta é uma
-- escola corporativa.
--
-- O SLUG TAMBÉM MUDA, e isso normalmente eu não faria: slug é endereço, e
-- endereço trocado quebra link que já circulou. Aqui é seguro porque o tema
-- nasceu hoje, tem zero cursos e nunca foi divulgado. Daqui a um mês a
-- resposta seria outra: manter o slug e trocar só o nome.
--
-- OS ÍCONES saem do repertório clássico da marca, e duas escolhas mudaram:
--
--   Filosofia → `mestre`. O filósofo da pasta da marca é literalmente isso.
--               Ele estava em Desenvolvimento pessoal, onde era aproximação.
--   Softskills → `balanca`. Softskill é equilíbrio em relação — medir o outro
--               antes de responder. É o mais fraco dos oito, e trocável em
--               Studio → Temas.
--   Liderança → `estandarte`. O lábaro romano é o que o líder carrega à
--               frente. Não é metáfora: é a função do objeto.
--
-- A POSIÇÃO é alfabética. Ordem alfabética num conjunto de oito pares não é
-- preguiça — é a única ordem que o aluno consegue prever.
-- =============================================================================

update public.themes
   set slug        = 'softskills',
       name        = 'Softskills',
       description = 'Comunicação, escuta e as habilidades que nenhum cargo ensina.',
       icon        = 'balanca'
 where slug = 'desenvolvimento-pessoal';

insert into public.themes (slug, name, description, icon, accent, position, status)
values
  ('filosofia', 'Filosofia',
   'Pensar antes de executar — e saber por que se executa.',
   'mestre', '#4C41FF', 3, 'published'),
  ('lideranca-e-gestao', 'Liderança e Gestão',
   'Conduzir pessoas e decisões sem depender de cargo.',
   'estandarte', '#4C41FF', 5, 'published')
on conflict (slug) do update
   set name        = excluded.name,
       description = excluded.description,
       icon        = excluded.icon,
       status      = excluded.status;

update public.themes set position = 1 where slug = 'dados-e-tecnologia';
update public.themes set position = 2 where slug = 'ferramentas';
update public.themes set position = 3 where slug = 'filosofia';
update public.themes set position = 4 where slug = 'inteligencia-artificial';
update public.themes set position = 5 where slug = 'lideranca-e-gestao';
update public.themes set position = 6 where slug = 'marketing';
update public.themes set position = 7 where slug = 'softskills';
update public.themes set position = 8 where slug = 'vendas';
