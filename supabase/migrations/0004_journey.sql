-- =============================================================================
-- 0004 — Jornada: progresso, matrícula e APLICAÇÕES.
-- =============================================================================

-- --- Progresso de aula -------------------------------------------------------
--
-- A linha só existe depois que o aluno começa. Ausência = não iniciada.
create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  state public.lesson_state not null default 'in_progress',
  -- O segundo exato onde parou. É isto que faz "continuar" parecer mágica.
  position_seconds integer not null default 0,
  watched_seconds integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create trigger lesson_progress_set_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- --- Matrícula (D-06) --------------------------------------------------------
--
-- Tabela DERIVADA, mantida por trigger. Existe por um motivo só: "Continue de
-- onde parou" é a primeira coisa que carrega em toda sessão, e precisa ser uma
-- query indexada — não um agregado sobre todo o histórico de aulas.
create table public.enrollments (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_lesson_id uuid references public.lessons (id) on delete set null,
  last_seen_at timestamptz not null default now(),
  completed_lessons integer not null default 0,
  total_lessons integer not null default 0,
  progress_percent smallint not null default 0,
  completed_at timestamptz,
  primary key (user_id, course_id)
);

-- O índice que serve o card mais importante do produto.
create index enrollments_continue_idx
  on public.enrollments (user_id, last_seen_at desc)
  where completed_at is null;

comment on table public.enrollments is
  'Derivada de lesson_progress. Não escrever direto — o trigger é a fonte.';

-- --- Aplicações (D-07) -------------------------------------------------------
--
-- A unidade de valor da Allen. Entidade própria, não um booleano em outra
-- tabela: a tese do produto é que aplicação vale mais que consumo, e o que
-- vale mais precisa existir no schema.
--
-- Presença da linha = aplicada. Desmarcar apaga a linha.
create table public.applications (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  note text,

  -- Reservado para EVIDÊNCIA (briefing §12). Nulo em todo o MVP.
  -- PARA FAZER → EVIDÊNCIA → RESULTADO entra por aqui, sem migração destrutiva.
  evidence_type text check (evidence_type in ('file', 'link', 'text', 'checklist')),
  evidence jsonb,

  primary key (user_id, lesson_id)
);

create index applications_user_idx on public.applications (user_id, completed_at desc);
create index applications_lesson_idx on public.applications (lesson_id);

-- --- Sincronização da matrícula ----------------------------------------------
--
-- SECURITY DEFINER de propósito: a matrícula é derivada e o aluno não escreve
-- nela. Assim a RLS pode negar escrita direta sem impedir o trigger.
create or replace function public.sync_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course_id uuid;
  v_total integer;
  v_done integer;
  v_percent smallint;
begin
  select l.course_id into v_course_id
    from public.lessons l
   where l.id = new.lesson_id;

  if v_course_id is null then
    return null;
  end if;

  select count(*) into v_total
    from public.lessons l
    join public.modules m on m.id = l.module_id
   where l.course_id = v_course_id
     and l.status = 'published'
     and m.status = 'published';

  select count(*) into v_done
    from public.lesson_progress lp
    join public.lessons l on l.id = lp.lesson_id
    join public.modules m on m.id = l.module_id
   where lp.user_id = new.user_id
     and l.course_id = v_course_id
     and lp.state = 'completed'
     and l.status = 'published'
     and m.status = 'published';

  v_percent := case when v_total > 0
                    then least(100, round(v_done::numeric * 100 / v_total))::smallint
                    else 0 end;

  insert into public.enrollments as e (
    user_id, course_id, last_lesson_id, last_seen_at,
    completed_lessons, total_lessons, progress_percent, completed_at
  )
  values (
    new.user_id, v_course_id, new.lesson_id, now(),
    v_done, v_total, v_percent,
    case when v_total > 0 and v_done >= v_total then now() else null end
  )
  on conflict (user_id, course_id) do update
    set last_lesson_id    = excluded.last_lesson_id,
        last_seen_at      = excluded.last_seen_at,
        completed_lessons = excluded.completed_lessons,
        total_lessons     = excluded.total_lessons,
        progress_percent  = excluded.progress_percent,
        -- Concluir uma vez basta. Republicar uma aula nova depois não apaga
        -- a conquista de quem já terminou o curso.
        completed_at      = coalesce(e.completed_at, excluded.completed_at);

  return null;
end;
$$;

create trigger lesson_progress_sync_enrollment
  after insert or update on public.lesson_progress
  for each row execute function public.sync_enrollment();

-- Marcar a aula como concluída também carimba `completed_at` na própria linha.
create or replace function public.stamp_lesson_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.state = 'completed'::public.lesson_state and new.completed_at is null then
    new.completed_at := now();
  elsif new.state = 'in_progress'::public.lesson_state then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger lesson_progress_stamp_completion
  before insert or update on public.lesson_progress
  for each row execute function public.stamp_lesson_completion();
