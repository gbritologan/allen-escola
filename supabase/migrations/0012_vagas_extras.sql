-- =============================================================================
-- 0012 — Vagas extras, e as travas contra revenda.
--
-- O empresarial vende 3 vagas por R$ 210 — R$ 70 por pessoa. Vaga avulsa acima
-- disso custa R$ 80. Essa diferença é deliberada: o pacote é a oferta, a
-- expansão não herda o desconto.
--
-- POR QUE ISSO IMPORTA. Se a vaga extra custasse os mesmos R$ 70, alguém
-- compraria 20 por R$ 1.400 e revenderia a R$ 85 — abaixo do preço individual
-- de R$ 90, com margem de R$ 15 por cabeça. A R$ 80, a margem cai para R$ 10.
--
-- R$ 10 ainda é maior que zero, e é por isso que existem as outras duas travas
-- aqui. Elas não são redundância: cada uma cobre o que a outra não cobre.
--
--   CNPJ, UM TIME POR CNPJ. Já é necessário para a nota fiscal que o Asaas
--   emite, então a barreira sai de graça — e é a mais dissuasiva de todas.
--   Toda compra gera nota no CNPJ do comprador; revender para estranhos sem
--   emitir nota é irregularidade fiscal, não esperteza de software.
--
--   DOMÍNIO PRÓPRIO NA EXPANSÃO. Passar de 3 vagas exige e-mail corporativo, e
--   quem entra depois disso precisa ser do mesmo domínio. É a trava que
--   realmente mata a revenda: ninguém dá e-mail @suaempresa.com.br para um
--   estranho da internet. Quem couber ali dentro é funcionário de verdade.
--
--   O pacote de 3 continua aberto a Gmail — empresa pequena de verdade usa
--   Gmail, e o ganho de revender duas vagas do pacote é R$ 90 por mês com
--   cobrança manual em dois estranhos. Não compensa o trabalho de ninguém.
-- =============================================================================

-- --- Preço da vaga extra -----------------------------------------------------

alter table public.plans
  add column if not exists extra_seat_price_cents integer
    check (extra_seat_price_cents is null or extra_seat_price_cents >= 0);

comment on column public.plans.extra_seat_price_cents is
  'NULL = plano não vende vaga avulsa. O individual não vende; o empresarial sim.';

update public.plans set extra_seat_price_cents = 8000 where slug = 'empresarial';

-- --- O time ganha CNPJ, domínio e contagem de vagas compradas ----------------

alter table public.organizations
  add column if not exists cnpj text,
  add column if not exists email_domain text,
  -- Quantas vagas foram compradas ALÉM das do pacote. `seats` continua sendo o
  -- total, porque é ele que o trigger de vaga consulta — um número só decidindo
  -- quem entra evita os dois divergirem.
  add column if not exists extra_seats integer not null default 0 check (extra_seats >= 0);

-- Um CNPJ, um time. É isto que impede a mesma empresa de manter cinco times de
-- três vagas em vez de um time de quinze.
create unique index if not exists organizations_cnpj_idx
  on public.organizations (cnpj) where cnpj is not null;

comment on column public.organizations.email_domain is
  'Domínio corporativo do dono. Preenchido na primeira expansão, e daí em diante todo membro novo precisa dele.';

-- --- CNPJ de verdade, não catorze dígitos quaisquer -------------------------

create or replace function public.cnpj_valido(p_cnpj text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  d text;
  soma integer;
  peso integer;
  i integer;
  dv1 integer;
  dv2 integer;
begin
  d := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');

  if length(d) <> 14 then
    return false;
  end if;

  -- 00000000000000, 11111111111111… passam na conta dos dígitos e não existem.
  if d ~ ('^(' || substr(d, 1, 1) || '){14}$') then
    return false;
  end if;

  soma := 0; peso := 5;
  for i in 1..12 loop
    soma := soma + (substr(d, i, 1))::integer * peso;
    peso := case when peso = 2 then 9 else peso - 1 end;
  end loop;
  dv1 := 11 - (soma % 11);
  if dv1 >= 10 then dv1 := 0; end if;

  soma := 0; peso := 6;
  for i in 1..13 loop
    soma := soma + (substr(d, i, 1))::integer * peso;
    peso := case when peso = 2 then 9 else peso - 1 end;
  end loop;
  dv2 := 11 - (soma % 11);
  if dv2 >= 10 then dv2 := 0; end if;

  return dv1 = (substr(d, 13, 1))::integer
     and dv2 = (substr(d, 14, 1))::integer;
end;
$$;

-- --- Domínio: o que é corporativo e o que é caixa pessoal --------------------

create or replace function public.dominio_corporativo(p_email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_dom text;
  -- Provedores gratuitos. Não é lista de bloqueio moral: é que qualquer pessoa
  -- abre um endereço nesses domínios em trinta segundos, então "ser do mesmo
  -- domínio" não prova nada.
  v_livres text[] := array[
    'gmail.com','googlemail.com','hotmail.com','hotmail.com.br','outlook.com',
    'outlook.com.br','live.com','msn.com','yahoo.com','yahoo.com.br','icloud.com',
    'me.com','bol.com.br','uol.com.br','terra.com.br','ig.com.br','globo.com',
    'r7.com','zipmail.com.br','protonmail.com','proton.me','gmx.com','aol.com'
  ];
begin
  v_dom := lower(split_part(coalesce(p_email, ''), '@', 2));
  if v_dom = '' or position('.' in v_dom) = 0 then
    return null;
  end if;
  if v_dom = any (v_livres) then
    return null;
  end if;
  return v_dom;
end;
$$;

-- --- A trava do domínio ------------------------------------------------------
--
-- Só morde depois da expansão. Enquanto o time couber no pacote de 3, entra
-- quem o dono quiser, de onde vier.
create or replace function public.checar_dominio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_extra integer;
  v_dom text;
  v_email text;
  v_dom_membro text;
begin
  select o.extra_seats, o.email_domain into v_extra, v_dom
    from public.organizations o where o.id = new.org_id;

  if coalesce(v_extra, 0) = 0 or v_dom is null then
    return new;
  end if;

  select p.email into v_email from public.profiles p where p.id = new.user_id;
  v_dom_membro := lower(split_part(coalesce(v_email, ''), '@', 2));

  if v_dom_membro <> v_dom then
    raise exception 'Times acima de 3 vagas só aceitam e-mail @%.', v_dom
      using hint = 'Use o e-mail corporativo da pessoa, ou volte para o pacote de 3 vagas.';
  end if;

  return new;
end;
$$;

create trigger organization_members_checar_dominio
  before insert on public.organization_members
  for each row execute function public.checar_dominio();

revoke all on function public.checar_dominio() from public, anon, authenticated;

-- =============================================================================
-- Comprar vagas
-- =============================================================================

alter type public.order_kind add value if not exists 'seats';
