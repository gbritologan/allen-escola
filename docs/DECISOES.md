# Allen Escola — Registro de Decisões (ADR resumido)

> Blueprint completo: `docs/blueprint.html`. Este arquivo é a versão curta e versionável
> das decisões que o código precisa respeitar.
> Última atualização: 23/ago/2026 — fases 1 a 5 construídas, banco no ar.

## Princípio governante

A unidade mínima da Allen não é a aula assistida, é a **aplicação feita**.
Toda decisão abaixo deriva disso.

---

## D-01 · Core de domínio sem React

`src/core/**` é TypeScript puro: tipos, queries, regras e políticas.
Proibido importar `react`, `next/*` ou `src/app/**` — garantido por regra de ESLint,
não por disciplina. É o que torna o app Expo possível depois sem reescrever a escola.

Sem monorepo agora. Quando o mobile existir, `src/core` → `packages/core`.

## D-02 · Mobile consome Supabase direto

Nada de API REST intermediária "para o mobile". Com RLS correta, o cliente nativo
usa o mesmo SDK e as mesmas políticas. Route Handlers só onde há segredo de servidor
(assinatura de vídeo, IA).

## D-03 · `courses.format` em vez de `is_masterclass`

Enum `'course' | 'masterclass'`. Diverge do briefing (que pede booleano) para absorver
o próximo formato sem refatorar catálogo, filtros e busca.

## D-04 · Tema é dado, nunca código

`themes` com slug, posição e status. Home e Explorar renderizam N temas.
Testar com 50 temas antes de entregar a Fase 7.

## D-05 · `course_themes` N:N com posição por tema

Um curso pode ser o 1º de "Vendas" e o 7º de "IA".

## D-06 · `enrollments` é tabela derivada, mantida por trigger

Campos: `last_lesson_id`, `progress_percent`, `completed_lessons`, `completed_at`.
Motivo: "Continue de onde parou" carrega em toda sessão e precisa ser **uma query
indexada**, não um agregado sobre `lesson_progress`.

## D-07 · `applications` é entidade de primeira classe

Não é um booleano dentro de `lesson_progress`. Campos `evidence jsonb` e
`evidence_type` já existem, anuláveis, para que evidências entrem depois sem
migração destrutiva.

## D-08 · `skill_signals` grava desde o dia um

Append-only, escrito por trigger, sem UI e sem custo perceptível.
O Skill Engine precisa de passado — passado não se cria retroativamente.
`skill_scores` é snapshot recalculável, também sem UI no MVP.

## D-09 · Papel no JWT, não em JOIN

`profiles.role` espelhado no token via custom access token hook.
Políticas RLS leem `auth.jwt()` — O(1) por linha, sem JOIN em toda leitura.
Mudança de papel invalida a sessão.

## D-10 · Um único portão de acesso

Função SQL `has_access()` concentra "pode consumir conteúdo" (definida em
`0002_identity.sql`, logo depois de `subscriptions` — uma função SQL tem o corpo
validado na criação, então a tabela precisa existir antes).
Hoje: verdadeiro para conta ativa. Com cobrança: muda em um lugar,
não em quarenta políticas. `subscriptions` existe sem billing.

## D-11 · Permissão mora no banco

O frontend esconde botões; o Postgres nega operações.
Se a UI do Admin vazasse inteira para um aluno, ele não leria nem escreveria
uma linha a mais.

**Provado, não afirmado:** `supabase/tests/0001_policies.sql` roda 13 casos contra
o banco real — aluno não vê rascunho, não lê progresso alheio, não escreve
matrícula, não edita catálogo. 13/13 passaram em 23/ago/2026.

## D-12 · Masterclass não é item de navegação

Ganha superfície própria e apresentação premium, mas como conteúdo em destaque
(bloco na Home + faixa no Explorar), não como quinta aba.
Navegação real: **Início · Explorar · Jornada · Buscar**. Perfil no avatar.

## D-13 · ~~Sem biblioteca de componentes~~ → Convenções shadcn + ponte de tokens

