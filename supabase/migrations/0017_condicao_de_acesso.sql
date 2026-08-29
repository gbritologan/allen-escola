-- ============================================================================
-- 0017 — CONDIÇÃO DE ACESSO COMBINADA ANTES DA ENTRADA
--
-- A turma fundadora tem janela definida: 01/09/2026 a 01/09/2027. Mas o
-- cadastro (0009) dá a todo convidado uma assinatura 'lancamento' ATIVA E SEM
-- PRAZO. Convidar os 21 hoje daria acesso perpétuo a quem contratou um ano.
--
-- O problema de fundo: a condição é combinada ANTES de a pessoa existir. Ela
-- só vira linha em `auth.users` quando abre o e-mail e digita o código — o que
-- pode ser hoje, semana que vem, ou nunca. Não havia onde guardar "quando essa
-- pessoa entrar, o acesso dela é este".
--
-- `access_grants` é esse lugar: a combinação, indexada por E-MAIL, esperando
-- alguém aparecer.
-- ============================================================================

create table public.access_grants (
  -- E-mail em minúsculas é a chave: é o único identificador que existe antes
  -- de a conta existir.
  email text primary key check (email = lower(email)),

  plan text not null default 'fundador',
  starts_at timestamptz not null default now(),
  -- Nulo = sem prazo. Estado legítimo: equipe, cortesia.
  ends_at timestamptz,

  -- Por que essa pessoa tem essa condição. Daqui a um ano ninguém lembra, e a
  -- renovação vai depender de alguém lembrar.
  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger access_grants_set_updated_at
  before update on public.access_grants
  for each row execute function public.set_updated_at();

alter table public.access_grants enable row level security;

-- Só a equipe. A lista é dado comercial: quem entrou, quando vence.
create policy "equipe gere condições de acesso"
  on public.access_grants for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- --- O portão passa a respeitar o INÍCIO -------------------------------------
--
-- `has_access()` conferia só o fim. Uma condição que começa em 01/09 seria
-- válida em 28/08 — a data de início não valeria nada.
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
      and s.started_at <= now()
      and (s.ends_at is null or s.ends_at > now())
  )
$$;

-- --- O cadastro consulta a combinação ----------------------------------------
--
-- Sem condição registrada, o comportamento é o de antes: lançamento, ativo,
-- sem prazo. Deliberado — mudar o padrão para "sem acesso" trancaria por fora
-- todo convite feito sem lembrar de criar a condição antes. O padrão erra para
-- o lado de deixar entrar; a condição é que aperta.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.access_grants%rowtype;
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

  select * into g from public.access_grants where email = lower(new.email);

  if found then
    insert into public.subscriptions (user_id, status, plan, started_at, ends_at)
    values (new.id, 'active', g.plan, g.starts_at, g.ends_at)
    on conflict (user_id) do nothing;
  else
    insert into public.subscriptions (user_id, status, plan)
    values (new.id, 'active', 'lancamento')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;
