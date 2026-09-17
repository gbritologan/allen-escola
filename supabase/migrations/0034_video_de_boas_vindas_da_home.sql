-- =============================================================================
-- 0034 — O vídeo de boas-vindas da Home.
--
-- Todo aluno que entra vê o mesmo vídeo, no alto da Home, antes dos cursos e
-- dos temas. É a voz da escola falando uma vez com todo mundo — coisa que a
-- Home ainda não tinha: ela mostrava o que fazer, nunca quem estava falando.
--
-- UMA LINHA SÓ, e por quê: é a mensagem da casa, não uma lista de mensagens.
-- Duas ativas seria uma escolhida em silêncio por ordem de criação. O
-- `check (id = 1)` torna a regra estrutural em vez de convenção — não existe
-- como criar a segunda.
--
-- É diferente do teaser do curso (0027), que fala DAQUELE curso, e do banner
-- (0020), que é arte parada e promocional. Este é institucional e único.
--
-- Nasce vazio e some quando vazio: sem `video_asset_id`, o bloco não aparece
-- na Home. Moldura vazia no lugar mais nobre da tela é pior que bloco nenhum.
-- =============================================================================

create table if not exists public.home_intro (
  id               integer primary key default 1,
  video_asset_id   text,
  video_provider   text,
  eyebrow          text,
  title            text,
  subtitle         text,
  updated_at       timestamptz not null default now(),
  constraint home_intro_linha_unica check (id = 1)
);

insert into public.home_intro (id) values (1) on conflict (id) do nothing;

create trigger home_intro_set_updated_at
  before update on public.home_intro
  for each row execute function public.set_updated_at();

alter table public.home_intro enable row level security;

create policy "quem está dentro vê as boas-vindas"
  on public.home_intro for select to authenticated
  using (true);

create policy "equipe edita as boas-vindas"
  on public.home_intro for update to authenticated
  using (is_staff())
  with check (is_staff());

comment on table public.home_intro is
  'O vídeo de boas-vindas da Home. Uma linha, sempre id=1. Vazio = o bloco não aparece.';
