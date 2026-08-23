-- =============================================================================
-- 0002 — Identidade: perfil, papel e o portão de acesso.
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'student',
  -- Primeiro acesso é curto e pulável. Esta coluna só registra que passou.
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

comment on column public.profiles.role is
  'Fonte de verdade do papel. Espelhado no JWT pelo custom_access_token_hook (D-09).';

-- --- Assinatura --------------------------------------------------------------
--
-- Sem cobrança neste ciclo (briefing §36). A tabela existe para que o portão
-- de acesso nasça no lugar certo e ligar billing depois seja uma mudança
-- pontual, não uma auditoria de todas as políticas.
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status public.subscription_status not null default 'active',
  plan text not null default 'lancamento',
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- --- O portão de acesso (D-10) ----------------------------------------------
--
-- Um lugar só decide "esse usuário pode consumir conteúdo".
-- Definido aqui, e não em 0001, porque depende de public.subscriptions: uma
-- função SQL tem o corpo validado na criação, então a tabela precisa existir.
--
-- Hoje: qualquer conta com assinatura ativa entra — e o cadastro já cria uma
-- assinatura ativa (premissa de lançamento). Quando a cobrança existir, muda
-- aqui. Não em quarenta políticas.
create or replace function public.has_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() or exists (
    select 1
    from public.subscriptions s
    where s.user_id = (select auth.uid())
      and s.status = 'active'::public.subscription_status
      and (s.ends_at is null or s.ends_at > now())
  )
$$;

-- --- Cadastro ----------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do nothing;

  -- PREMISSA DE LANÇAMENTO: toda conta criada tem acesso.
  -- Para trocar por liberação manual, remova este insert — `has_access()`
  -- passa a negar por padrão e a equipe libera pelo Admin.
  insert into public.subscriptions (user_id, status, plan)
  values (new.id, 'active', 'lancamento')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- O papel entra no token (D-09) -------------------------------------------
--
-- ATENÇÃO — passo manual: este hook precisa ser ligado uma vez no painel do
-- Supabase em Authentication → Hooks → Custom Access Token, apontando para
-- `public.custom_access_token_hook`. Sem isso, todo mundo é 'student'.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  user_role text;
begin
  select p.role::text
    into user_role
    from public.profiles p
   where p.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if jsonb_typeof(claims -> 'app_metadata') <> 'object' then
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb);
  end if;

  claims := jsonb_set(
    claims,
    '{app_metadata,allen_role}',
    to_jsonb(coalesce(user_role, 'student'))
  );

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on table public.profiles to supabase_auth_admin;
