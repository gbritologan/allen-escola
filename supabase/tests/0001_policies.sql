-- =============================================================================
-- TESTES DE POLÍTICA — a prova de que a segurança está no banco (D-11).
--
-- Rode contra um projeto com as migrations 0001–0007 e o seed aplicados.
-- Executado em 23/ago/2026 contra o projeto `Allen Escola`: 13 de 13 passaram.
--
-- Cada caso simula um usuário real assumindo o papel `authenticated` e
-- injetando as claims do JWT — exatamente o que o PostgREST faz em produção.
-- Se um destes falhar, é vazamento de dado, não bug de UI.
--
-- Ao final, os dados de teste são removidos.
-- =============================================================================

-- --- Preparação --------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-000000000001', 'authenticated', 'authenticated',
   'aluno.a@teste.allen', '', now(), now(), now(), '{"provider":"email"}', '{"full_name":"Aluno A"}'),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-a000-000000000002', 'authenticated', 'authenticated',
   'aluno.b@teste.allen', '', now(), now(), now(), '{"provider":"email"}', '{"full_name":"Aluno B"}'),
  ('00000000-0000-0000-0000-000000000000', 'eeeeeeee-0000-4000-a000-000000000001', 'authenticated', 'authenticated',
   'editor@teste.allen', '', now(), now(), now(), '{"provider":"email"}', '{"full_name":"Conteudista"}')
on conflict (id) do nothing;

update public.profiles set role = 'editor' where id = 'eeeeeeee-0000-4000-a000-000000000001';

insert into public.courses (id, slug, title, summary, format, status)
values ('44444444-0000-4000-a000-000000000009', 'curso-rascunho', 'Curso em rascunho',
        'Não deve aparecer para aluno nenhum.', 'course', 'draft')
on conflict (id) do nothing;

create table if not exists public._rls_test_results (
  n int, caso text, esperado text, obtido text, passou boolean
);
truncate public._rls_test_results;

-- --- Casos -------------------------------------------------------------------

do $test$
declare
  ALUNO_A constant uuid := 'aaaaaaaa-0000-4000-a000-000000000001';
  ALUNO_B constant uuid := 'aaaaaaaa-0000-4000-a000-000000000002';
  EDITOR  constant uuid := 'eeeeeeee-0000-4000-a000-000000000001';
  AULA_1  constant uuid := '66666666-0000-4000-a000-000000000001';
  CURSO   constant uuid := '44444444-0000-4000-a000-000000000001';
  v_int int;
  v_num numeric;
