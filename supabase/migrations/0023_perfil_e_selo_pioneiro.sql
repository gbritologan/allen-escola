-- ============================================================================
-- 0023 — O PERFIL GANHA ROSTO, CONTEXTO E SELO
--
-- Três coisas de naturezas diferentes:
--
--   FOTO       — `avatar_url` existe em `profiles` desde 0002 e nunca teve como
--                ser preenchida. Mesmo caso da capa de curso: campo lido em
--                vários lugares, sem nenhum caminho de escrita.
--   EMPRESÁRIO — declaração da pessoa sobre si. Opcional, e o site também.
--   PIONEIRO   — NÃO é declaração: é fato comercial, decidido por QUANDO a
--                pessoa comprou. Por isso não é editável no perfil.
--
-- O selo mora em `access_grants` e desce para `profiles` no cadastro, junto com
-- o resto da condição: o fato viaja com a combinação, em vez de depender de
-- alguém marcar a caixa certa depois.
-- ============================================================================

alter table public.profiles add column is_business boolean;
alter table public.profiles add column company_url text;
alter table public.profiles add column pioneer boolean not null default false;

comment on column public.profiles.is_business is
  'A pessoa se declarou empresária. Nulo = ainda não respondeu (≠ respondeu "não").';
comment on column public.profiles.pioneer is
  'Comprou no período pioneiro. Fato comercial: vem da condição de acesso, não editável pelo aluno.';

alter table public.access_grants add column pioneer boolean not null default false;

-- A turma fundadora É a turma pioneira.
update public.access_grants set pioneer = true where plan = 'fundador';

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

  insert into public.profiles (id, full_name, avatar_url, email, phone, pioneer, last_sign_in_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), g.full_name),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    new.email,
    g.phone,
    coalesce(g.pioneer, false),
    new.last_sign_in_at
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        phone = coalesce(public.profiles.phone, excluded.phone),
        -- Selo não se perde num segundo login.
        pioneer = public.profiles.pioneer or excluded.pioneer;

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

-- --- O aluno sobe a própria foto ----------------------------------------------
--
-- O bucket `imagens` (0019) só aceitava escrita da equipe, e foi assim de
-- propósito ("abrir escrita para depois é como bucket vira lixão"). Agora há um
-- motivo real, e ele é estreito: a pasta `avatares/`, e só ela.
create policy "aluno envia o próprio retrato"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'avatares'
  );

create policy "aluno troca o próprio retrato"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'avatares'
    and owner = (select auth.uid())
  )
  with check (
    bucket_id = 'imagens'
    and (storage.foldername(name))[1] = 'avatares'
  );
