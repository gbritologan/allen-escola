-- ============================================================================
-- 0021 — ANOTAÇÕES E AVALIAÇÃO DA AULA
--
-- A tela de aula ganha a coluna da direita com abas Anotações · Aulas ·
-- Materiais, no desenho da referência. "Aulas" e "Materiais" já existiam;
-- estas duas tabelas são o que faltava.
--
-- UMA anotação por aula por pessoa, não um histórico. O gesto é "escrever o
-- que eu não quero esquecer desta aula", e ele é reaberto e reescrito — não
-- acumulado. Chave composta em vez de id próprio: a unicidade vira ESTRUTURA,
-- não uma regra que alguém precisa lembrar de aplicar.
--
-- A avaliação é separada do progresso de propósito. `lesson_progress` é o que
-- a PESSOA FEZ; isto é o que ela ACHOU. Misturar faria a régua de progresso
-- depender de opinião.
-- ============================================================================

create table public.lesson_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create trigger lesson_notes_set_updated_at
  before update on public.lesson_notes
  for each row execute function public.set_updated_at();

alter table public.lesson_notes enable row level security;

-- A anotação é privada. Nem a equipe lê: é o caderno da pessoa, e a Allen
-- promete isso na página de privacidade.
create policy "anotação própria é legível"
  on public.lesson_notes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "escreve a própria anotação"
  on public.lesson_notes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "edita a própria anotação"
  on public.lesson_notes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "apaga a própria anotação"
  on public.lesson_notes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- --- Avaliação ---------------------------------------------------------------

create table public.lesson_ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index lesson_ratings_por_aula_idx on public.lesson_ratings (lesson_id);

create trigger lesson_ratings_set_updated_at
  before update on public.lesson_ratings
  for each row execute function public.set_updated_at();

alter table public.lesson_ratings enable row level security;

-- A nota própria a pessoa vê e troca. A equipe lê TODAS, porque avaliação sem
-- quem leia é pergunta feita no vazio.
create policy "avaliação própria e da equipe é legível"
  on public.lesson_ratings for select to authenticated
  using ((select auth.uid()) = user_id or public.is_staff());

create policy "dá a própria nota"
  on public.lesson_ratings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "troca a própria nota"
  on public.lesson_ratings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
