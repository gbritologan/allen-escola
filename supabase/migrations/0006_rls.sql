-- =============================================================================
-- 0006 — Row Level Security.
--
-- ESTA É A SEGURANÇA DO PRODUTO (D-11).
-- O frontend esconde botões; o Postgres nega operações. Se a interface inteira
-- do Admin vazasse para um aluno, ele não leria nem escreveria uma linha a mais.
--
-- Espelho em TypeScript: src/core/identity/permissions.ts. Mudou aqui, muda lá.
--
-- Detalhe de performance: `(select auth.uid())` em vez de `auth.uid()` puro
-- permite ao planejador avaliar uma vez por query em vez de uma vez por linha.
-- =============================================================================

alter table public.profiles          enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.themes            enable row level security;
alter table public.instructors       enable row level security;
alter table public.courses           enable row level security;
alter table public.course_themes     enable row level security;
alter table public.modules           enable row level security;
alter table public.lessons           enable row level security;
alter table public.materials         enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.enrollments       enable row level security;
alter table public.applications      enable row level security;
alter table public.skills            enable row level security;
alter table public.lesson_skills     enable row level security;
alter table public.skill_signals     enable row level security;
alter table public.skill_scores      enable row level security;

-- =============================================================================
-- Identidade
-- =============================================================================

create policy "perfil próprio é legível"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or public.is_staff());

create policy "perfil próprio é editável"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Só admin muda papel de alguém — e a checagem do próprio papel vem do JWT,
-- não desta tabela, então não há como se autopromover editando a própria linha.
create policy "admin gere perfis"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "auth admin lê perfis"
  on public.profiles for select to supabase_auth_admin
  using (true);

create policy "assinatura própria é legível"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "admin gere assinaturas"
  on public.subscriptions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- Catálogo
--
-- Leitura: publicado para quem tem acesso; rascunho só para a equipe.
-- Escrita: equipe cria e edita; só admin apaga.
-- =============================================================================

-- --- Temas -------------------------------------------------------------------
create policy "temas publicados são legíveis"
  on public.themes for select to authenticated
  using ((status = 'published' and public.has_access()) or public.is_staff());

create policy "equipe cria temas"
  on public.themes for insert to authenticated with check (public.is_staff());

create policy "equipe edita temas"
  on public.themes for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "admin apaga temas"
  on public.themes for delete to authenticated using (public.is_admin());

-- --- Instrutores -------------------------------------------------------------
create policy "instrutores são legíveis"
  on public.instructors for select to authenticated
  using (public.has_access() or public.is_staff());

create policy "equipe cria instrutores"
  on public.instructors for insert to authenticated with check (public.is_staff());

create policy "equipe edita instrutores"
  on public.instructors for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "admin apaga instrutores"
  on public.instructors for delete to authenticated using (public.is_admin());

-- --- Cursos ------------------------------------------------------------------
create policy "cursos publicados são legíveis"
  on public.courses for select to authenticated
  using ((status = 'published' and public.has_access()) or public.is_staff());

create policy "equipe cria cursos"
  on public.courses for insert to authenticated with check (public.is_staff());

create policy "equipe edita cursos"
  on public.courses for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Apagar um curso apaga módulos, aulas e desfaz o progresso de todo mundo.
-- Isso é decisão de admin, não de conteudista.
create policy "admin apaga cursos"
  on public.courses for delete to authenticated using (public.is_admin());

-- --- Curso ↔ Tema ------------------------------------------------------------
create policy "vínculos de tema são legíveis"
  on public.course_themes for select to authenticated
  using (
    public.is_staff() or (
      public.has_access() and exists (
        select 1 from public.courses c
         where c.id = course_themes.course_id and c.status = 'published'
      )
    )
  );

create policy "equipe gere vínculos de tema"
  on public.course_themes for insert to authenticated with check (public.is_staff());

create policy "equipe atualiza vínculos de tema"
  on public.course_themes for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "equipe remove vínculos de tema"
  on public.course_themes for delete to authenticated using (public.is_staff());

