-- ============================================================================
-- 0015 — APPS
--
-- O Gabriel achou "Explorar" inútil na sidebar e pediu "Apps" no lugar: um
-- lugar onde o empresário encontra as soluções de app da Allen, com vídeo e
-- como usar.
--
-- É um tipo de conteúdo NOVO, não um curso disfarçado, e a diferença importa:
-- curso tem aula, módulo, progresso e aplicação. Um app tem uma demonstração e
-- um "como usar". Forçá-lo dentro de `courses` traria seis colunas nulas e uma
-- regra de progresso que não faz sentido — quando você "conclui" um app?
--
-- O que ele reaproveita de propósito: o par provider/asset_id do vídeo (D-17,
-- o vídeo mora no provedor), o `content_status` (rascunho é o estado natural)
-- e o `search_doc`, para os apps aparecerem na Busca junto com o resto.
-- ============================================================================

create table public.apps (
  id uuid primary key default gen_random_uuid(),

  slug text not null unique,
  name text not null,

  -- Uma linha. É o que aparece no cartão da lista, e o que decide se alguém
  -- abre ou não.
  tagline text,
  description text,

  -- A demonstração. Mesmo par de `lessons`: o vídeo mora no provedor.
  video_provider text check (video_provider in ('bunny', 'mux')),
  video_asset_id text,
  duration_seconds integer not null default 0,

  -- O "como utilizá-lo" que o Gabriel pediu. Nome em português como
  -- `para_saber`/`para_fazer` nas aulas: não é campo genérico, é vocabulário
  -- do produto.
  como_usar text,

  -- Onde o app de fato abre. Opcional: um app pode ser anunciado antes de
  -- estar acessível, e nesse caso a página mostra a demonstração sem o botão.
  access_url text,

  position integer not null default 0,
  status public.content_status not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_doc tsvector generated always as (
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(tagline, ''))), 'B') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(description, ''))), 'C') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(como_usar, ''))), 'C')
  ) stored
);

create index apps_search_idx on public.apps using gin (search_doc);
create index apps_listagem_idx on public.apps (status, position);

create trigger apps_set_updated_at
  before update on public.apps
  for each row execute function public.set_updated_at();

alter table public.apps enable row level security;

-- Mesma regra da Ajuda: publicado é de todo mundo logado, rascunho é da equipe.
create policy "app publicado é legível"
  on public.apps for select to authenticated
  using (status = 'published' or public.is_staff());

create policy "equipe gere os apps"
  on public.apps for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
