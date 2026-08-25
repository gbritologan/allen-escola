-- =============================================================================
-- 0010 — Cobrança: o que é vendido, o que foi comprado, e quem pode ver o quê.
--
-- Até aqui o acesso era binário: `has_access()` respondia "essa pessoa pode
-- consumir conteúdo", e a resposta valia para o catálogo inteiro. Vender curso
-- avulso quebra isso — passa a existir quem tem UM curso e mais nada.
--
-- Três mudanças estruturais:
--
--   1. ACESSO VIRA POR CURSO. `has_course_access(uuid)` substitui
--      `has_access()` em tudo que é conteúdo. `has_access()` continua
--      existindo e continua significando "assinatura ativa = catálogo
--      inteiro" — ele agora é um dos dois caminhos, não o único.
--
--   2. A VITRINE SE SEPARA DO CONTEÚDO. Para vender um curso é preciso poder
--      VER o curso sem ter comprado: título, resumo, capa, instrutor, preço e
--      currículo. O que continua trancado é a aula — vídeo, Para Saber, Para
--      Fazer. Antes desta migration, quem não tinha assinatura não enxergava
--      nem a existência do produto, o que torna vender impossível.
--
--   3. O PREÇO É DECIDIDO NO BANCO. `criar_pedido()` calcula o valor a partir
--      de `plans` e `courses`; INSERT direto em `orders` é negado. Sem isso o
--      navegador manda o valor, e alguém compra um curso de R$ 500 por
--      1 centavo mudando um campo escondido.
-- =============================================================================

create type public.billing_interval as enum ('month', 'year');
create type public.order_kind      as enum ('subscription', 'course');
create type public.payment_method  as enum ('card', 'pix');

-- Os desfechos de uma compra. A lista é longa de propósito: cada estado destes
-- é uma tela diferente para o aluno, e juntar "recusado" com "falhou" numa só
-- mensagem genérica é o que faz cliente desistir sem saber o que houve.
create type public.order_status as enum (
  'pending',    -- criado, esperando o pagamento (Pix aberto, cartão em análise)
  'paid',       -- confirmado pelo provedor
  'failed',     -- o provedor recusou (sem limite, dados errados, antifraude)
  'expired',    -- Pix venceu sem pagamento
  'canceled',   -- desistiu antes de pagar
  'refunded'    -- estornado depois de pago
);

-- --- Planos de assinatura ----------------------------------------------------
--
-- Plano é DADO, não código (mesma razão de tema, D-04). Mudar preço, criar um
-- plano anual ou tirar um de venda não pode exigir deploy.
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  -- Uma linha. É o que aparece embaixo do preço na página de planos.
  tagline text,
  interval public.billing_interval not null default 'month',
  price_cents integer not null check (price_cents >= 0),
  -- Fora de venda ≠ apagado: quem já assinou continua no plano antigo.
  active boolean not null default true,
  -- "Mais escolhido". Um só, e é escolha editorial, não cálculo.
  highlight boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- --- Preço do curso avulso ---------------------------------------------------
--
-- Coluna em `courses`, não tabela nova: um curso tem no máximo um preço avulso,
-- e NULL diz "este não se vende sozinho, só pela assinatura". Uma tabela de
-- preços permitiria dois preços simultâneos para o mesmo curso, que é um estado
-- que não deve poder existir.
alter table public.courses
  add column if not exists price_cents integer check (price_cents is null or price_cents >= 0);

comment on column public.courses.price_cents is
  'NULL = só pela assinatura. Preenchido = também vendido avulso, acesso vitalício.';

