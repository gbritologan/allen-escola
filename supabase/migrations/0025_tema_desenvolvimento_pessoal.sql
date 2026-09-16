-- =============================================================================
-- 0025 — "Desenvolvimento pessoal" entra como tema.
--
-- Um insert resolve o pedido inteiro ("em tudo"): mapa, seletor de tema do
-- curso, boas-vindas e Studio leem todos da mesma tabela. Não há lista fixa de
-- tema em lugar nenhum do código — e é por isso que isto é uma linha de dados,
-- e não seis edições.
--
-- `mestre` (o filósofo da pasta da marca) é o ícone: dos treze do repertório,
-- é o único que fala de formação de uma pessoa, e não de um ofício.
--
-- Nasce publicado e vazio, de propósito. Tema publicado sem curso aparece no
-- mapa como constelação apagada — que é a leitura certa: existe, ainda não
-- tem nada dentro.
-- =============================================================================

insert into public.themes (slug, name, description, icon, accent, position, status)
values (
  'desenvolvimento-pessoal',
  'Desenvolvimento pessoal',
  'Hábito, foco e constância — o que sustenta todo o resto.',
  'mestre',
  '#4C41FF',
  6,
  'published'
)
on conflict (slug) do update
   set name        = excluded.name,
       description = excluded.description,
       icon        = excluded.icon,
       status      = excluded.status;
