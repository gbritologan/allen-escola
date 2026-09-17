-- =============================================================================
-- 0037 — A ordem dos temas deixa de ser alfabética.
--
-- Em 0030 eu ordenei alfabeticamente e justifiquei: "é a única ordem que o
-- aluno consegue prever". O argumento estava certo e a premissa, errada — eu
-- assumi que previsibilidade era o critério porque não conhecia outro.
--
-- O Gabriel tem um: esta é a ordem do NEGÓCIO. Dados, IA, Liderança, Marketing
-- e Vendas primeiro — o que a empresa compra. Softskills, Ferramentas e
-- Filosofia depois — o que sustenta, e que ninguém procura pelo nome no
-- primeiro dia.
--
-- Ordem alfabética é o que se usa quando não se sabe o que vem primeiro. Saber
-- vale mais que ser previsível: numa grade de oito o aluno não decora a ordem,
-- ele olha — e o que estiver na frente ganha o olhar.
--
-- A `position` também posiciona as constelações no Mapa, então isto muda o
-- desenho do céu. É consequência esperada: o Mapa é o catálogo em outra forma,
-- e os dois contando ordens diferentes seria o defeito.
-- =============================================================================

update public.themes set position = 1 where slug = 'dados-e-tecnologia';
update public.themes set position = 2 where slug = 'inteligencia-artificial';
update public.themes set position = 3 where slug = 'lideranca-e-gestao';
update public.themes set position = 4 where slug = 'marketing';
update public.themes set position = 5 where slug = 'vendas';
update public.themes set position = 6 where slug = 'softskills';
update public.themes set position = 7 where slug = 'ferramentas';
update public.themes set position = 8 where slug = 'filosofia';
