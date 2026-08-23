-- =============================================================================
-- 0007 — Fechar as funções que o Postgres abre sozinho.
--
-- Encontrado pelo auditor de segurança do Supabase depois de aplicar 0001–0006.
--
-- No Postgres, toda função nova em `public` nasce com EXECUTE para PUBLIC, e o
-- PostgREST publica isso como `/rest/v1/rpc/<função>`. Para as SECURITY DEFINER
-- isso é exposição sem motivo: as de trigger não deveriam ser chamáveis, e
-- `refresh_course_rollup` faz UPDATE — estava ao alcance de anônimo.
--
-- Chamar uma função de trigger via RPC dá erro de qualquer forma, mas "dá erro"
-- não é o mesmo que "não está exposta".
-- =============================================================================

revoke execute on function public.refresh_course_rollup(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_enrollment() from public, anon, authenticated;
revoke execute on function public.emit_lesson_signals() from public, anon, authenticated;
revoke execute on function public.emit_application_signals() from public, anon, authenticated;
revoke execute on function public.on_lesson_change() from public, anon, authenticated;
revoke execute on function public.on_module_change() from public, anon, authenticated;
revoke execute on function public.sync_lesson_course() from public, anon, authenticated;
revoke execute on function public.stamp_lesson_completion() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- Estas continuam ao alcance de quem está logado: a RLS depende delas, e todas
-- respondem apenas sobre o próprio usuário. O auditor ainda aponta
-- `has_access()` como aviso — é intencional e está documentado aqui.
revoke execute on function public.has_access() from public, anon;
revoke execute on function public.auth_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.f_unaccent(text) from public, anon;

grant execute on function public.has_access() to authenticated;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;
