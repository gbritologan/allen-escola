-- =============================================================================
-- 0008 — O papel deixa de depender de um clique no painel.
--
-- D-09 revisado. O JWT continua sendo o caminho normal; deixa de ser o único.
--
-- Antes: se o hook `custom_access_token_hook` não estivesse ligado, TODO usuário
-- virava 'student' silenciosamente — inclusive o dono do produto, que então não
-- conseguia entrar no próprio Admin. Falha fechada é bom; falha fechada e
-- silenciosa, dependendo de um passo manual, é armadilha.
--
-- Agora: lê a claim (O(1), sem tocar em tabela). Se ela não existir — hook
-- desligado, ou sessão emitida antes de ligarem — cai para um SELECT em
-- profiles. Com o hook ligado, esse segundo caminho nunca executa: `coalesce`
-- é preguiçoso.
--
-- SECURITY DEFINER é obrigatório aqui: sem ele, ler profiles dispara a política
-- de profiles, que chama is_staff(), que chama esta função — recursão.
-- =============================================================================

create or replace function public.auth_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (case auth.jwt() -> 'app_metadata' ->> 'allen_role'
       when 'admin'       then 'admin'::public.app_role
       when 'editor'      then 'editor'::public.app_role
       when 'org_manager' then 'org_manager'::public.app_role
       when 'student'     then 'student'::public.app_role
       else null
     end),
    (select p.role from public.profiles p where p.id = (select auth.uid())),
    'student'::public.app_role
  )
$$;

revoke execute on function public.auth_role() from public, anon;
grant execute on function public.auth_role() to authenticated;
