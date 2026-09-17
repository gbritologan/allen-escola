-- =============================================================================
-- 0029 — A anotação ganha marca de tempo, e deixa de ser uma por aula.
--
-- Em 0021 a anotação era UMA por aula por pessoa, com a chave primária em
-- (user_id, lesson_id). O gesto previsto era "reabrir e reescrever".
--
-- O gesto real é outro. Quem assiste anota VÁRIAS vezes, em momentos
-- diferentes, e o valor de cada nota está preso ao ponto do vídeo em que ela
-- foi feita. Uma nota sem o minuto é uma frase solta; com o minuto, ela vira
-- um atalho de volta ao instante exato.
--
-- SEGURO PORQUE ESTÁ VAZIA: zero linhas hoje (conferido antes). Com dados,
-- isto teria que ser uma tabela nova e uma migração de conteúdo.
--
-- `at_seconds` é NULO quando a nota não nasceu do player — a pessoa pode
-- anotar sobre a aula inteira, e forçar um segundo ali seria inventar um dado.
-- =============================================================================

drop table if exists public.lesson_notes cascade;

create table public.lesson_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  lesson_id   uuid not null references public.lessons (id) on delete cascade,
  body        text not null,
  at_seconds  integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint lesson_notes_body_nao_vazio check (length(btrim(body)) > 0)
);

create index lesson_notes_por_pessoa_idx
  on public.lesson_notes (user_id, created_at desc);

create index lesson_notes_por_aula_idx
  on public.lesson_notes (user_id, lesson_id, at_seconds);

create trigger lesson_notes_set_updated_at
  before update on public.lesson_notes
  for each row execute function public.set_updated_at();

alter table public.lesson_notes enable row level security;

create policy "aluno lê as próprias anotações"
  on public.lesson_notes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "aluno escreve as próprias anotações"
  on public.lesson_notes for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "aluno edita as próprias anotações"
  on public.lesson_notes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "aluno apaga as próprias anotações"
  on public.lesson_notes for delete to authenticated
  using (user_id = (select auth.uid()));