-- --- Pedidos -----------------------------------------------------------------
--
-- Toda tentativa de compra vira linha aqui, inclusive as que falharam. Pedido
-- que some quando dá errado é suporte impossível de fazer: o cliente diz "paguei
-- e não entrou" e não há o que olhar.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.order_kind not null,

  -- Um dos dois, nunca os dois, nunca nenhum.
  plan_id uuid references public.plans (id) on delete restrict,
  course_id uuid references public.courses (id) on delete restrict,

  -- Congelado no momento da compra. Se o preço do curso mudar amanhã, o
  -- histórico não pode mudar junto.
  amount_cents integer not null check (amount_cents >= 0),
  method public.payment_method not null,
  status public.order_status not null default 'pending',

  provider text not null default 'asaas',
  -- Id da cobrança no provedor. Único: é a chave que o webhook usa para achar
  -- o pedido, e o que impede a mesma notificação ser processada duas vezes.
  provider_id text unique,

  -- Só para Pix. O copia-e-cola e a imagem vivem aqui até vencer.
  pix_payload text,
  pix_qr_base64 text,
  expires_at timestamptz,

  -- O motivo da recusa, em português, para a tela poder dizer o que fazer.
  failure_reason text,

  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint orders_alvo_unico check (
    (kind = 'subscription' and plan_id is not null and course_id is null) or
    (kind = 'course' and course_id is not null and plan_id is null)
  )
);

create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status) where status = 'pending';

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- --- Direito de acesso a um curso --------------------------------------------
--
-- Curso avulso é vitalício. Sem `ends_at`, e de propósito: cancelar assinatura
-- não pode tirar de alguém o curso que a pessoa comprou separado.
create table public.course_entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create index course_entitlements_course_idx on public.course_entitlements (course_id);

-- --- Assinatura ganha o que faltava ------------------------------------------

alter table public.subscriptions
  add column if not exists plan_id uuid references public.plans (id) on delete set null,
  add column if not exists provider text,
  add column if not exists provider_id text,
  add column if not exists current_period_end timestamptz,
  -- Cancelou, mas pagou até o fim do mês. Continua entrando até lá.
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz;

create unique index if not exists subscriptions_provider_idx
  on public.subscriptions (provider_id) where provider_id is not null;

-- =============================================================================
-- Os dois portões
-- =============================================================================

-- Assinatura ativa OU curso comprado. É a pergunta que toda política de
-- conteúdo passa a fazer.
create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_access() or exists (
    select 1
      from public.course_entitlements e
     where e.user_id = (select auth.uid())
       and e.course_id = p_course_id
  );
$$;

-- "Tem alguma coisa" — para o que não pertence a um curso específico:
-- o vocabulário de habilidades, a lista de instrutores.
create or replace function public.has_any_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_access() or exists (
    select 1 from public.course_entitlements e where e.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.has_course_access(uuid) from public, anon;
revoke execute on function public.has_any_access() from public, anon;
grant execute on function public.has_course_access(uuid) to authenticated;
grant execute on function public.has_any_access() to authenticated;

-- =============================================================================
-- A vitrine abre. O conteúdo continua trancado.
-- =============================================================================

-- --- Temas, cursos e instrutores: vitrine ------------------------------------
--
-- Publicado é público (para quem tem conta). É o que permite alguém chegar na
-- página do curso, ver o preço e comprar. O gate saiu daqui e desceu para a
-- aula, que é onde o valor realmente está.

drop policy if exists "temas publicados são legíveis" on public.themes;
create policy "temas publicados são legíveis"
  on public.themes for select to authenticated
  using (status = 'published' or public.is_staff());

drop policy if exists "cursos publicados são legíveis" on public.courses;
create policy "cursos publicados são legíveis"
  on public.courses for select to authenticated
  using (status = 'published' or public.is_staff());

drop policy if exists "instrutores são legíveis" on public.instructors;
create policy "instrutores são legíveis"
  on public.instructors for select to authenticated
  using (true);

drop policy if exists "vínculos de tema são legíveis" on public.course_themes;
create policy "vínculos de tema são legíveis"
  on public.course_themes for select to authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.courses c
       where c.id = course_themes.course_id and c.status = 'published'
    )
  );

-- --- Módulos: o esqueleto do curso é vitrine ---------------------------------
--
-- O título do módulo vende o curso; o conteúdo da aula é o produto.
drop policy if exists "módulos publicados são legíveis" on public.modules;
create policy "módulos publicados são legíveis"
  on public.modules for select to authenticated
  using (
    public.is_staff() or (
      status = 'published' and exists (
        select 1 from public.courses c
         where c.id = modules.course_id and c.status = 'published'
      )
    )
  );

