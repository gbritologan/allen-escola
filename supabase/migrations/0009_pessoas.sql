-- =============================================================================
-- 0009 — Pessoas: o Admin precisa enxergar quem é quem.
--
-- `profiles` guardava nome e papel, mas não o e-mail — ele mora em
-- `auth.users`, que o cliente do app não lê e não deve ler. Resultado: uma
-- tela de pessoas mostraria uma lista de nomes vazios e nada mais.
--
-- Duas colunas espelhadas de `auth.users`, mantidas por trigger:
--
--   email             — como a equipe identifica alguém. Sem isso não há tela.
--   last_sign_in_at   — separa "convidado e nunca entrou" de "está usando".
--                       É a diferença entre reenviar o convite e não mexer.
--
-- Espelhar em vez de consultar `auth.users` a cada leitura mantém a RLS de
-- `profiles` como o único portão, e evita expor o schema de auth ao PostgREST.
-- =============================================================================

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists last_sign_in_at timestamptz;

comment on column public.profiles.email is
  'Espelho de auth.users.email, mantido por trigger. Nunca escrever à mão.';
comment on column public.profiles.last_sign_in_at is
  'Espelho de auth.users.last_sign_in_at. NULL = convidado que nunca entrou.';

-- Backfill de quem já existe.
update public.profiles p
   set email = u.email,
       last_sign_in_at = u.last_sign_in_at
  from auth.users u
 where u.id = p.id
   and (p.email is distinct from u.email
        or p.last_sign_in_at is distinct from u.last_sign_in_at);

create index if not exists profiles_email_idx on public.profiles (lower(email));

-- --- Sincronização -----------------------------------------------------------

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set email = new.email,
         last_sign_in_at = new.last_sign_in_at
   where id = new.id;
  return null;
end;
$$;

revoke all on function public.sync_profile_from_auth() from public, anon, authenticated;

-- Cada login atualiza `auth.users.last_sign_in_at`, então este trigger é o que
-- mantém a coluna viva. Sem ele, "nunca entrou" ficaria verdadeiro para sempre.
drop trigger if exists on_auth_user_synced on auth.users;
create trigger on_auth_user_synced
  after update of email, last_sign_in_at on auth.users
  for each row execute function public.sync_profile_from_auth();

-- --- O e-mail entra já na criação --------------------------------------------
--
-- Reescreve `handle_new_user` de 0002 acrescentando o e-mail. O resto é
-- idêntico, incluindo a premissa de lançamento: toda conta criada nasce com
-- assinatura ativa. Quem controla quem entra é o convite no Admin — cadastro
-- aberto continua fechado em `entrar/actions.ts`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, last_sign_in_at)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    new.email,
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.subscriptions (user_id, status, plan)
  values (new.id, 'active', 'lancamento')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- --- Quem pode ver a lista ---------------------------------------------------
--
-- A política de leitura de `profiles` (0006) já diz `auth.uid() = id or
-- is_staff()`. Continua valendo: conteudista vê a lista, mas só admin muda
-- papel e assinatura — e isso já está nas políticas de 0006. Nada a alterar.