-- --- Módulos -----------------------------------------------------------------
create policy "módulos publicados são legíveis"
  on public.modules for select to authenticated
  using (
    public.is_staff() or (
      status = 'published' and public.has_access() and exists (
        select 1 from public.courses c
         where c.id = modules.course_id and c.status = 'published'
      )
    )
  );

create policy "equipe cria módulos"
  on public.modules for insert to authenticated with check (public.is_staff());

create policy "equipe edita módulos"
  on public.modules for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "equipe apaga módulos"
  on public.modules for delete to authenticated using (public.is_staff());

-- --- Aulas -------------------------------------------------------------------
--
-- A aula só é visível se ela, o módulo e o curso estiverem publicados.
-- Um dos três em rascunho já esconde tudo.
create policy "aulas publicadas são legíveis"
  on public.lessons for select to authenticated
  using (
    public.is_staff() or (
      status = 'published' and public.has_access() and exists (
        select 1
          from public.modules m
          join public.courses c on c.id = m.course_id
         where m.id = lessons.module_id
           and m.status = 'published'
           and c.status = 'published'
      )
    )
  );

create policy "equipe cria aulas"
  on public.lessons for insert to authenticated with check (public.is_staff());

create policy "equipe edita aulas"
  on public.lessons for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "equipe apaga aulas"
  on public.lessons for delete to authenticated using (public.is_staff());

-- --- Materiais ---------------------------------------------------------------
create policy "materiais seguem o conteúdo"
  on public.materials for select to authenticated
  using (
    public.is_staff() or (
      public.has_access() and (
        (lesson_id is not null and exists (
          select 1 from public.lessons l where l.id = materials.lesson_id and l.status = 'published'
        )) or
        (course_id is not null and exists (
          select 1 from public.courses c where c.id = materials.course_id and c.status = 'published'
        ))
      )
    )
  );

create policy "equipe cria materiais"
  on public.materials for insert to authenticated with check (public.is_staff());

create policy "equipe edita materiais"
  on public.materials for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "equipe apaga materiais"
  on public.materials for delete to authenticated using (public.is_staff());

-- =============================================================================
-- Jornada — cada aluno vê e escreve só o que é dele.
-- =============================================================================

create policy "progresso próprio é legível"
  on public.lesson_progress for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "progresso próprio é criável"
  on public.lesson_progress for insert to authenticated
  with check ((select auth.uid()) = user_id and public.has_access());

create policy "progresso próprio é editável"
  on public.lesson_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "progresso próprio é apagável"
  on public.lesson_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Matrícula é derivada: leitura sim, escrita direta não.
-- Quem escreve é o trigger `sync_enrollment()`, que roda como SECURITY DEFINER.
create policy "matrícula própria é legível"
  on public.enrollments for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "aplicação própria é legível"
  on public.applications for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "aplicação própria é criável"
  on public.applications for insert to authenticated
  with check ((select auth.uid()) = user_id and public.has_access());

create policy "aplicação própria é editável"
  on public.applications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "aplicação própria é apagável"
  on public.applications for delete to authenticated
  using ((select auth.uid()) = user_id);

-- =============================================================================
-- Skills
-- =============================================================================

create policy "skills são legíveis"
  on public.skills for select to authenticated
  using (public.has_access() or public.is_staff());

create policy "equipe gere skills"
  on public.skills for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "mapeamento de skills é legível"
  on public.lesson_skills for select to authenticated
  using (public.has_access() or public.is_staff());

create policy "equipe gere mapeamento de skills"
  on public.lesson_skills for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Sinais e scores: leitura do próprio, escrita só por trigger.
-- Nem o aluno nem a equipe escrevem sinal à mão — isso corromperia o histórico
-- que o Skill Engine vai ler.
create policy "sinais próprios são legíveis"
  on public.skill_signals for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

create policy "score próprio é legível"
  on public.skill_scores for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());
