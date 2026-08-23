# Allen Escola

Escola de habilidades corporativas. Plataforma própria — `app.allenescola.com`.

> **Leia antes de codar:** [`docs/DECISOES.md`](docs/DECISOES.md).
> São as decisões que o código respeita. O blueprint completo, com wireframes e
> plano de execução, está em [`docs/blueprint.html`](docs/blueprint.html).

## Onde a construção está

| fase | estado |
|---|---|
| 01 Arquitetura de produto | pronta |
| 02 Design system | pronta — ver `/design` em desenvolvimento |
| 03 Arquitetura técnica | pronta |
| 04 Banco de dados | pronta — migrations escritas, **ainda não aplicadas** |
| 05 Autenticação e permissões | próxima |
| 06 → 13 | a fazer |

## Rodar

```bash
npm install
cp .env.example .env.local   # preencher
npm run dev
```

`http://localhost:3000/design` mostra a referência viva do design system.
Essa rota não existe em produção — é ferramenta de equipe.

```bash
npm run typecheck   # tsc estrito
npm run lint        # inclui a fronteira do domínio (D-01)
npm run build
```

## Estrutura

```
src/core/       domínio puro — sem React, sem Next, sem UI (D-01)
src/lib/        adaptadores: Supabase, cn()
src/components/ primitivas e superfícies
src/design/     motion
src/app/        rotas
src/proxy.ts    renovação de sessão + desvio óbvio (não é a segurança)
supabase/       migrations e seed
```

A regra de fronteira é aplicada pelo ESLint. Um `import { useState } from 'react'`
dentro de `src/core` falha o lint — de propósito. É isso que mantém o app nativo
possível sem reescrever a escola.

## Banco

Aplicar na ordem, uma vez:

```bash
supabase db push          # ou colar 0001→0006 no SQL Editor, em ordem
psql "$DATABASE_URL" -f supabase/seed.sql
```

**Passo manual obrigatório.** Depois das migrations, ligar o hook de token no
painel do Supabase:

> Authentication → Hooks → Customize Access Token → `public.custom_access_token_hook`

Sem isso, todo usuário é tratado como aluno e ninguém entra no Admin (D-09).

## Componentes de terceiros

21st.dev, Cult UI e Skiper UI publicam no padrão shadcn/ui e colam direto:
`cn()` está em `@/lib/utils` e a ponte de tokens em `src/app/globals.css` faz
`--background`, `--primary`, `--border` apontarem para os tokens Allen.

Regra: **entra como técnica, sai retokenizado.** Nada entra com cor, raio,
sombra, fonte ou timing próprios. Detalhes e cuidados por fonte em D-22.

## Orçamento de performance (contratual)

| métrica | alvo |
|---|---|
| LCP da Home | < 1,4s |
| JS na rota da aula | < 90KB |
| Busca: digitar → ver | < 150ms |
| Tela branca | nunca |

---

## Projeto Supabase

`Allen Escola` · ref **rgebxlktiajcgaphwkyc** · região sa-east-1 · plano gratuito.
Migrations 0001–0007 e o seed **já aplicados** em 23/ago/2026.
Testes de política: `supabase/tests/0001_policies.sql` — 13 de 13 passaram.

### Passos manuais pendentes (só você pode fazer)

A conta `resolvegabriel@gmail.com` **já existe como admin** no banco — é só pedir
o código em `/entrar` que você cai direto no Allen Admin.

1. **Site URL** — Authentication → URL Configuration → `http://localhost:3000`
   agora, `https://app.allenescola.com` na publicação. Sem isso o link do e-mail
   volta para o lugar errado.

2. **SMTP via Resend** — o remetente padrão do Supabase manda poucos e-mails por
   hora e cai em spam. Para desenvolver dá; para alunos reais, não. A Allen já
   usa Resend no portal.

3. **Template de e-mail** (recomendado, não obrigatório) — Authentication →
   Email Templates → Magic Link. Incluir `{{ .Token }}` para o código de 6
   dígitos aparecer, e apontar o link para
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`.
   O callback já aceita o formato padrão (`?code=`), então o login funciona sem
   esta mudança — ela só melhora a experiência e a segurança do link.

4. **Hook de token** (recomendado, não obrigatório) — Authentication → Hooks →
   Customize Access Token → `public.custom_access_token_hook`.
   Desde a migration `0008` o papel tem rede de segurança: sem o hook, ele é
   lido de `profiles`. Ligar o hook elimina esse SELECT por consulta.

5. **`SUPABASE_SERVICE_ROLE_KEY`** no `.env.local` (Settings → API). Ainda não é
   usado por nada; será nos webhooks de vídeo.
