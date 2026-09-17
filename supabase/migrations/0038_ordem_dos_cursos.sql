-- =============================================================================
-- 0038 — O curso ganha posição.
--
-- O catálogo ordenava por `published_at desc`: o último publicado aparecia
-- primeiro. É um padrão razoável para blog e errado para escola — a ordem em
-- que se gravou não é a ordem em que se quer que se aprenda, e ninguém deveria
-- ter que republicar um curso para movê-lo na lista.
--
-- `position` dá a caneta a quem monta o catálogo. Nasce semeada com a ordem
-- atual, para a primeira troca partir do que já está na tela em vez de
-- embaralhar tudo.
-- =============================================================================

alter table public.courses
  add column if not exists position integer not null default 0;

create index if not exists courses_por_posicao_idx
  on public.courses (position, published_at desc);

comment on column public.courses.position is
  'Ordem no catálogo. Menor primeiro. Empate desempata por published_at desc.';

with ordenados as (
  select id, row_number() over (order by published_at desc nulls last, created_at desc) as n
    from public.courses
)
update public.courses c
   set position = o.n
  from ordenados o
 where o.id = c.id;
