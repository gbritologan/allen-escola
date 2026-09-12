-- ============================================================================
-- 0024 — LIBERAÇÃO PROGRAMADA (por aluno, não por calendário)
--
-- Blindagem contra os 7 dias de arrependimento: quem paga entra na hora, mas
-- parte do conteúdo só abre alguns dias depois. Sem isso, alguém assina, baixa
-- tudo numa tarde e pede reembolso no sexto dia.
--
-- POR QUE NÃO É `available_at` (0019): aquele é DATA DE CALENDÁRIO, igual para
-- todo mundo, e serve para lançamento ("abre dia 15"). Este é PRAZO RELATIVO À
-- ENTRADA DE CADA ALUNO: quem assinou hoje libera em oito dias; quem assinar em
-- março libera oito dias depois de março.
--
-- Os dois convivem e se somam.
--
-- A TRAVA É NO BANCO, não na tela. Conteúdo escondido só na interface está
-- disponível para quem abre o inspetor — e o motivo desta mudança é justamente
-- impedir a raspagem antes do reembolso.
-- ============================================================================

alter table public.courses add column release_after_days integer
  check (release_after_days is null or release_after_days >= 0);
alter table public.lessons add column release_after_days integer
  check (release_after_days is null or release_after_days >= 0);

comment on column public.courses.release_after_days is
  'Dias após o início do acesso DO ALUNO para o curso abrir. Nulo = abre junto com o acesso.';
comment on column public.lessons.release_after_days is
  'Idem, por aula. Soma-se ao do curso: a aula precisa dos dois prazos cumpridos.';

create or replace function public.dias_de_acesso()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select greatest(0, floor(extract(epoch from (now() - s.started_at)) / 86400))::integer
      from public.subscriptions s
      where s.user_id = (select auth.uid())
    ),
    0
  )
$$;

-- Equipe passa direto: quem produz precisa ver o que ainda não abriu.
create or replace function public.ja_liberado(p_dias integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_dias is null
      or public.is_staff()
      or public.dias_de_acesso() >= p_dias
$$;

drop policy if exists "curso publicado é legível" on public.courses;
create policy "curso publicado é legível"
  on public.courses for select to authenticated
  using (
    public.is_staff() or (
      status = 'published'
      and public.has_course_access(courses.id)
      and public.ja_liberado(courses.release_after_days)
    )
  );

drop policy if exists "aula publicada é legível" on public.lessons;
create policy "aula publicada é legível"
  on public.lessons for select to authenticated
  using (
    public.is_staff() or (
      status = 'published'
      and public.has_course_access(lessons.course_id)
      and public.ja_liberado(lessons.release_after_days)
      and exists (
        select 1 from public.courses c
        where c.id = lessons.course_id
          and c.status = 'published'
          and public.ja_liberado(c.release_after_days)
      )
      and exists (
        select 1 from public.modules m
        where m.id = lessons.module_id and m.status = 'published'
      )
    )
  );
