-- =============================================================================
-- 0035 — Os emblemas gregos, agora com arte de verdade.
--
-- 0032 apontou os temas para personagens gregos e 0033 reverteu, porque o
-- desenho era meu e saiu ruim (Atena virou o fantasma do Pac-Man). O conceito
-- ficou esperando a arte.
--
-- A arte chegou: oito emblemas azuis, no traço da marca. Foram convertidos em
-- ESTÊNCIL por `scripts/preparar-icones-tema.py` — luminância vira alpha,
-- então a forma fica e a cor sai. É o CSS que pinta cada um com a cor do tema
-- (0031), e por isso um arquivo serve para os dois temas e para qualquer cor
-- futura.
-- =============================================================================

update public.themes set icon = 'atena'    where slug = 'dados-e-tecnologia';
update public.themes set icon = 'hefesto'  where slug = 'ferramentas';
update public.themes set icon = 'socrates' where slug = 'filosofia';
update public.themes set icon = 'prometeu' where slug = 'inteligencia-artificial';
update public.themes set icon = 'zeus'     where slug = 'lideranca-e-gestao';
update public.themes set icon = 'hermes'   where slug = 'marketing';
update public.themes set icon = 'apolo'    where slug = 'softskills';
update public.themes set icon = 'nike'     where slug = 'vendas';

comment on column public.themes.icon is
  'Chave do emblema em public/temas/<chave>.png. Usado como máscara; a cor vem de accent.';
