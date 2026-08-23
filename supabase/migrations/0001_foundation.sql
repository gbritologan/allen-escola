-- =============================================================================
-- 0001 — Fundação: extensões, enums e as funções que a RLS inteira usa.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- --- Enums -------------------------------------------------------------------

-- 'org_manager' existe mas não é atribuível hoje. Declarar o papel custa nada;
-- descobrir que o enum não comporta B2B custa uma migração no pior momento.
create type public.app_role as enum ('admin', 'editor', 'student', 'org_manager');

create type public.content_status as enum ('draft', 'published', 'archived');

-- D-03: formato editorial, não booleano `is_masterclass`.
create type public.course_format as enum ('course', 'masterclass');

create type public.lesson_state as enum ('in_progress', 'completed');
create type public.material_kind as enum ('file', 'link', 'template');
create type public.subscription_status as enum ('active', 'past_due', 'canceled');

create type public.signal_kind as enum (
  'lesson_completed',
  'application_completed',
  'course_completed',
  'assessment'
);

-- --- Busca em português ------------------------------------------------------

-- `unaccent` não é imutável por padrão, e coluna gerada exige imutabilidade.
-- Este wrapper é o caminho documentado para contornar isso: fixamos o
-- dicionário, então o resultado é de fato determinístico.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent', $1)
$$;

-- --- Identidade em tempo de política ----------------------------------------

-- D-09: o papel vem do JWT, não de um SELECT em profiles.
-- Um JOIN por linha em toda leitura é exatamente o que essa função evita.
create or replace function public.auth_role()
returns public.app_role
language sql
stable
set search_path = ''
as $$
  select case auth.jwt() -> 'app_metadata' ->> 'allen_role'
    when 'admin' then 'admin'::public.app_role
    when 'editor' then 'editor'::public.app_role
    when 'org_manager' then 'org_manager'::public.app_role
    else 'student'::public.app_role
  end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.auth_role() = 'admin'::public.app_role
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.auth_role() in ('admin'::public.app_role, 'editor'::public.app_role)
$$;

-- --- Utilidades --------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