**Revisado em 22/ago/2026, a pedido do Gabriel.**

A decisão original ("nenhuma biblioteca") mirava no alvo certo pelo motivo certo:
não herdar a identidade visual de outra pessoa. Mas ela vetava demais.

21st.dev, Cult UI e Skiper UI não são bibliotecas — são **registries de
copiar-e-colar**: o código cai no nosso repositório e passa a ser nosso.
Isso não conflita com "identidade própria"; conflita com "escrever tudo do zero",
que nunca foi o objetivo.

**O que muda:** adotamos as *convenções* do shadcn/ui, não o tema dele.

1. `cn()` em `@/lib/utils` (clsx + tailwind-merge) — é o import que todo
   componente desses registries faz.
2. `cva` para variantes, Radix onde acessibilidade é difícil, `motion` nas ilhas.
3. **Ponte de tokens** (`src/app/globals.css`): as variáveis semânticas do
   shadcn (`--background`, `--card`, `--primary`, `--border`, `--muted`,
   `--ring`…) são *apelidos* que apontam para os tokens Allen. Um componente
   colado do Cult UI nasce navy e azul Allen sem editar uma linha de cor.

**Regra que continua valendo:** nada entra com cor, raio, sombra, fonte ou
timing próprios. Entra como técnica, sai retokenizado. Ver [D-22](#d-22).

## D-22 · Política de uso dos registries

| fonte | uso | cuidado |
|---|---|---|
| **21st.dev** | maior acervo, padrão shadcn explícito | 12.000+ componentes de autores diferentes — **conferir licença por componente** |
| **Cult UI** | 78 componentes animados, open source, bom nível | o melhor material de vidro do conjunto (`Fluted Glass`) |
| **Skiper UI** | o mais refinado (inspirado em Devouring Details, do Rauno) | boa parte dos componentes é **paga** (US$ 129 vitalício) — decisão de compra é do Gabriel |
| **Uiverse** | CSS art solta, 107+ variações de vidro | qualidade irregular, cada autor traz a própria paleta; usar como **referência de técnica**, quase nunca colar direto |

**Orçamento continua de pé:** rota da aula abaixo de 90KB de JS. Componente
bonito de 60KB não entra no caminho do aluno. No Admin, entra.

## D-19 · Nomes em inglês, exceto o vocabulário do produto

Colunas e identificadores em inglês (`title`, `position`, `status`,
`duration_seconds`). Duas exceções deliberadas: **`para_saber`** e
**`para_fazer`**.

**Why:** traduzir esses dois para `knowledge`/`action` apagaria exatamente o que
distingue a Allen de um LMS. Eles não são campos genéricos, são o produto.

## D-20 · `lessons.course_id` denormalizado

Coluna redundante (dá para chegar nela via `modules`), mantida por trigger
`sync_lesson_course()`.

**Why:** `/curso/[slug]/[aula]` é o caminho mais quente do produto. Resolvê-lo
com JOIN por módulo em toda navegação é custo que não precisa existir. Também
dá a chave única certa: `unique (course_id, slug)`.

## D-21 · Navegação da área do aluno: chrome editorial + dock de vidro

**Decidido em 22/ago/2026.** O rail fixo do wireframe inicial foi descartado.

Um rail reserva 240px permanentes de chrome de aplicativo e espreme todo o
conteúdo numa coluna estreita — é *esse gesto* que faz um produto parecer
dashboard, não os ícones. A Allen é editorial, não é painel de controle.

- **Desktop:** barra superior fina, conteúdo full-bleed.
- **Mobile:** dock de vidro flutuante (aqui o vidro é vidro de verdade: há
  conteúdo passando por trás).
- **Aula:** o chrome some; volta como overlay de vidro no movimento do mouse.
- **Admin:** mantém rail. Ali é ferramenta, usada horas seguidas, e estrutura
  persistente ajuda. Reforça o §19 — aluno e Admin são dois mundos.

**Restrição do Gabriel, que vale como requisito:** rápido de aprender, zero
risco de descoberta. Portanto:

- os quatro destinos ficam **sempre visíveis**, com **rótulo em texto**, nunca só ícone;
- o dock mobile também leva rótulo;
- `⌘K` é atalho para quem descobre, **nunca o único caminho** para nada;
- o único movimento é a barra sumir ao rolar para baixo e voltar ao rolar para
  cima — comportamento já aprendido em outros produtos.

## D-14 · Servidor por padrão, cliente por exceção

Ilhas cliente permitidas: `LessonPlayer`, `ApplicationToggle`, `CommandSearch`,
`StudioEditor`. Todo o resto é Server Component.
`framer-motion` só nas ilhas; entradas e hovers em CSS puro.

## D-15 · Vidro com regra escrita
<!-- receita atualizada em D-27: o material agora é o do Allen Hub -->

Glass apenas onde há algo por baixo que importa: controles do player, modais,
menu de comando, barra mobile, overlay de busca.
Receita única: blur 22px, saturação 140%, borda superior mais clara, sombra longa.
Card de curso não é vidro. Página não é vidro.

## D-16 · Quatro primitivas de motion

| nome | onde | duração | curva |
|---|---|---|---|
| `rise` | entrada de conteúdo, 8px + fade, stagger 40ms | 240ms | (.2,.8,.2,1) |
| `sheen` | loading, luz azul atravessando o skeleton | 1400ms loop | linear |
| `settle` | progresso, sem elástico | 420ms | (.32,.72,0,1) |
| `bloom` | aplicação concluída, glow único | 560ms | (.16,1,.3,1) |

`prefers-reduced-motion` desliga deslocamento e loop, mantém opacidade.

## D-17 · Vídeo atrás de `VideoProvider`

Recomendação para o lançamento: **Bunny Stream** (custo marginal de entrega e CDN
no Brasil). Mux fica como troca de uma implementação. **Pendente de confirmação
de preço vigente e do aval do Gabriel.**
Sempre HLS adaptativo com URL assinada de curta duração.

## D-18 · `resolveHome(user)` desde o início

A Home é composta por blocos tipados resolvidos no servidor. Hoje as regras são
fixas; quando a recomendação chegar, troca-se a função sem tocar na UI.

---

## Orçamento de performance (contratual)

| métrica | alvo |
|---|---|
| LCP da Home | < 1,4s |
| JS na rota da aula | < 90KB |
| Busca: digitar → ver | < 150ms |
| Tela branca | nunca |

---

## Ordem de execução

1. Arquitetura de produto — *este documento*
2. Design system
3. Arquitetura técnica
4. Banco de dados
5. Autenticação e permissões
6. **Admin e Content Studio** ← marco que destrava tudo
7. Área do aluno
8. Player e experiência da aula
9. Progresso e aplicações
10. Masterclass
11. Busca
12. PWA e mobile
13. Camada de Skills

O Content Studio vem antes da área do aluno de propósito: a área do aluno nasce
sobre conteúdo real, não sobre *lorem ipsum*.

---

## Perguntas abertas (bloqueiam a Fase 3)

1. Vídeo: Bunny Stream confirmado?
2. Existe base de alunos para importar?
3. Acesso no lançamento: aberto ou liberação manual?
4. Quem produz conteúdo além do Gabriel? (define se o Studio precisa de revisão)
5. Quantos cursos no dia do lançamento?
6. Data de lançamento?

## D-23 · Login sem senha, por código de 6 dígitos

E-mail + código numérico (`signInWithOtp` → `verifyOtp`), com link mágico como
alternativa para quem preferir clicar.

**Why:** senha é a pior parte de qualquer produto por assinatura — esquece,
vaza, e obriga a construir recuperação. Código de 6 dígitos ainda ganha do link
mágico no celular: a pessoa lê o código na notificação e digita **sem sair do
app**. Link mágico obriga a trocar de aplicativo e às vezes abre em outro
navegador, perdendo a sessão.

Consequências no código:
- `/auth/callback` aceita `token_hash` + `type` (nunca o `?token=` legado, que
  expõe o token na URL e quebra quando o cliente de e-mail pré-carrega links);
- `/sair` é **POST**, não GET — senão um `<img src="/sair">` em qualquer página
  derruba a sessão de quem visita;
- `?destino=` só aceita caminho interno, para não virar redirecionamento aberto.

## D-24 · Toda função nova em `public` nasce exposta — e precisa ser fechada

Descoberto pelo auditor do Supabase: o Postgres dá `EXECUTE` a `PUBLIC` por
padrão e o PostgREST publica como `/rest/v1/rpc/<função>`. Sete funções
`SECURITY DEFINER` estavam ao alcance de anônimo, incluindo
`refresh_course_rollup`, que faz UPDATE.

Corrigido em `0007_harden_functions.sql`. **Regra permanente:** toda função nova
em `public` entra com `revoke execute ... from public, anon` na mesma migration.

O único aviso que sobrou é intencional: `has_access()` precisa ser chamável por
`authenticated` porque a RLS depende dela — e ela só responde sobre o próprio
usuário.

## D-25 · Elvon Grotesk é a fonte, e é a única

**Corrigido em 23/ago/2026.** O briefing em PDF especificava Inter Tight + Inter
+ Fraunces, e foi o que eu implementei. Estava errado: a fonte oficial da Allen
Escola é **Elvon Grotesk**, e Inter é literalmente a tipografia-padrão de todo
projeto genérico.

Uma família só, nove pesos (Thin 100 → Heavy 900), carregados seis. Sem segunda
família, sem serifada editorial.

**Why:** o contraste da marca não vem de misturar tipos — vem da distância entre
100 e 800 dentro do mesmo desenho. Um título em Thin com uma palavra em ExtraBold
diz mais que qualquer par de fontes, e não se parece com nada que venha pronto.

**How to apply:**
- pesos têm nome, não número: `font-hair`, `font-light`, `font-medium`,
  `font-strong`, `font-heavy`;
- **Thin (100) só acima de ~44px.** Abaixo disso a haste desaparece na tela —
  no mobile o mesmo título cai para Light (300);
- títulos **não** nascem em negrito: o padrão de `h1–h4` é Light. Peso é decisão
  de composição, não default;
- arquivos em `src/design/fonts/` (woff2), servidos pelo `next/font/local`.

## D-26 · A zona de entrada tem fundo vivo

Base: componente **Aurora** do React Bits (MIT), portado para TypeScript e
retokenizado no azul Allen. Shader WebGL com ruído simplex — a luz respira de
forma irregular, que é o que separa "fundo animado" de "gradiente girando".

Ajustes nossos, todos por um motivo:
- `prefers-reduced-motion` renderiza **um quadro** e para — quem pediu para não
  animar continua vendo a composição;
- pausa quando a aba perde foco, em vez de rodar rAF para ninguém;
- `devicePixelRatio` limitado a 2;
- máscara em `style` inline, não em classe utilitária: a borda do canvas precisa
  sumir de verdade, e um utilitário que não compile deixa uma linha reta
  atravessando a tela (aconteceu).

O canvas é posicionado de modo que sua faixa luminosa caia **atrás do cartão de
vidro** — mais dois orbs de cor, técnica do Allen Hub. Vidro sem luz atrás é só
um retângulo escuro.

## D-27 · O vidro é o material do Allen Hub

`liquid-glass` em `globals.css` substitui a receita anterior. Vem do Allen Hub,
o produto irmão: dupla camada de fundo, blur 26 + saturação 165%, **reflexo
especular no topo com `mix-blend-mode: screen`**, fio de luz na aresta superior,
inset claro em cima e escuro embaixo, e `prefers-reduced-transparency` caindo
para superfície sólida.

**Why:** é a diferença entre parecer vidro e ser vidro — e é material que a Allen
já desenvolveu. Reaproveitar mantém as duas experiências parecendo da mesma casa.
