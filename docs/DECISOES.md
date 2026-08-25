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

## D-28 · Athena no fundo da zona de entrada

Do brandbook: Athena = sabedoria + estratégia + guerra — e a guerra que é
preparação e execução, não força bruta. Arena mais estudo.

Havia seis desenhos na pasta (três Agon, três Athena). Escolhi a **Athena de pé
com lança, escudo e coruja**, não a sentada que serviu de referência:

- composição vertical ocupa a altura da tela sem cruzar a headline;
- frontal e simétrica, continua legível a 13% de opacidade — pose diagonal a
  essa opacidade vira ruído;
- carrega as três ideias do brandbook numa imagem só.

**Como ela virou fundo, e não ilustração:**

1. O original é traço escuro sobre papel branco. Convertido em traço claro com
   transparência real (alpha derivado da luminância invertida) — em fundo
   escuro, o papel viraria um bloco branco.
2. **Sem `mix-blend-mode`.** A ideia era `screen`, para o traço somar luz à
   aurora. Blend sobre canvas WebGL tira a composição da GPU e travou o
   renderizador do navegador durante o desenvolvimento. Como o traço já é claro
   e o fundo escuro, opacidade normal chega ao mesmo resultado sem custo.
3. Máscara radial nas quatro bordas: ela emerge e se dissolve. Figura com
   aresta dura vira adesivo.
4. **Ordem de camada importa.** Ela vem depois da vinheta. Antes, o degradê
   escuro a apagava — sutil não é invisível.
5. Fica atrás do cartão de vidro de propósito: é o que o vidro difunde (D-15).

**Enquadramento: cintura para cima.** A figura inteira ficava pequena demais
para o espaço. Cortada em 56% da altura (a cintura está em 48%), com os
últimos 22% dissolvendo em rampa — ela termina em névoa, não em corte reto.
Perde-se o escudo com a coruja, mas o elmo tem uma coruja gravada, então o
símbolo permanece.

**O vento é um shader, não CSS.** Ela é uma textura dentro de um fragment
shader, não uma `<img>`. Motivo: CSS move a imagem inteira; não move o cabelo
sem mover o rosto junto. Deslocando a coordenada de leitura por região —
máscara forte no penacho e nas bordas, quase zero no rosto e no peitoral — o
penacho ondula e a face fica parada, que é como vento se comporta. Amplitude
de 0,6% da textura; acima de 1% vira água. Mais uma respiração de 1,2% de
escala em ciclo de 24s.

Medido, não presumido: 12.068 pixels da região do penacho mudam em 1,8s.

### Três bugs que custaram tempo aqui, para não repetir

1. **`img.src` antes de `img.onload`.** Com a imagem em cache o evento dispara
   antes de o listener existir e a textura nunca chega. Handler primeiro, e
   `img.complete` como rede.
2. **`uResolution` em pixels CSS.** `gl_FragCoord` é em pixels do *buffer*.
   Com dpr 2, `uv` ia de 0 a 2 e a figura era desenhada num quarto do canvas.
   O mesmo bug estava na Aurora — ela renderizava diferente em retina e em
   monitor comum. Corrigido nos dois.
3. **Duas convenções de alpha misturadas.** Contexto `premultipliedAlpha:false`
   com saída não pré-multiplicada *parece* consistente, mas o canvas compunha
   errado e a figura não aparecia. Agora tudo pré-multiplicado, igual à Aurora,
   que já funcionava.

## D-29 · A marca tem duas variantes, e escolher errado some com ela

O "a" alado, geradas do mesmo canal alpha:

- **azul** (`#000DFF`) — só onde há luz por trás, como a aurora da entrada.
  Sobre navy chapado, azul sobre azul-escuro não lê.
- **clara** (off-white) — superfícies chapadas: rail do Admin, cabeçalhos.

O arquivo antigo (`logo-allen.png`, marca branca sobre quadrado azul) foi
removido: quadrado sólido não compõe com fundo nenhum.

## D-30 · Assistir conta pela metade, e sem aplicar o nível trava em 40

A camada de skills gravava desde a migration 0005. `resolve-skills.ts` é a
primeira leitura — e a leitura precisa dizer a mesma coisa que o produto diz.

