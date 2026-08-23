-- =============================================================================
-- 0003 — Catálogo: TEMA → CURSO → MÓDULO → AULA
-- =============================================================================

-- --- Temas -------------------------------------------------------------------
--
-- Tema é dado, nunca código (D-04). A plataforma tem que continuar funcionando
-- com 5, 10 ou 50 temas sem tocar em nada.
create table public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  -- Acento opcional. Identifica o tema; não substitui o azul da Allen.
  accent text,
  position integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index themes_order_idx on public.themes (position, name);

create trigger themes_set_updated_at
  before update on public.themes
  for each row execute function public.set_updated_at();

-- --- Instrutores -------------------------------------------------------------

create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  headline text,
  bio text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger instructors_set_updated_at
  before update on public.instructors
  for each row execute function public.set_updated_at();

-- --- Cursos ------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  -- Uma linha. É o que aparece no card.
  summary text,
  description text,
  cover_url text,
  format public.course_format not null default 'course',
  instructor_id uuid references public.instructors (id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz,

  -- Rollups mantidos por trigger. A leitura nunca agrega (mesma razão de D-06).
  duration_seconds integer not null default 0,
  lesson_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_doc tsvector generated always as (
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(summary, ''))), 'B') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(description, ''))), 'C')
  ) stored
);

create index courses_published_idx on public.courses (published_at desc) where status = 'published';
create index courses_format_idx on public.courses (format) where status = 'published';
create index courses_search_idx on public.courses using gin (search_doc);

create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- --- Curso ↔ Tema (N:N, com posição por tema) --------------------------------
--
-- Um curso pode ser o 1º de "Vendas" e o 7º de "IA". Um `theme_id` dentro de
-- courses não conseguiria dizer isso.
create table public.course_themes (
  course_id uuid not null references public.courses (id) on delete cascade,
  theme_id uuid not null references public.themes (id) on delete cascade,
  position integer not null default 0,
  primary key (course_id, theme_id)
);

create index course_themes_by_theme_idx on public.course_themes (theme_id, position);

-- --- Módulos -----------------------------------------------------------------

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  summary text,
  position integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index modules_course_idx on public.modules (course_id, position);

create trigger modules_set_updated_at
  before update on public.modules
  for each row execute function public.set_updated_at();

-- --- Aulas -------------------------------------------------------------------

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,

  -- D-20: `course_id` denormalizado, mantido por trigger.
  -- A rota /curso/[slug]/[aula] é o caminho mais quente do produto; resolvê-la
  -- com um JOIN por módulo em toda navegação é custo que não precisa existir.
  course_id uuid not null references public.courses (id) on delete cascade,

  slug text not null,
  title text not null,
  description text,
  position integer not null default 0,
  status public.content_status not null default 'draft',

  -- O vídeo mora no provedor; aqui fica só a referência (D-17).
  video_provider text check (video_provider in ('bunny', 'mux')),
  video_asset_id text,
  duration_seconds integer not null default 0,

  -- O par que define a Allen. Nomes em português de propósito: não são campos
  -- genéricos, são o vocabulário do produto.
  para_saber text,
  para_fazer text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_doc tsvector generated always as (
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(description, ''))), 'B') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(para_saber, ''))), 'C') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(para_fazer, ''))), 'C')
  ) stored,

  unique (course_id, slug)
);

create index lessons_module_idx on public.lessons (module_id, position);
create index lessons_course_idx on public.lessons (course_id, position);
create index lessons_search_idx on public.lessons using gin (search_doc);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- Mantém `lessons.course_id` sempre coerente com o módulo. O Content Studio
-- nunca precisa saber que essa coluna existe.
create or replace function public.sync_lesson_course()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select m.course_id into new.course_id
    from public.modules m
   where m.id = new.module_id;

  if new.course_id is null then
    raise exception 'Módulo % não existe.', new.module_id;
  end if;

  return new;
end;
$$;

create trigger lessons_sync_course
  before insert or update of module_id on public.lessons
  for each row execute function public.sync_lesson_course();

-- --- Materiais ---------------------------------------------------------------

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  kind public.material_kind not null default 'file',
  title text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  -- Material pertence a uma aula OU a um curso. Nunca aos dois, nunca a nada.
  constraint materials_single_owner check (
    (lesson_id is not null and course_id is null) or
    (lesson_id is null and course_id is not null)
  )
);

create index materials_lesson_idx on public.materials (lesson_id, position);
create index materials_course_idx on public.materials (course_id, position);

-- --- Rollup do curso ---------------------------------------------------------

create or replace function public.refresh_course_rollup(p_course_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.courses c
     set duration_seconds = coalesce(agg.total_seconds, 0),
         lesson_count = coalesce(agg.total_lessons, 0)
    from (
      select coalesce(sum(l.duration_seconds), 0) as total_seconds,
             count(*) as total_lessons
        from public.lessons l
        join public.modules m on m.id = l.module_id
       where l.course_id = p_course_id
         and l.status = 'published'
         and m.status = 'published'
    ) agg
   where c.id = p_course_id;
$$;

create or replace function public.on_lesson_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.course_id is not null then
    perform public.refresh_course_rollup(old.course_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.course_id is not null then
    perform public.refresh_course_rollup(new.course_id);
  end if;

  return null;
end;
$$;

create trigger lessons_refresh_rollup
  after insert or update or delete on public.lessons
  for each row execute function public.on_lesson_change();

-- Publicar/despublicar um módulo muda a contagem do curso inteiro.
create or replace function public.on_module_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_course_rollup(coalesce(new.course_id, old.course_id));
  return null;
end;
$$;

create trigger modules_refresh_rollup
  after insert or update or delete on public.modules
  for each row execute function public.on_module_change();
