-- =============================================================================
-- 0013 — Comprar vagas, e o CNPJ entrando no pedido.
--
-- Separado de 0012 porque `order_kind` ganhou o valor 'seats' lá, e o Postgres
-- não deixa usar um valor de enum na mesma transação que o criou.
-- =============================================================================

alter table public.orders
  -- Quantas vagas este pedido compra. Só faz sentido em pedido do tipo 'seats'.
  add column if not exists seats_delta integer check (seats_delta is null or seats_delta > 0),
  -- Congelado no pedido: é o CNPJ que vai na nota fiscal, e ele não pode mudar
  -- depois se a empresa trocar o cadastro.
  add column if not exists cnpj text;

-- A restrição de 0010 não conhecia 'seats'. Sem trocar, comprar vaga seria
-- recusado por não ter plano nem curso.
alter table public.orders drop constraint if exists orders_alvo_unico;
alter table public.orders add constraint orders_alvo_unico check (
  (kind = 'subscription' and plan_id is not null and course_id is null and seats_delta is null) or
  (kind = 'course'       and course_id is not null and plan_id is null and seats_delta is null) or
  (kind = 'seats'        and plan_id is null and course_id is null and seats_delta is not null)
);

-- =============================================================================
-- Criar pedido — agora com CNPJ e com vaga extra
-- =============================================================================

drop function if exists public.criar_pedido(public.order_kind, uuid, uuid, public.payment_method);

