-- =============================================================================
-- 0039 — O banner ganha uma arte para cada tema.
--
-- Tudo o que o tema claro precisou até aqui foi resolvido com token: a cor
-- muda, o desenho não. Com o banner isso não funciona — ele é FOTOGRAFIA, e
-- uma arte pensada para fundo escuro fica suja sobre fundo claro. Não há
-- variável que conserte uma imagem.
--
-- Então são dois arquivos, e a escolha é do CSS: as duas ficam no HTML e o
-- tema mostra a certa. Sem JavaScript, sem piscar a arte errada depois da
-- hidratação — o mesmo caminho da marca, pelo mesmo motivo.
--
-- `image_url` continua sendo a do escuro, que é o padrão da casa. A nova é a
-- exceção, e por isso nasce nula: sem ela, o tema claro usa a mesma arte do
-- escuro — pior que ter as duas, melhor que não ter banner.
-- =============================================================================

alter table public.home_banners
  add column if not exists image_url_light text;

comment on column public.home_banners.image_url is
  'A arte do tema escuro, que é o padrão. Nula = o banner não aparece.';

comment on column public.home_banners.image_url_light is
  'A arte do tema claro. Nula = o tema claro reaproveita a do escuro.';
