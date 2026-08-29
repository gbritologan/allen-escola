-- ============================================================================
-- 0018 — NOME E TELEFONE
--
-- A condição é combinada antes de a conta existir, e junto com ela vem o que
-- se sabe da pessoa: nome completo e telefone. Sem lugar para guardar, a lista
-- de alunos nasceria como uma coluna de e-mails e o telefone ficaria numa
-- planilha fora do produto — que é onde dado de cliente vai para morrer.
--
-- `phone` em `profiles` porque é dado da PESSOA. `full_name` em
-- `access_grants` porque é o que o gatilho precisa em mãos no instante em que
-- o perfil nasce.
-- ============================================================================

alter table public.profiles add column phone text;
comment on column public.profiles.phone is 'Contato. Formato livre: veio de lista, não de formulário validado.';

alter table public.access_grants add column full_name text;
alter table public.access_grants add column phone text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.access_grants%rowtype;
begin
  select * into g from public.access_grants where email = lower(new.email);

  insert into public.profiles (id, full_name, avatar_url, email, phone, last_sign_in_at)
  values (
    new.id,
    -- O nome do convite ganha do da condição, porque é mais recente; a
    -- condição entra quando o convite não trouxe nada.
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), g.full_name),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    new.email,
    g.phone,
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        phone = coalesce(public.profiles.phone, excluded.phone);

  if g.email is not null then
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
