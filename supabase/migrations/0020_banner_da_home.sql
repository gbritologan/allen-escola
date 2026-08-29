-- ============================================================================
-- 0020 — BANNER DA HOME
--
-- Tabela e não constante no código porque trocar o destaque da Home é gesto
-- semanal de quem escreve, não deploy de quem programa (D-04).
--
-- Vários e não um só: preparar o próximo enquanto o atual está no ar é o modo
-- normal de trabalhar. `status` guarda qual está valendo.
--
-- PROPORÇÃO FIXA: 1440×360 (4:1), escrita aqui e no Studio porque banner é a
-- única imagem do produto cuja arte é feita FORA — e arte feita fora sem
-- medida escrita volta na proporção errada.
-- ============================================================================

create table public.home_banners (
  id uuid primary key default gen_random_uuid(),

  -- Podem ser nulos: um banner pode ser só a arte, sem texto por cima.
  eyebrow text,
  title text,
  subtitle text,

  cta_label text,
  cta_href text,

  -- 1440×360. Nulo enquanto a arte não subiu — e aí o banner não aparece.
  image_url text,

  position integer not null default 0,
  status public.content_status not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger home_banners_set_updated_at
  before update on public.home_banners
  for each row execute function public.set_updated_at();

alter table public.home_banners enable row level security;

create policy "banner publicado é legível"
  on public.home_banners for select to authenticated
  using (status = 'published' or public.is_staff());

create policy "equipe gere banners"
  on public.home_banners for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
