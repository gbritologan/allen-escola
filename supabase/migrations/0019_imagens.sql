-- ============================================================================
-- 0019 — IMAGENS
--
-- `courses.cover_url` existe desde 0003 e é lido em quatro lugares. Nunca
-- houve como PREENCHER — sem bucket e sem upload no Studio. Toda capa era
-- nula, e todo cartão saía cinza.
--
-- Um bucket público, três usos: capa de curso, retrato de instrutor, banner da
-- Home. Público porque capa é vitrine — pôr imagem de vitrine atrás de URL
-- assinada custa uma ida ao servidor por cartão para proteger o que a pessoa
-- já pode ver.
--
-- O VÍDEO continua fora daqui (D-17: mora no provedor, com ticket que expira).
-- Capa é cartaz; aula é o produto.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', true, 8 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "imagens são públicas"
  on storage.objects for select
  using (bucket_id = 'imagens');

-- Aluno não sobe arquivo em lugar nenhum do produto hoje, e abrir escrita
-- "para depois" é como bucket vira lixão.
create policy "equipe envia imagens"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and public.is_staff());

create policy "equipe troca imagens"
  on storage.objects for update to authenticated
  using (bucket_id = 'imagens' and public.is_staff())
  with check (bucket_id = 'imagens' and public.is_staff());

create policy "equipe remove imagens"
  on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and public.is_staff());

-- --- EM BREVE ----------------------------------------------------------------
--
-- Um curso anunciado antes de existir. Hoje só há rascunho (invisível) e
-- publicado (entrável) — não há como dizer "vem aí" sem deixar a pessoa clicar
-- e cair numa casca vazia.
--
-- `available_at` no futuro é o estado. Não virou um quarto valor do enum de
-- propósito: "em breve" não é estágio de edição como rascunho, é uma DATA.
-- Como enum, alguém teria que trocar o status na mão no dia certo — e é
-- exatamente esse tipo de tarefa que ninguém lembra.
alter table public.courses add column available_at timestamptz;

comment on column public.courses.available_at is
  'Data em que o curso abre. No futuro = "Em breve": aparece no catálogo, não entra. Nulo = disponível assim que publicado.';

create index courses_disponivel_idx on public.courses (status, available_at);