O banco já grava aplicação com peso dobrado (`emit_application_signals`). Só
isso não bastava: com peso 1, **três aulas assistidas davam exatamente o mesmo
número que uma aula aplicada**. Aritmeticamente coerente, e para o produto
errado — o teste `aplicar vale mais que assistir` falhou e a regra foi
corrigida, não o teste.

Três decisões, todas num arquivo puro e testável:

1. `PESO_ESTUDO = 0.5` — assistir conta metade. Com o dobro do banco, dá 4:1:
   quatro aulas vistas para empatar com uma coisa feita.
2. `TETO_SEM_PRATICA = 40` — sem nenhuma aplicação o nível não passa disso.
   Não 0 (seria desonesto com quem estudou); não 70 (aí assistir bastaria).
3. O **estágio** é contado em aplicações, nunca em nível. É o rótulo que a
   pessoa lê primeiro, e ele responde "o que eu já fiz?", não "quanto o
   sistema acha que eu sei?".

A tela do aluno mostra o teto **e** o motivo. Esconder seria mentir por
omissão; mostrar sem explicar seria punir sem dizer por quê.

Nove testes rodam com `npm test` — runner nativo do Node, nenhuma dependência
nova. É o primeiro retorno concreto do `core/` puro (D-01): a regra que define
o produto se prova sem banco, sem React e sem mock.

## D-31 · Toda tabela precisa de um escritor, ou a leitura mente

Três telas liam de tabelas que nada preenchia:

- o seletor de instrutor existia no editor de curso e nascia sempre vazio;
- a aula do aluno renderizava materiais que não havia como criar;
- `emit_lesson_signals` disparava a cada aula concluída e inseria **zero
  linhas**, porque lê `lesson_skills` e nada mapeava aula a habilidade.

O terceiro é o pior tipo de falha: nada quebra. A aula publica, o aluno
assiste, o gatilho roda, e só meses depois alguém descobre que o histórico —
a coisa que "passado não se cria retroativamente" (D-08) existia para
proteger — está vazio.

Por isso o aviso **sem habilidade** entrou ao lado de *sem vídeo* e *sem Para
Fazer*, na mesma altura visual do editor de aula. O custo de esquecer só
aparece tarde demais, então o lembrete tem que aparecer cedo.

## D-32 · O convite é a porta, e é a única exceção à regra da casa

Fechar o cadastro aberto tirou a porta e não colocou outra: só entrava quem já
existisse em `auth.users`, e ninguém tinha como passar a existir. A escola
ficou sem alunos possíveis.

O convite resolve — e obriga a quebrar D-11 num ponto só.

Em todo o resto do produto quem nega é o Postgres, e o código não repete a
checagem. Mas `signInWithOtp({ shouldCreateUser: true })` fala com o GoTrue,
não com o Postgres: nenhuma tabela é lida, então **nenhuma política de RLS é
consultada**. Sem uma verificação em código, `convidarPessoa` seria o mesmo
buraco que 854d193 fechou, escondido dentro do Admin.

Por isso a verificação é a primeira linha da ação, e é `people.manage` (só
admin) — não `canOpenAdmin`, que inclui conteudista. Quem edita conteúdo não
decide quem entra na escola.

Outras três decisões:

- **Não existe apagar pessoa.** Apagar destrói progresso, aplicações e sinais
  de habilidade em cascata, e sinal apagado não volta. Desligar o acesso
  resolve o caso real e preserva o histórico de quem um dia voltar.
- **Ninguém rebaixa a si mesmo.** Um admin sozinho que virasse aluno trancaria
  a escola por fora, com o SQL como única saída.
- **O primeiro acesso é igual ao centésimo.** O convite manda o mesmo código de
  6 dígitos de sempre. Sem senha para inventar, sem "complete seu cadastro" —
  e sem um segundo fluxo de entrada para dar manutenção.

## D-33 · A interface precisa cair para `profiles` como a RLS já caía

`getSession()` lia o papel só da claim do JWT. O banco não: desde 0008,
`auth_role()` cai para `profiles` quando a claim não existe.

A diferença ficava invisível até o pior momento. Com o Custom Access Token
hook desligado no painel, o admin entra, a RLS o reconhece, o Postgres libera
tudo — e a interface o manda para a área do aluno, porque a claim não estava
lá. Painel vazio, nenhum erro, nenhuma pista.

Agora o app cai para a mesma fonte que a RLS consulta. Não afrouxa nada: é o
mesmo dado, e continua fechando em `student` se as duas faltarem.
