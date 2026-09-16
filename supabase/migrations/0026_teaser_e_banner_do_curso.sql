-- =============================================================================
-- 0026 — A página do curso ganha teaser e banner próprio.
--
-- Os dois são OPCIONAIS, e isso é requisito, não descuido: curso publicado não
-- espera arte nem copy. Sem banner, a página abre pelo título, como hoje; sem
-- pontos de aprendizado, a seção simplesmente não existe. Nenhum dos dois
-- produz moldura vazia esperando ser preenchida.
--
-- `learning_points` é text[] e não um bloco de texto: a promessa do curso é
-- uma LISTA, e lista em campo livre vira parágrafo com travessão, que ninguém
-- varre com o olho. O array também deixa a interface numerar, cortar e
-- reordenar sem interpretar pontuação.
-- =============================================================================

alter table public.courses
  add column if not exists banner_url text,
  add column if not exists learning_points text[] not null default '{}';

comment on column public.courses.banner_url is
  'Arte larga do topo da página do curso (4:1, 1440x360). Nula = página abre pelo título.';

comment on column public.courses.learning_points is
  'O que a pessoa sai sabendo. Um item por promessa. Vazio = a seção não aparece.';
