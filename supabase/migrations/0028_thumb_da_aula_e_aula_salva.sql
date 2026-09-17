-- =============================================================================
-- 0028 — Miniatura própria da aula, e aula salva.
--
-- MINIATURA. O catálogo do curso usa a thumbnail que o provedor gera sozinho,
-- e ela falha de dois jeitos: o vídeo ainda está processando (não existe
-- imagem), ou o frame automático caiu num quadro preto. O resultado na tela é
-- um ícone de imagem quebrada — foi o que o Gabriel viu.
--
-- `thumbnail_url` é a saída manual: uma arte enviada por quem publica, que
-- vence a automática quando existe. Nula = usa a do provedor, que na maioria
-- das vezes serve.
--
-- AULA SALVA. `saved_at` numa tabela própria e não uma coluna em
-- `lesson_progress`: salvar é um gesto da PESSOA sobre a aula, e progresso é
-- um fato sobre o que ela assistiu. Misturar os dois faria "limpar progresso"
-- apagar a lista de salvos.
-- =============================================================================

alter table public.lessons
  add column if not exists thumbnail_url text;

comment on column public.lessons.thumbnail_url is
  'Miniatura enviada à mão. Vence a do provedor. Nula = usa a automática.';

create table if not exists public.saved_lessons (
  user_id    uuid not null references auth.users (id) on delete cascade,
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists saved_lessons_por_pessoa_idx
  on public.saved_lessons (user_id, saved_at desc);

alter table public.saved_lessons enable row level security;

create policy "aluno lê os próprios salvos"
  on public.saved_lessons for select to authenticated
  using (user_id = (select auth.uid()));

create policy "aluno salva para si"
  on public.saved_lessons for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "aluno remove o próprio salvo"
  on public.saved_lessons for delete to authenticated
  using (user_id = (select auth.uid()));
