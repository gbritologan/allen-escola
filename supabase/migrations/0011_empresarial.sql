-- =============================================================================
-- 0011 — Plano empresarial: o time, as vagas, e o progresso de quem trabalha
--        para você.
--
-- Até aqui a assinatura era estritamente pessoal: uma linha em `subscriptions`
-- por usuário, e `has_access()` olhava só para a linha dele. O plano
-- empresarial quebra isso — quem paga é uma pessoa, e quem estuda são três.
--
-- Três decisões:
--
--   1. QUEM PAGA NÃO É QUEM ESTUDA. `has_access()` passa a aceitar dois
--      caminhos: assinatura própria ativa, OU pertencer a um time cujo dono
--      está em dia. Cancelou o empresarial, o time inteiro perde acesso no
--      mesmo instante — que é o comportamento correto e o único que não vira
--      brecha.
--
--   2. VAGA É LIMITE DE VERDADE, NÃO AVISO NA TELA. O limite mora num trigger.
--      Esconder o botão de convidar quando as vagas acabam é conveniência; o
--      que impede a quarta pessoa de entrar é o Postgres.
--
--   3. O DONO VÊ O PROGRESSO DE QUEM ELE COLOCOU — e só isso. Nada de nota,
--      nada de tempo de tela, nada de vigilância. Ele vê o que a plataforma
--      inteira já mede: aula concluída e, principalmente, aplicação feita.
--      Um gestor que só enxerga "assistiu 80%" cobra a coisa errada.
-- =============================================================================

-- --- Vagas fazem parte do plano ----------------------------------------------
--
-- 1 = individual. Acima disso, o plano cria um time na hora do pagamento.
alter table public.plans
  add column if not exists seats integer not null default 1 check (seats >= 1);

comment on column public.plans.seats is
  'Quantas pessoas o plano comporta, contando quem assina. 1 = individual.';

-- --- Preços reais ------------------------------------------------------------
--
-- Os valores de lançamento entram aqui, e daqui em diante mudam pelo Admin,
-- sem deploy (D-04).
update public.plans set active = false where slug in ('mensal', 'anual');

insert into public.plans (slug, name, tagline, interval, price_cents, seats, highlight, position)
values
  ('individual', 'Individual', 'Para você.', 'month', 9000, 1, false, 1),
  ('empresarial', 'Empresarial', 'Para você e mais duas pessoas do seu time.', 'month', 21000, 3, true, 2)
on conflict (slug) do update
  set price_cents = excluded.price_cents,
      seats       = excluded.seats,
      name        = excluded.name,
      tagline     = excluded.tagline,
      interval    = excluded.interval,
      highlight   = excluded.highlight,
      position    = excluded.position,
      active      = true;

-- --- O time ------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Congelado do plano na hora da compra. Se o plano mudar de 3 para 5 vagas,
  -- quem já assinou não muda junto sem alguém decidir.
  seats integer not null default 3 check (seats >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organizations_owner_idx on public.organizations (owner_id);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- Uma pessoa em um time só. Estar em dois times significaria dois donos vendo
-- o progresso dela, e nenhum dos dois sabendo do outro.
create table public.organization_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- O dono também é membro: ele estuda junto. Por isso ele ocupa uma vaga.
  is_owner boolean not null default false,
  added_at timestamptz not null default now()
);

create index organization_members_org_idx on public.organization_members (org_id);

-- --- A vaga é limite, e o limite é do banco ----------------------------------

create or replace function public.checar_vagas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seats integer;
  v_usadas integer;
begin
  select o.seats into v_seats from public.organizations o where o.id = new.org_id;

  select count(*) into v_usadas
    from public.organization_members m
   where m.org_id = new.org_id;

  if v_usadas >= v_seats then
    raise exception 'Este plano tem % vagas, e todas estão ocupadas.', v_seats
      using hint = 'Remova alguém do time antes de adicionar outra pessoa.';
  end if;

  return new;
end;
$$;

create trigger organization_members_checar_vagas
  before insert on public.organization_members
  for each row execute function public.checar_vagas();

revoke all on function public.checar_vagas() from public, anon, authenticated;

-- =============================================================================
-- O portão passa a ter dois caminhos
-- =============================================================================
--
-- Substitui a versão de 0002. Quem tem assinatura própria entra como sempre;
-- quem está num time entra pela assinatura do dono.
create or replace function public.has_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff()
     or exists (
          select 1
            from public.subscriptions s
           where s.user_id = (select auth.uid())
             and s.status = 'active'::public.subscription_status
             and (s.ends_at is null or s.ends_at > now())
        )
     or exists (
          select 1
            from public.organization_members m
            join public.organizations o on o.id = m.org_id
            join public.subscriptions s on s.user_id = o.owner_id
           where m.user_id = (select auth.uid())
             and s.status = 'active'::public.subscription_status
             and (s.ends_at is null or s.ends_at > now())
        )
$$;

-- --- Quem eu gerencio --------------------------------------------------------
--
-- Verdadeiro quando quem está lendo é dono do time onde a pessoa está. É o que
-- autoriza o gestor a ver o progresso do time — e nada além dele.
create or replace function public.gerencia(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.organization_members m
      join public.organizations o on o.id = m.org_id
     where m.user_id = p_user_id
       and o.owner_id = (select auth.uid())
  );
