-- =============================================================================
-- 0005 — Camada de Skills: grava desde o dia um, sem nenhuma interface (D-08).
--
-- Este é o item de arquitetura mais barato e mais valioso do projeto.
-- Append-only, escrito por trigger, sem custo perceptível, sem UI.
-- No dia em que o Skill Engine ligar, ele encontra meses de comportamento real
-- em vez de uma base vazia. Passado não se cria retroativamente.
-- =============================================================================

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Que habilidades uma aula desenvolve, e com que peso.
-- Mapeado no Content Studio pela equipe — é a única entrada humana da camada.
create table public.lesson_skills (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  weight numeric(4, 2) not null default 1.00 check (weight > 0 and weight <= 10),
  primary key (lesson_id, skill_id)
);

create index lesson_skills_by_skill_idx on public.lesson_skills (skill_id);

-- --- Sinais (append-only) ----------------------------------------------------

create table public.skill_signals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  kind public.signal_kind not null,
  value numeric(6, 2) not null default 1.00,
  -- De onde veio (aula, curso, avaliação). Mantém o sinal auditável.
  source_id uuid,
  created_at timestamptz not null default now()
);

create index skill_signals_user_idx on public.skill_signals (user_id, skill_id, created_at desc);

comment on table public.skill_signals is
  'Append-only. Nunca atualizar nem apagar: é o histórico que o Skill Engine vai ler.';

-- --- Score (snapshot recalculável) -------------------------------------------

create table public.skill_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  -- 0–100. Ferramenta de orientação, não medida científica.
  score smallint not null default 0 check (score between 0 and 100),
  -- Quanta evidência sustenta o número. Sem isso, o score mente.
  confidence numeric(3, 2) not null default 0.00 check (confidence between 0 and 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

comment on table public.skill_scores is
  'Derivado de skill_signals. Sem UI no MVP. Os sinais são a fonte de verdade.';

-- --- Emissão automática ------------------------------------------------------

create or replace function public.emit_lesson_signals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.state <> 'completed'::public.lesson_state then
    return null;
  end if;

  -- Só na transição para concluída. Reassistir não gera sinal novo.
  if tg_op = 'UPDATE' and old.state = 'completed'::public.lesson_state then
    return null;
  end if;

  insert into public.skill_signals (user_id, skill_id, kind, value, source_id)
  select new.user_id, ls.skill_id, 'lesson_completed'::public.signal_kind, ls.weight, new.lesson_id
    from public.lesson_skills ls
   where ls.lesson_id = new.lesson_id;

  return null;
end;
$$;

create trigger lesson_progress_emit_signals
  after insert or update on public.lesson_progress
  for each row execute function public.emit_lesson_signals();

-- A tese do produto, escrita no peso: aplicar vale o dobro de assistir.
create or replace function public.emit_application_signals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.skill_signals (user_id, skill_id, kind, value, source_id)
  select new.user_id, ls.skill_id, 'application_completed'::public.signal_kind,
         ls.weight * 2, new.lesson_id
    from public.lesson_skills ls
   where ls.lesson_id = new.lesson_id;

  return null;
end;
$$;

create trigger applications_emit_signals
  after insert on public.applications
  for each row execute function public.emit_application_signals();