-- --- Aulas: aqui o portão fecha ----------------------------------------------
--
-- Não dá para liberar a linha e esconder colunas: RLS é por LINHA. Ou a pessoa
-- lê a aula inteira — vídeo, Para Saber, Para Fazer — ou não lê nada. Por isso
-- a lista de aulas da página de vendas vem da view `curriculum` abaixo, que
-- expõe só título e duração.
drop policy if exists "aulas publicadas são legíveis" on public.lessons;
create policy "aulas publicadas são legíveis"
  on public.lessons for select to authenticated
  using (
    public.is_staff() or (
      status = 'published'
      and public.has_course_access(lessons.course_id)
      and exists (
        select 1
          from public.modules m
          join public.courses c on c.id = m.course_id
         where m.id = lessons.module_id
           and m.status = 'published'
           and c.status = 'published'
      )
    )
  );

drop policy if exists "materiais seguem o conteúdo" on public.materials;
create policy "materiais seguem o conteúdo"
  on public.materials for select to authenticated
  using (
    public.is_staff() or (
      (lesson_id is not null and exists (
        select 1 from public.lessons l
         where l.id = materials.lesson_id
           and l.status = 'published'
           and public.has_course_access(l.course_id)
      )) or
      (course_id is not null and exists (
        select 1 from public.courses c
         where c.id = materials.course_id
           and c.status = 'published'
           and public.has_course_access(c.id)
      ))
    )
  );

-- --- Jornada: escrever exige acesso ÀQUELE curso -----------------------------

drop policy if exists "progresso próprio é criável" on public.lesson_progress;
create policy "progresso próprio é criável"
  on public.lesson_progress for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.lessons l
       where l.id = lesson_progress.lesson_id
         and public.has_course_access(l.course_id)
    )
  );

drop policy if exists "aplicação própria é criável" on public.applications;
create policy "aplicação própria é criável"
  on public.applications for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.lessons l
       where l.id = applications.lesson_id
         and public.has_course_access(l.course_id)
    )
  );

-- --- Vocabulário de habilidades ----------------------------------------------

drop policy if exists "skills são legíveis" on public.skills;
create policy "skills são legíveis"
  on public.skills for select to authenticated
  using (public.has_any_access() or public.is_staff());

drop policy if exists "mapeamento de skills é legível" on public.lesson_skills;
create policy "mapeamento de skills é legível"
  on public.lesson_skills for select to authenticated
  using (public.has_any_access() or public.is_staff());

-- =============================================================================
-- A view da vitrine
-- =============================================================================
--
-- O currículo que a página de vendas mostra: quantas aulas, com que nomes, em
-- que módulos, quanto tempo. Nada de vídeo, nada de Para Saber, nada de Para
-- Fazer.
--
-- `security_invoker = false` de propósito: a view IGNORA a RLS de `lessons` —
-- que é justamente o que se quer, porque a RLS de `lessons` tranca quem não
-- comprou. O controle passa a ser o WHERE aqui dentro e o GRANT abaixo: só
-- linhas publicadas, só colunas inofensivas.
create or replace view public.curriculum
with (security_invoker = false) as
  select
    c.id            as course_id,
    m.id            as module_id,
    m.title         as module_title,
    m.position      as module_position,
    l.id            as lesson_id,
    l.title         as lesson_title,
    l.position      as lesson_position,
    l.duration_seconds,
    (l.video_asset_id is not null) as has_video,
    (coalesce(trim(l.para_fazer), '') <> '') as has_application
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = l.course_id
 where l.status = 'published'
   and m.status = 'published'
   and c.status = 'published';

comment on view public.curriculum is
  'Vitrine: currículo sem conteúdo. Ignora a RLS de lessons de propósito — só expõe título, posição e duração de aulas publicadas.';

revoke all on public.curriculum from public, anon;
grant select on public.curriculum to authenticated;

-- =============================================================================
-- RLS das tabelas novas
-- =============================================================================

alter table public.plans               enable row level security;
alter table public.orders              enable row level security;
alter table public.course_entitlements enable row level security;

