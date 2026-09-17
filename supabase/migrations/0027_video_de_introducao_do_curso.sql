-- =============================================================================
-- 0027 — O curso ganha um vídeo de introdução.
--
-- A página do curso abria em parágrafo. Quem chega ali quer ver a cara da
-- coisa, não ler sobre ela — e um teaser de 60 segundos responde "isto é para
-- mim?" melhor que oito parágrafos de promessa.
--
-- Guarda só o id do asset no provedor, como as aulas fazem. O ticket de
-- reprodução continua sendo assinado no servidor a cada visita (D-17): id de
-- asset não abre nada sozinho.
--
-- Opcional, como tudo que entrou em 0026: sem vídeo, o herói da página cai
-- para a arte de capa com o botão de começar por cima — que já é melhor que
-- texto.
-- =============================================================================

alter table public.courses
  add column if not exists intro_video_asset_id text,
  add column if not exists intro_video_provider text;

comment on column public.courses.intro_video_asset_id is
  'Teaser do curso no provedor de vídeo. Nulo = o herói usa a arte de capa.';
