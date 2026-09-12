-- ============================================================================
-- 0022 — A LOGO DO APP
--
-- A aba Apps virou catálogo: a pessoa vê a LOGO, o teaser e o link que leva ao
-- app. A logo era o que faltava — `apps` tinha nome, tagline e access_url, e
-- nenhum lugar para a marca.
--
-- Coluna separada de qualquer noção de "capa", de propósito: logo NÃO é capa.
-- Capa é cartaz — tem proporção e pode ser cortada. Logo é marca: precisa
-- respirar, não pode ser cortada, e aparece pequena. Tratar as duas como a
-- mesma coisa é o caminho mais curto para uma logo esmagada dentro de um 16:9.
-- ============================================================================

alter table public.apps add column logo_url text;

comment on column public.apps.logo_url is
  'Marca do app. Quadrada, fundo transparente de preferência. Nula = o cartão usa a inicial do nome.';