create or replace function public.criar_pedido(
  p_kind public.order_kind,
  p_plan_id uuid,
  p_course_id uuid,
  p_method public.payment_method,
  p_seats integer default null,
  p_cnpj text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_amount integer;
  v_seats_plano integer;
  v_preco_vaga integer;
  v_org uuid;
  v_dono uuid;
  v_dom text;
  v_email text;
  v_order public.orders;
  v_cnpj text := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
begin
  if v_user is null then
    raise exception 'Precisa estar logado para comprar.';
  end if;

  -- ------------------------------------------------------------------ plano
  if p_kind = 'subscription' then
    select p.price_cents, p.seats into v_amount, v_seats_plano
      from public.plans p
     where p.id = p_plan_id and p.active;

    if v_amount is null then
      raise exception 'Plano indisponível.';
    end if;

    if p_method <> 'card' then
      raise exception 'Assinatura só no cartão.';
    end if;

    -- CNPJ é exigência do plano com time, e não capricho: é ele que vai na
    -- nota fiscal, e é ele que impede a mesma empresa manter cinco times de
    -- três vagas em vez de um time de quinze.
    if coalesce(v_seats_plano, 1) > 1 then
      if not public.cnpj_valido(v_cnpj) then
        raise exception 'O plano Empresarial precisa de um CNPJ válido.';
      end if;
      if exists (select 1 from public.organizations o
                  where o.cnpj = v_cnpj and o.owner_id <> v_user) then
        raise exception 'Este CNPJ já tem um time na Allen.'
          using hint = 'Cada empresa tem um time só. Fale com quem já assina por aí.';
      end if;
    else
      v_cnpj := null;
    end if;

    p_course_id := null;
    p_seats := null;

  -- ------------------------------------------------------------------ curso
  elsif p_kind = 'course' then
    select c.price_cents into v_amount
      from public.courses c
     where c.id = p_course_id and c.status = 'published' and c.price_cents is not null;

    if v_amount is null then
      raise exception 'Este curso não está à venda avulso.';
    end if;

    if exists (select 1 from public.course_entitlements e
                where e.user_id = v_user and e.course_id = p_course_id) then
      raise exception 'Você já tem este curso.';
    end if;

    p_plan_id := null;
    p_seats := null;
    v_cnpj := null;

  -- ------------------------------------------------------------------ vagas
  else
    if p_seats is null or p_seats < 1 then
      raise exception 'Diga quantas vagas você quer.';
    end if;

    select o.id, o.owner_id into v_org, v_dono
      from public.organizations o where o.owner_id = v_user;

    if v_org is null then
      raise exception 'Só quem assina o Empresarial compra vagas.';
    end if;

    select p.extra_seat_price_cents into v_preco_vaga
      from public.plans p
      join public.subscriptions s on s.plan_id = p.id
     where s.user_id = v_user
       and s.status = 'active'::public.subscription_status;

    if v_preco_vaga is null then
      raise exception 'Seu plano não vende vaga avulsa.';
    end if;

    -- A EXPANSÃO EXIGE DOMÍNIO PRÓPRIO.
    --
    -- Esta é a trava que realmente impede revenda. Sem ela, R$ 80 por vaga
    -- deixa uma margem de R$ 10 sobre o preço individual, e alguém acharia
    -- que vale a pena. Com ela, quem entra no time precisa de e-mail
    -- @suaempresa.com.br — e ninguém dá isso para um estranho da internet.
    select p.email into v_email from public.profiles p where p.id = v_user;
    v_dom := public.dominio_corporativo(v_email);

    if v_dom is null then
      raise exception 'Para passar de 3 vagas, sua conta precisa ser um e-mail da empresa.'
        using hint = 'Gmail, Hotmail e afins não servem para expandir o time.';
    end if;

    v_amount := v_preco_vaga * p_seats;
    p_plan_id := null;
    p_course_id := null;
    v_cnpj := null;
  end if;

  insert into public.orders (user_id, kind, plan_id, course_id, amount_cents, method, seats_delta, cnpj)
  values (v_user, p_kind, p_plan_id, p_course_id, v_amount, p_method, p_seats, nullif(v_cnpj, ''))
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function public.criar_pedido(public.order_kind, uuid, uuid, public.payment_method, integer, text)
  from public, anon;
grant execute on function public.criar_pedido(public.order_kind, uuid, uuid, public.payment_method, integer, text)
  to authenticated;

-- =============================================================================
-- Pagamento confirmado — agora também abre vaga e grava o CNPJ
-- =============================================================================

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
  v_email text;
begin
  if new.status <> 'paid'::public.order_status then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.status = 'paid'::public.order_status then
    return null;
  end if;

  -- ----------------------------------------------------------------- curso
  if new.kind = 'course'::public.order_kind then
    insert into public.course_entitlements (user_id, course_id, order_id)
    values (new.user_id, new.course_id, new.id)
    on conflict (user_id, course_id) do nothing;
    return null;
  end if;

  -- ----------------------------------------------------------------- vagas
  if new.kind = 'seats'::public.order_kind then
    select p.email into v_email from public.profiles p where p.id = new.user_id;

    update public.organizations o
       set seats = o.seats + new.seats_delta,
           extra_seats = o.extra_seats + new.seats_delta,
           -- O domínio é fixado na PRIMEIRA expansão e não muda depois: se ele
           -- pudesse mudar, bastaria trocá-lo a cada venda para contornar a trava.
           email_domain = coalesce(o.email_domain, public.dominio_corporativo(v_email))
     where o.owner_id = new.user_id;
    return null;
  end if;

  -- ------------------------------------------------------------ assinatura
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
      select coalesce(nullif(trim(pr.full_name), ''), 'Meu time')
        into v_nome from public.profiles pr where pr.id = new.user_id;

      insert into public.organizations (name, owner_id, seats, cnpj)
      values (coalesce(v_nome, 'Meu time'), new.user_id, v_seats, new.cnpj)
      returning id into v_org;

      insert into public.organization_members (user_id, org_id, is_owner)
      values (new.user_id, v_org, true)
      on conflict (user_id) do nothing;
    else
      -- Renovou: o pacote pode ter mudado de tamanho, mas as vagas compradas
      -- à parte continuam valendo.
      update public.organizations o
         set seats = v_seats + o.extra_seats,
             cnpj = coalesce(o.cnpj, new.cnpj)
       where o.id = v_org;
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.conceder_apos_pagamento() from public, anon, authenticated;