begin
  ---------------------------------------------------------------- aluno vê só publicado
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', ALUNO_A, 'role', 'authenticated',
                      'app_metadata', json_build_object('allen_role','student'))::text, true);

  select count(*) into v_int from public.courses;
  insert into public._rls_test_results values
    (1, 'Aluno enxerga só curso publicado', '2', v_int::text, v_int = 2);

  select count(*) into v_int from public.courses where status = 'draft';
  insert into public._rls_test_results values
    (2, 'Aluno NÃO enxerga rascunho', '0', v_int::text, v_int = 0);

  ---------------------------------------------------------------- conteudista vê rascunho
  perform set_config('request.jwt.claims',
    json_build_object('sub', EDITOR, 'role', 'authenticated',
                      'app_metadata', json_build_object('allen_role','editor'))::text, true);

  select count(*) into v_int from public.courses where status = 'draft';
  insert into public._rls_test_results values
    (3, 'Conteudista ENXERGA rascunho', '1', v_int::text, v_int = 1);

  ---------------------------------------------------------------- progresso próprio
  perform set_config('request.jwt.claims',
    json_build_object('sub', ALUNO_A, 'role', 'authenticated',
                      'app_metadata', json_build_object('allen_role','student'))::text, true);

  insert into public.lesson_progress (user_id, lesson_id, state, position_seconds, watched_seconds)
  values (ALUNO_A, AULA_1, 'completed', 700, 700)
  on conflict (user_id, lesson_id) do update set state = 'completed';

  insert into public._rls_test_results values
    (4, 'Aluno grava o próprio progresso', 'ok', 'ok', true);

  ---------------------------------------------------------------- triggers derivados
  execute 'set local role postgres';
  select progress_percent into v_int from public.enrollments
   where user_id = ALUNO_A and course_id = CURSO;
  insert into public._rls_test_results values
    (5, 'Trigger criou matrícula com 1/3 = 33%', '33', coalesce(v_int::text,'null'), v_int = 33);

  select count(*) into v_int from public.skill_signals
   where user_id = ALUNO_A and kind = 'lesson_completed';
  insert into public._rls_test_results values
    (6, 'Aula concluída emitiu sinal de skill', '1', v_int::text, v_int = 1);

  ---------------------------------------------------------------- isolamento entre alunos
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',
    json_build_object('sub', ALUNO_B, 'role', 'authenticated',
                      'app_metadata', json_build_object('allen_role','student'))::text, true);

  select count(*) into v_int from public.lesson_progress;
  insert into public._rls_test_results values
    (7, 'Aluno B NÃO lê progresso do Aluno A', '0', v_int::text, v_int = 0);

  select count(*) into v_int from public.enrollments;
  insert into public._rls_test_results values
    (8, 'Aluno B NÃO lê matrícula do Aluno A', '0', v_int::text, v_int = 0);

  begin
    insert into public.lesson_progress (user_id, lesson_id, state)
    values (ALUNO_A, '66666666-0000-4000-a000-000000000002', 'in_progress');
    insert into public._rls_test_results values
      (9, 'Aluno B NÃO grava progresso no lugar de A', 'bloqueado', 'PASSOU!', false);
  exception when others then
    insert into public._rls_test_results values
      (9, 'Aluno B NÃO grava progresso no lugar de A', 'bloqueado', 'bloqueado', true);
  end;

  ---------------------------------------------------------------- matrícula é derivada
  begin
    insert into public.enrollments (user_id, course_id) values (ALUNO_B, CURSO);
    insert into public._rls_test_results values
      (10, 'Matrícula é derivada: escrita direta bloqueada', 'bloqueado', 'PASSOU!', false);
  exception when others then
    insert into public._rls_test_results values
      (10, 'Matrícula é derivada: escrita direta bloqueada', 'bloqueado', 'bloqueado', true);
  end;

  ---------------------------------------------------------------- aluno não toca no catálogo
  update public.courses set title = 'invadido' where id = CURSO;
  get diagnostics v_int = ROW_COUNT;
  insert into public._rls_test_results values
    (11, 'Aluno NÃO edita curso', '0 linhas', v_int::text || ' linhas', v_int = 0);

  delete from public.courses where id = CURSO;
  get diagnostics v_int = ROW_COUNT;
  insert into public._rls_test_results values
    (12, 'Aluno NÃO apaga curso', '0 linhas', v_int::text || ' linhas', v_int = 0);

  ---------------------------------------------------------------- a tese, no dado
  perform set_config('request.jwt.claims',
    json_build_object('sub', ALUNO_A, 'role', 'authenticated',
                      'app_metadata', json_build_object('allen_role','student'))::text, true);

  insert into public.applications (user_id, lesson_id, note)
  values (ALUNO_A, AULA_1, 'Escrevi os três números.')
  on conflict do nothing;

  execute 'set local role postgres';
  select value into v_num from public.skill_signals
   where user_id = ALUNO_A and kind = 'application_completed' limit 1;
  insert into public._rls_test_results values
    (13, 'Aplicação emite sinal com peso dobrado (1.00 → 2.00)', '2.00', coalesce(v_num::text,'null'), v_num = 2.00);

  execute 'reset role';
end
$test$;

select n, caso, esperado, obtido, case when passou then 'PASSOU' else 'FALHOU' end as resultado
  from public._rls_test_results order by n;

-- --- Limpeza -----------------------------------------------------------------

delete from auth.users where email like '%@teste.allen';
delete from public.courses where id = '44444444-0000-4000-a000-000000000009';
drop table if exists public._rls_test_results;