$$;

revoke execute on function public.gerencia(uuid) from public, anon;
grant execute on function public.gerencia(uuid) to authenticated;

-- =============================================================================
-- O que o gestor enxerga
-- =============================================================================
--
-- Só leitura, e só o que já existe: aula concluída e aplicação feita. Ele não
-- escreve nada na jornada de ninguém.

drop policy if exists "progresso próprio é legível" on public.lesson_progress;
create policy "progresso próprio é legível"
  on public.lesson_progress for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_admin()
    or public.gerencia(lesson_progress.user_id)
  );

drop policy if exists "matrícula própria é legível" on public.enrollments;
create policy "matrícula própria é legível"
  on public.enrollments for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_admin()
    or public.gerencia(enrollments.user_id)
  );

drop policy if exists "aplicação própria é legível" on public.applications;
create policy "aplicação própria é legível"
  on public.applications for select to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_admin()
    or public.gerencia(applications.user_id)
  );

-- O gestor precisa ver o nome e o e-mail de quem ele colocou no time.
drop policy if exists "perfil próprio e da equipe é legível" on public.profiles;
create policy "perfil próprio e da equipe é legível"
  on public.profiles for select to authenticated
  using (
    (select auth.uid()) = id
    or public.is_staff()
    or public.gerencia(profiles.id)
  );

-- --- RLS dos times -----------------------------------------------------------

alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;

create policy "time próprio é legível"
  on public.organizations for select to authenticated
  using (
    owner_id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.organization_members m
       where m.org_id = organizations.id and m.user_id = (select auth.uid())
    )
  );

-- O dono renomeia o time. Não mexe em vagas: vaga vem do plano pago.
create policy "dono renomeia o time"
  on public.organizations for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy "membros do time são legíveis"
  on public.organization_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.organizations o
       where o.id = organization_members.org_id and o.owner_id = (select auth.uid())
    )
  );

create policy "dono adiciona ao time"
  on public.organization_members for insert to authenticated
  with check (
    exists (
      select 1 from public.organizations o
       where o.id = organization_members.org_id and o.owner_id = (select auth.uid())
    )
    or public.is_admin()
  );

-- Tirar do time é tirar o acesso. Só o dono, e nunca ele mesmo — sair do
-- próprio time deixaria o time sem dono e as vagas presas.
create policy "dono remove do time"
  on public.organization_members for delete to authenticated
  using (
    not is_owner
    and (
      exists (
        select 1 from public.organizations o
         where o.id = organization_members.org_id and o.owner_id = (select auth.uid())
      )
      or public.is_admin()
    )
  );

-- =============================================================================
-- Pagou empresarial → o time nasce
-- =============================================================================
--
-- Estende `conceder_apos_pagamento` de 0010. A criação do time acontece no
-- mesmo lugar que a liberação do acesso, e pela mesma razão: uma liberação
-- manual feita pelo Admin precisa produzir exatamente o mesmo resultado que um
-- pagamento aprovado pelo Asaas.
create or replace function public.conceder_apos_pagamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seats integer;
  v_org uuid;
  v_nome text;
begin
  if new.status <> 'paid'::public.order_status then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'paid'::public.order_status then
    return null;
  end if;

  if new.kind = 'course'::public.order_kind then
    insert into public.course_entitlements (user_id, course_id, order_id)
    values (new.user_id, new.course_id, new.id)
    on conflict (user_id, course_id) do nothing;
    return null;
  end if;

  insert into public.subscriptions (user_id, status, plan, plan_id, provider, current_period_end)
  values (
    new.user_id,
    'active'::public.subscription_status,
    coalesce((select p.slug from public.plans p where p.id = new.plan_id), 'assinatura'),
    new.plan_id,
    new.provider,
    now() + case
      when (select p.interval from public.plans p where p.id = new.plan_id) = 'year'::public.billing_interval
        then interval '1 year'
      else interval '1 month'
    end
  )
  on conflict (user_id) do update
    set status = 'active'::public.subscription_status,
        plan_id = excluded.plan_id,
        plan = excluded.plan,
        provider = excluded.provider,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = false,
        canceled_at = null;

  select p.seats into v_seats from public.plans p where p.id = new.plan_id;

  if coalesce(v_seats, 1) > 1 then
    select o.id into v_org from public.organizations o where o.owner_id = new.user_id;

    if v_org is null then
      -- O nome sai do perfil e é editável depois. Melhor um nome provisório
      -- que uma tela pedindo o nome da empresa antes de deixar a pessoa pagar.
      select coalesce(nullif(trim(pr.full_name), ''), 'Meu time')
        into v_nome
        from public.profiles pr
       where pr.id = new.user_id;

      insert into public.organizations (name, owner_id, seats)
      values (coalesce(v_nome, 'Meu time'), new.user_id, v_seats)
      returning id into v_org;

      -- O dono ocupa a primeira vaga: ele estuda junto.
      insert into public.organization_members (user_id, org_id, is_owner)
      values (new.user_id, v_org, true)
      on conflict (user_id) do nothing;
    else
      -- Renovou ou trocou de plano: as vagas acompanham.
      update public.organizations set seats = v_seats where id = v_org;
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.conceder_apos_pagamento() from public, anon, authenticated;