-- Preço é vitrine: todo mundo logado vê o que está à venda.
create policy "planos ativos são legíveis"
  on public.plans for select to authenticated
  using (active or public.is_admin());

create policy "admin gere planos"
  on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Pedido é do dono. E não há INSERT aqui: quem cria é `criar_pedido()`, que
-- calcula o valor no servidor. Deixar o cliente inserir seria deixá-lo
-- escolher o preço.
create policy "pedido próprio é legível"
  on public.orders for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "admin gere pedidos"
  on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "direito próprio é legível"
  on public.course_entitlements for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

-- Quem concede é o trigger de pagamento confirmado, como SECURITY DEFINER.
create policy "admin gere direitos"
  on public.course_entitlements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Criar pedido — com o preço vindo do banco
-- =============================================================================

create or replace function public.criar_pedido(
  p_kind public.order_kind,
  p_plan_id uuid,
  p_course_id uuid,
  p_method public.payment_method
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_amount integer;
  v_order public.orders;
begin
  if v_user is null then
    raise exception 'Precisa estar logado para comprar.';
  end if;

  if p_kind = 'subscription' then
    -- O preço vem daqui, e não do formulário. Este SELECT é a razão desta
    -- função existir.
    select p.price_cents into v_amount
      from public.plans p
     where p.id = p_plan_id and p.active;

    if v_amount is null then
      raise exception 'Plano indisponível.';
    end if;

    -- Assinatura por Pix não renova sozinha. Bloquear aqui é mais honesto que
    -- vender uma recorrência que na verdade é uma cobrança manual por mês.
    if p_method <> 'card' then
      raise exception 'Assinatura só no cartão.';
    end if;

    p_course_id := null;
  else
    select c.price_cents into v_amount
      from public.courses c
     where c.id = p_course_id
       and c.status = 'published'
       and c.price_cents is not null;

    if v_amount is null then
      raise exception 'Este curso não está à venda avulso.';
    end if;

    -- Comprar de novo o que já se tem é dinheiro jogado fora, e o suporte
    -- que vem depois é pior que a venda perdida.
    if exists (
      select 1 from public.course_entitlements e
       where e.user_id = v_user and e.course_id = p_course_id
    ) then
      raise exception 'Você já tem este curso.';
    end if;

    p_plan_id := null;
  end if;

  insert into public.orders (user_id, kind, plan_id, course_id, amount_cents, method)
  values (v_user, p_kind, p_plan_id, p_course_id, v_amount, p_method)
  returning * into v_order;

  return v_order;
end;
$$;

revoke execute on function public.criar_pedido(public.order_kind, uuid, uuid, public.payment_method)
  from public, anon;
grant execute on function public.criar_pedido(public.order_kind, uuid, uuid, public.payment_method)
  to authenticated;

-- =============================================================================
-- Pagamento confirmado → acesso concedido
-- =============================================================================
--
-- No banco, não no webhook. O webhook só marca o pedido como pago; o que isso
-- SIGNIFICA é regra de negócio e mora aqui. Assim uma liberação manual feita
-- pelo Admin concede acesso exatamente igual a um pagamento pelo Asaas — em
-- vez de existirem dois caminhos que um dia divergem.
create or replace function public.conceder_apos_pagamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
  else
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
  end if;

  return null;
end;
$$;

create trigger orders_conceder_acesso
  after insert or update of status on public.orders
  for each row execute function public.conceder_apos_pagamento();

revoke all on function public.conceder_apos_pagamento() from public, anon, authenticated;
revoke all on function public.sync_profile_from_auth() from public, anon, authenticated;

-- =============================================================================
-- Planos iniciais — preço de partida, editável no Admin sem deploy.
-- =============================================================================
insert into public.plans (slug, name, tagline, interval, price_cents, highlight, position)
values
  ('mensal', 'Mensal', 'Cancele quando quiser.', 'month', 19700, false, 1),
  ('anual',  'Anual',  'Dois meses de graça.',   'year',  197000, true,  2)
on conflict (slug) do nothing;
