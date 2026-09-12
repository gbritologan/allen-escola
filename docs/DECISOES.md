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

## D-34 · Suporte é produto, não widget alugado

O briefing pede um produto que só poderia ser da Allen. Um balãozinho da
Intercom no canto derruba isso — e cobra por assento, para sempre.

Mas o motivo de construir não é marca. É que **chamado preso a uma aula vira
diagnóstico de conteúdo**. Três pessoas perguntando a mesma coisa na mesma
aula não é volume de suporte: é um Para Saber que não explica, ou um Para
Fazer ambíguo. Nenhum widget alugado sabe o que é uma aula da Allen, e por
isso nenhum conseguiria mostrar isso. O Admin mostra, numa seção própria.

Quatro decisões dentro:

- **Resposta pronta antes de humano.** Não porque gente seja cara, mas porque
  esperar é ruim: quem trava às onze da noite quer a resposta às onze da
  noite. `help_articles` usa o mesmo índice em português do catálogo, e o
  título é a PERGUNTA como a pessoa faria — ninguém busca por substantivo.
- **O contexto viaja sozinho.** Abrir chamado dentro de uma aula anexa a aula.
  Elimina as três mensagens de ida e volta que existem só para descobrir onde
  a pessoa estava.
- **A fila ordena por quem espera há mais tempo**, nunca pelo mais recente.
  Mais-novo-no-topo faz o chamado difícil afundar até virar cliente perdido.
- **Chamado resolvido aceita resposta e reabre sozinho**, por trigger. Fechar
  a porta para quem voltou dizendo "não funcionou" é o defeito mais comum
  desse tipo de sistema.

`from_staff` é conferido pela RLS contra o papel de quem escreve — sem essa
linha, um aluno insere no próprio chamado uma mensagem que aparece como
resposta oficial da Allen. E é congelado na gravação: se um aluno virar
conteudista amanhã, as mensagens antigas dele não podem mudar de lado.

## D-35 · O Mapa: um céu que se acende aplicando

A referência que o Gabriel trouxe (Arkom) mapeia capacidades de IA por área de
negócio, com um mapa estelar navegável. A estrutura é ótima; copiá-la seria
errado, porque ela responde a uma pergunta que não é a da Allen.

O que o mapa da Allen responde é **"onde eu estou"** — a pergunta que uma lista
de catálogo nunca responde, e a que faz aluno de assinatura abrir a plataforma,
não saber por onde continuar, e fechar.

Cada tema é uma constelação, cada curso uma estrela, cada aula um ponto em
volta dela. E a regra que faz este mapa ser da Allen e de mais ninguém:

> **A estrela acende com APLICAÇÃO, não com visualização.**

Assistir deixa cinza. Aplicar acende, com halo. O céu inteiro é o retrato do
que a pessoa FEZ — e é impossível simular progresso deixando vídeo rodando,
que é exatamente o que um mapa de "% assistido" premiaria. O progresso usa a
mesma conta de D-30: assistir vale um quarto.

A identidade grega não é fantasia colada por cima: foram os gregos que
nomearam as constelações, e a Athena já é a figura da marca.

Decisões técnicas:

- **Canvas, não DOM.** São centenas de pontos movendo juntos a cada quadro de
  pan e zoom. Em divs isso é layout recalculado; em canvas é um laço.
- **Posição determinística, nunca `Math.random()`.** Quem aprendeu onde fica
  Negociação precisa achar Negociação amanhã. O deslocamento orgânico vem de
  um hash do id — testado.
- **Toda a geometria em `core/mapa/layout.ts`**, pura e com dez testes. Quem
  desenha não decide nada.
- **Alvo mínimo de 14px** no acerto do clique: ponto de 3px é impossível de
  tocar com o dedo.
- **O estado é dito em palavras** no painel, não só em cor.

`/design/mapa` monta o mesmo componente com um catálogo fictício de seis temas
e dezoito cursos. A Allen tem dois cursos hoje, e um céu de duas estrelas não
deixa ninguém julgar a ideia — a decisão de design precisa ser tomada sobre o
produto cheio.

## D-36 · D-21 revisto: a sidebar entra

A decisão original era não ter sidebar. O argumento era bom: um rail reserva
240px permanentes, espreme o conteúdo, e é o gesto que faz um produto parecer
painel de controle. A Allen é editorial.

O Gabriel pediu a sidebar duas vezes, a segunda depois de usar o produto. É
decisão dele, e ele está certo — por duas razões que só apareceram com o
produto na mão:

1. Os destinos passaram de quatro para seis. Barra horizontal com seis itens
   vira sopa.
2. O Mapa ocupa a tela inteira e é navegação constante. Com barra superior que
   some ao rolar, sair do Mapa exigia rolar para cima antes. Sidebar fixa não
   tem esse problema.

**O que sobrevive de D-21:** rótulo em TEXTO, sempre. Os ícones novos são
âncora visual numa lista vertical — numa coluna de seis itens o ícone é o que
deixa achar sem ler — e nunca aparecem sozinhos. E no celular continua o dock:
sidebar em 375px é o gesto errado.

Efeito colateral bem-vindo: com 240px de casca, o conteúdo `mx-auto` deixa de
boiar num vazio largo em telas grandes.

## D-37 · A cor identifica o setor; o brilho identifica o estado

O Gabriel pediu cor por setor, "sem ficar apapagaiado". As duas coisas juntas
exigem que cor carregue duas informações sem virar duas escalas concorrentes.

**O matiz diz de que constelação a estrela é. A saturação e o brilho dizem em
que estado ela está.** A faixa vai de 196° a 292° — ciano a violeta, com o azul
da marca (244°) no meio. Estreita de propósito: seis matizes espalhados pelo
círculo cromático dariam um mapa de papagaio.

O efeito colateral é o melhor da ideia, e reforça a tese em vez de disputar com
ela: apagado fica quase neutro, aceso fica no tom cheio. **A constelação ganha
cor ao ser feita.**

## D-38 · O núcleo é o catálogo, não o placar

Primeira versão: o enxame central crescia com o número de aplicações. Ficava
quase vazio para quem estava chegando — e o centro é a primeira coisa que a
pessoa vê. Um produto que se apresenta vazio no primeiro dia perde no primeiro
dia.

Agora o núcleo é **uma aula, um ponto**: o conhecimento inteiro da Allen,
sempre completo. As aulas que você aplicou acendem dentro dele.

Isso é melhor por três razões. É honesto — o centro mostra o que existe, não o
que você fez. É estável — não encolhe quando alguém entra. E continua pessoal,
porque a sua parte acesa está lá dentro, contra o total.

## D-39 · Voltar para onde você estava vale para conteúdo, não para vista

O Gabriel entrou e caiu direto no Mapa. Era a regra "volta para onde queria
ir" funcionando: ele estava no Mapa, a sessão barrou, ele entrou, voltou ao
Mapa. Tecnicamente correto, e errado na prática.

A regra é boa e continua: quem clicou no link de uma aula e foi barrado pelo
login precisa cair naquela aula. É isso que faz um link compartilhado valer
alguma coisa.

Mas ela só vale quando o destino **guarda algo específico**. O Mapa não guarda
nada — não tem posição salva, não tem progresso, não é conteúdo. É uma vista,
e você chega nela escolhendo ir. Ser despejado num céu estrelado de tela cheia
logo após digitar um código não devolve nada; só desorienta.

Regra: destino que é vista não vale a volta. Hoje a lista tem só `/mapa`.

**Bug encontrado no caminho:** o proxy gravava `?destino=`, o formulário lia
`destino`, e o callback do link de e-mail lia `next`. Quem digitava o código
voltava ao lugar certo; quem clicava no link do e-mail caía sempre na home.
Dois caminhos de entrada, dois comportamentos. Agora os dois passam pela mesma
função.

## D-40 · O Mapa é automático, e o Studio avisa quando não vai ser

O Mapa lê `themes`, `courses` e `lessons` do banco a cada visita — não há lista
fixa, não há cache, não há passo de publicação separado. Criar um tema já abre
lugar no céu, mesmo antes de ele ter curso.

Duas condições, e a segunda era uma armadilha silenciosa:

1. **`status = 'published'`** no tema, no curso e na aula. Rascunho não aparece
   — que é o certo.
2. **O curso precisa estar ligado a um tema.** Sem isso não existe constelação
   onde pendurá-lo, e o curso simplesmente não aparece. Sem erro. Sem aviso.

A ligação com tema é opcional no Studio, e continua sendo — um curso pode
legitimamente ficar sem tema enquanto está em rascunho. O que mudou é que a
consequência agora está escrita: curso **publicado** sem tema ganha o selo
"fora do Mapa — sem tema" na lista, e o editor diz a mesma coisa na seção de
Temas.

Antes essa informação existia como um "· sem tema" cinza no fim de uma linha de
metadados. Verdadeira, ilegível, e sobre uma consequência que ninguém adivinha.

**Correção pendurada:** a legenda do Mapa mostrava uma bolinha azul ao lado de
"aplicada". Desde que o matiz passou a identificar a constelação (D-37), azul
virou informação errada — o que separa os três estados é o brilho. A legenda
agora mostra os três brilhos num tom neutro.

## D-41 · A função roda onde o banco está

O Gabriel disse que navegar entre itens da sidebar estava lento e "duro". A
causa principal não estava no front-end.

`x-vercel-id: gru1::iad1` — o pedido chegava em São Paulo e era **executado em
Washington**. O banco está em `sa-east-1`, São Paulo. Cada consulta ao Supabase
atravessava o continente e voltava: ~120ms por ida e volta.

Uma navegação faz várias dessas em série: `getUser()` no proxy, `getUser()` +
`profiles` na página, e só então as consultas de dados. Quatro travessias antes
de qualquer pixel.

`vercel.json` com `regions: ["gru1"]` põe a função ao lado do banco. A ida e
volta cai de ~120ms para ~5ms.

**Isso é infraestrutura, não código.** Fica registrado aqui porque é invisível
no repositório e seria facilmente perdido: se o banco um dia mudar de região,
esta linha precisa mudar junto, ou a lentidão volta sem ninguém entender por
quê.

## D-42 · A sidebar depois do uso: Suporte, Apps, Masterclass

Três mudanças pedidas pelo Gabriel, com a sidebar do Arkom como referência.

**"Ajuda" virou "Suporte".** Não é maquiagem: a página tem artigo pronto E
abertura de chamado com histórico e resposta da equipe. "Ajuda" prometia menos
do que ela entrega. A rota mudou junto (`/ajuda` → `/suporte`), com redirect
permanente — o e-mail de notificação de chamado já saiu com links `/ajuda/<id>`
na caixa de entrada de alguém, e renomear rota sem redirecionar é quebrar o que
já foi enviado.

**"Explorar" saiu da sidebar — e a página continua.** Era o catálogo genérico,
e três coisas já fazem esse trabalho melhor: o Mapa mostra onde você está, a
Busca acha pelo nome, a Home recomenda. Mas seis lugares do produto linkam para
`/explorar` ("Ver tudo", "Explorar cursos", o vazio da Busca), e o vazio da
Masterclass agora também. O que saiu foi a cadeira permanente, não a rota.

**"Masterclass" ganhou cadeira.** O formato já existia (`courses.format`), mas
só aparecia como faixa dentro de Explorar e seção da Home: o formato mais caro
de produzir era o mais difícil de achar. D-12 dizia que Masterclass é "formato
editorial, não destino de navegação" — valia com quatro destinos e um produto
pequeno.

**"Apps" entrou como tipo de conteúdo novo** (migration 0015). Não é curso
disfarçado, e a diferença decide o modelo: curso tem aula, módulo, progresso e
aplicação; um app tem uma demonstração e um "como usar". Enfiá-lo em `courses`
traria seis colunas nulas e uma regra de progresso sem sentido — quando você
"conclui" um app?

Reaproveita de propósito o par provider/asset_id do vídeo (D-17), o
`content_status` e o `search_doc`, para os apps entrarem na Busca junto com o
resto.

A ordem da página de um app é a tese: **demonstração, depois como usar, depois
acesso.** Quem chega ainda não sabe se a ferramenta serve; pedir para ler um
passo a passo antes de ver a coisa funcionando é a ordem invertida. O link de
acesso é opcional — um app pode ser anunciado antes de estar liberado, e aí a
página não promete uma porta que não abre.

**Dívida assumida:** o envio de vídeo pela própria tela de Apps não está
ligado. O upload existente está amarrado a `lessons` em seis pontos, e
generalizá-lo sem poder testar um upload real arriscaria o caminho de vídeo dos
cursos, que funciona. Por ora o Studio aceita o ID do vídeo no Bunny.

**Dock do celular:** com sete destinos, a regra antiga ("todos menos Buscar e
Ajuda") deixaria cinco no dock. Os quatro agora são escolhidos a dedo — Início,
Mapa, Apps, Jornada — porque cinco itens numa barra é exatamente a sopa que
tirou a barra horizontal do produto.

## D-43 · O Mapa ganha hierarquia, símbolo e segunda linha

Três apontamentos do Gabriel, com uma referência de constelações na mão.

**A âncora era do tamanho de uma estrela.** Raio 15 contra 10 do curso: 50% de
diferença que o olho lê como ruído, não como hierarquia. Agora é 34 — três
vezes a área — e virou ANEL em vez de disco. Disco cheio desse tamanho seria
uma bola engolindo o céu; o anel ocupa o mesmo espaço e deixa o miolo livre
para o símbolo.

**Faltava a segunda linha.** A referência tem título grande e uma linha de
apoio embaixo. Ela vem de `themes.description`, que já existia e já aparecia na
Home. Some abaixo de 42% de zoom: a essa distância o nome é o que orienta, e a
descrição vira sujeira sob ele.

**Faltavam os símbolos** — e aqui eu errei primeiro. Escrevi dezesseis ícones
de negócio genéricos: megafone, engrenagem, gráfico de barras. O Gabriel mandou
olhar `ICONOGRAFIA ALLEN` antes de inventar, e a pasta é GREGA: coluna,
pergaminho, tocha, louros, pódio, olho, o filósofo de toga. Tem `athena.webp` e
`arena.webp` na marca. O vocabulário já estava lá e eu não tinha olhado.

Refeitos no repertório clássico, com duas diferenças deliberadas em relação aos
ícones de interface:

1. **Silhueta cheia, não traço.** Os originais da pasta são chapados, e no Mapa
   o ícone aparece a ~22px sobre fundo escuro: traço de 1.75 vira borrão nesse
   tamanho.
2. **Sem o canto chanfrado.** O chanfro é assinatura dos ícones de INTERFACE.
   Coluna dórica com capitel cortado em 45° não é estilo, é erro.

**Catorze, não dezesseis.** Louros e elmo falharam duas vezes: a 22px o louros
vira escudo e o elmo vira cadeado — a silhueta perde exatamente o detalhe que
identifica. Catorze que funcionam valem mais que dezesseis com dois que mentem.

**Furos:** `<path>` separado SOMA, não recorta. Olho de máscara e fenda de elmo
precisam estar no mesmo `d`, desenhados com `evenodd`. Foi o que transformou os
dois em manchas na primeira tentativa.

**Uma fonte, dois destinos:** os ícones são STRINGS DE CAMINHO, não JSX. O Mapa
é `<canvas>` e componente React não se desenha nele; string vira `new Path2D(d)`
e acompanha zoom e arrasto de graça. O Studio renderiza as mesmas strings num
`<svg>`.

**Tema é dado (D-04)**, então qual símbolo cada um usa mora em `themes.icon`
(migration 0016), escolhido num seletor visual no Studio — um `<select>` com
nomes seria adivinhação, ninguém escolhe desenho lendo "Ânfora".

## D-44 · Favicon (revisto em D-56)

Não existia favicon nenhum — nem `icon`, nem `apple-icon`. Agora existe, gerado
do símbolo da marca sobre um quadrado navy de cantos arredondados.

Fundo sólido de propósito: a marca é #000DFF sobre transparente, e numa aba
escura ela quase desaparece. O quadrado navy dá o mesmo contraste nos dois
temas de sistema — e é o fundo do próprio produto, então o ícone parece a
plataforma.

## D-45 · "Sair" requintado não é "Sair" invisível

Era `text-ink-4` solto sob o e-mail: mesmo tom do texto secundário, sem borda,
sem alvo de clique próprio. Três cinzas empilhados, e o único que era BOTÃO não
parecia um.

Agora tem contorno, ícone e alvo próprios. Ele se distingue pelo espaço e pela
forma, não pela falta de contraste — que é a diferença entre sutil e escondido.

## D-46 · A condição de acesso é combinada antes de a pessoa existir

O Gabriel mandou os 21 primeiros clientes: um ano de acesso, de 01/09/2026 a
01/09/2027, e pediu que o perfil de cada um sinalizasse vencimento.

**O que estava errado.** O gatilho de cadastro (0009) dava a TODO convidado uma
assinatura `lancamento` ativa e **sem prazo**. Convidar os 21 daria acesso
perpétuo a quem contratou um ano. E `has_access()` conferia só o fim, nunca o
início — uma condição que começa em 01/09 já valeria em 28/08.

(Uma correção ao meu próprio diagnóstico inicial: cheguei a dizer que "qualquer
pessoa do mundo entra". Não é verdade — o login usa `shouldCreateUser: false`,
então só entra quem foi convidado. O problema era o prazo, não a porta.)

**O problema de fundo** é que a condição é combinada ANTES de a pessoa existir.
Ela só vira linha em `auth.users` quando abre o e-mail e digita o código — hoje,
semana que vem, ou nunca. Não havia onde guardar "quando essa pessoa entrar, o
acesso dela é este".

`access_grants` (0017) é esse lugar: a combinação indexada por e-mail,
esperando alguém aparecer. O gatilho consulta e aplica.

**O padrão erra para o lado de deixar entrar.** Sem condição registrada, o
comportamento continua o de antes: ativo, sem prazo. Mudar o padrão para "sem
acesso" trancaria por fora todo convite feito sem lembrar de criar a condição
antes. A condição é que aperta; a ausência dela não pune.

**A ordem importa, e a tela diz isso:** condição primeiro, convite depois. O
gatilho consulta a condição UMA vez, no nascimento da conta. Para quem já
entrou, salvar a condição aplica na assinatura existente na hora — senão salvar
não faria nada visível e pareceria bug.

**Fuso:** o `<input type="date">` entrega `2026-09-01` sem fuso. Sem o `-03`
explícito o Postgres lê como UTC e o acesso abriria às 21h do dia anterior no
Brasil.

## D-47 · Sala de espera: a ausência não explica a si mesma

Sem acesso válido, a RLS esconde tudo — e a pessoa vê a Home sem cursos, o Mapa
sem estrelas, a Busca sem resultados. Tecnicamente correto, e indistinguível de
um produto quebrado.

Alguém que pagou e vê um produto vazio não conclui "meu acesso começa dia 1º".
Conclui que comprou algo que não funciona, e escreve para o suporte no mesmo
minuto.

A sala de espera diz a data. Fica na casca do aluno — um lugar só decide isso;
espalhar a checagem por dez páginas é como nove esquecem.

A equipe passa direto: `has_access()` já abre para `is_staff()`, e travar a
interface faria o admin ver a sala de espera enquanto o Postgres o deixa ver
tudo — a interface mentindo sobre o banco.

**Preço não aparece em lugar nenhum.** O aluno vê janela e plano; quanto pagou
é assunto de cobrança, não de sala de aula.

## D-48 · A capa existia no banco e não existia no produto

`courses.cover_url` está lá desde 0003 e é lido em quatro telas. Nunca houve
como preencher: sem bucket de Storage, sem upload no Studio, e o `CourseCard`
sequer olhava o campo — desenhava sempre a inicial do curso.

Bucket `imagens` (0019), público, com escrita só para a equipe. Três usos, um
mecanismo: capa de curso, retrato de instrutor, banner da Home.

**Público** porque capa é vitrine. URL assinada custaria uma ida ao servidor
por cartão para proteger o que a pessoa já pode ver.

**O nome do arquivo carrega o relógio.** Sem isso, trocar a capa gravaria no
mesmo caminho, a URL não mudaria, e o CDN serviria a imagem velha por horas —
quem trocou juraria que o upload falhou.

**Vídeo continua fora** (D-17: mora no provedor, com ticket que expira). Capa é
cartaz; aula é o produto.

## D-49 · "Em breve" é uma data, não um estado

`available_at` no futuro: o curso aparece no catálogo com a capa e o selo, e
não deixa entrar.

Não virou um quarto valor do enum de propósito. "Em breve" não é estágio de
edição como rascunho — é uma data. Como enum, alguém teria que voltar e trocar
o status na mão no dia certo, e é exatamente o tipo de tarefa que ninguém
lembra de fazer. Como data, o curso abre sozinho.

**Na página do curso, o currículo some.** Mostrar a lista de aulas com todos os
links mortos é pior que não mostrar: a pessoa clica, nada acontece, e conclui
que quebrou. A data ocupa o lugar da lista.

**No cartão, a capa fica dessaturada.** O olho registra "ainda não" antes de
ler o selo.

**Na Home, "Em breve" vem por último.** É promessa, e promessa antes da entrega
inverte a ordem do produto.

## D-50 · O banner: espaço reservado que não aparece vazio

Tabela e não constante, porque trocar o destaque da Home é gesto semanal de
quem escreve (D-04).

**Sem arte, o banner não ocupa espaço nenhum.** Um retângulo com "banner aqui"
no lugar mais nobre da Home é pior que não ter banner: o aluno não sabe que é
espaço reservado, ele vê um defeito.

**A medida (1440×360) está escrita em três lugares** — migration, componente e
Studio — porque é a única arte do produto feita FORA dele. Medida que mora só
na cabeça de quem programou volta errada.

**Publicar um arquiva os outros.** A Home mostra um banner; dois publicados
fariam o segundo sumir sem explicação, e quem publicou juraria que não
funcionou.

## D-51 · O vidro veio com o que ele filtra

D-15 dizia: card é superfície opaca, nunca vidro, "porque não há nada se
movendo por trás dele". O Gabriel pediu vidro como padrão da marca, e eu
levantei essa mesma objeção antes de fazer.

A resposta não foi ignorar a objeção — foi remover a premissa. Junto com o
vidro entrou o `AmbienteAllen`: três massas de luz, grandes e moles, respirando
fora de fase atrás de toda a área do aluno. Ao rolar, cada painel atravessa
regiões de tom diferente, e é isso que faz vidro parecer vidro em vez de
plástico fosco.

**CSS e não a Aurora.** A `Aurora` de WebGL do login é bonita e cara: contexto
GL, shader, laço de animação. Atrás de TODA tela do produto, ela brigaria com a
navegação rápida de D-41. Três gradientes radiais e uma animação de opacidade o
compositor resolve na GPU.

**A intensidade precisou subir.** `vigil-breathe` opera em 13–19% de opacidade
— calibragem de TEXTURA de fundo. Aqui a luz é o assunto, e nessa faixa o vidro
não tinha o que pegar. Cada massa sobrescreve `--vigil-min/max`.

**Dois níveis de vidro, e a diferença é performance:**

- `liquid-glass` (26px) — poucas superfícies, grandes e fixas: sidebar, dock.
- `glass-card` (12px) — o que se repete em grade.

`backdrop-filter` faz o navegador recompor o que está atrás de cada elemento.
Numa grade de doze cartões, 26px derruba o scroll em máquina modesta — e
ninguém distingue 12 de 26 num cartão de 300px.

**`@supports not (backdrop-filter)`** devolve um painel sólido escuro. Sem esse
ramo, onde o filtro não existe o vidro vira um retângulo transparente com texto
ilegível por cima do fundo.

## D-52 · Masterclass não é aula comum com mais enfeite

O Gabriel pediu Masterclass mais premium. A diferença implementada não é
decoração a mais — é uma ordem de leitura diferente, porque as duas coisas são
consumidas de formas diferentes.

**Aula comum é ferramenta.** Você chega sabendo o que quer: lê o título,
assiste, aplica. Título primeiro, vídeo dentro da coluna, peso `font-light` —
o peso de trabalho.

**Masterclass é sessão.** Você reserva o tempo e mergulha. O vídeo vem
primeiro, rompendo a coluna, com moldura escura em volta; o título vem depois,
em `font-hair` — o peso editorial da casa, o mesmo do título do curso. Como a
legenda de um filme, não como a etiqueta de um item.

**O expert aparece, e só nela.** "Um expert. Um assunto. Um mergulho profundo"
— na Masterclass quem ensina é parte do que se compra. Em curso comum o
instrutor já está na página do curso, e repetir em toda aula é ruído mais uma
consulta por navegação.

**O corpo é o mesmo nos dois.** Para Saber, Para Fazer, materiais e o índice do
módulo valem igual — o que muda é a ordem e a moldura. Dois returns com o
conteúdo duplicado seria garantir que a próxima correção entrasse em só um
deles.

## D-53 · O que faltava para "pronta" ser verdade

O Gabriel perguntou se a plataforma estava pronta. Auditoria em vez de
resposta, e ela achou cinco buracos — nenhum deles dependia dele.

**Não existia página de erro nem 404.** Endereço errado devolvia a tela padrão
do Next: fundo branco, fonte do sistema, "This page could not be found" em
inglês. Num produto pago em português, isso não parece link errado — parece que
a empresa sumiu. Pior: exceção não tratada mostrava "Application error: a
client-side exception has occurred", que é o produto morrendo na mão de quem
pagou. A tela de erro nova NÃO mostra a mensagem técnica (pode vazar nome de
tabela) e mostra o `digest`, que é o que liga a tela ao log da Vercel.

**Não existia robots.txt.** `app.allenescola.com` é a plataforma: tudo atrás de
login. Indexar isso não traz aluno — traz o formulário de login da escola no
Google e robô batendo em rota autenticada. Agora é `disallow: /`.

**Foto de instrutor era link colado.** A imagem morava no servidor de outra
pessoa, e link colado sempre cai — um dia a página do curso ficaria com imagem
quebrada e ninguém saberia por quê. Era também a razão de a lista usar `<img>`
cru com `eslint-disable`: `next/image` exige domínio conhecido, e domínio colado
nunca é. Agora sobe para o bucket de 0019, e virou `next/image`.

**Não existia termos nem privacidade.** Com 21 clientes pagantes e dado pessoal
guardado, essa é a falta mais séria da lista. Os dois documentos foram escritos
a partir do SCHEMA — `profiles`, `subscriptions`, `lesson_progress`,
`applications`, `skill_signals`, `support_threads` — não copiados de modelo
genérico. **Precisam de revisão jurídica antes de valer como contrato**, e isso
está escrito no código.

Moram em código e não no banco de propósito: mudança de termos é evento raro e
precisa de rastro. Termo editável por formulário muda sem ninguém saber quando,
e a data de vigência vira mentira.

Abrem sem login, porque quem está decidindo se assina e quem quer conferir o
que aceitou não deveriam precisar de conta para ler as regras.

**`profiles.onboarded_at` existe e ninguém escreve nela.** Fica registrado como
dívida: ou vira boas-vindas de primeiro acesso, ou sai do schema. Coluna que
promete um comportamento inexistente é pior que coluna nenhuma.

## D-54 · Segunda auditoria: uma promessa quebrada e muito ruído

O Gabriel perguntou de novo se estava pronta. Segunda auditoria, agora com os
advisors do próprio Supabase.

**O achado real foi um erro meu.** Eu disse a ele que "os apps também entram na
Busca junto com os cursos". Não entravam. A tabela `apps` ganhou `search_doc` na
0015 e a página de Busca nunca foi ligada nele — consultava só `courses` e
`lessons`. Índice que ninguém lê é trabalho jogado fora, e pior: quem procurasse
pelo nome de uma ferramenta da Allen não a acharia. Corrigido, e os Apps
aparecem ANTES das Aulas: quem digita o nome de uma ferramenta quer a
ferramenta, não a aula que fala dela.

**O ERROR do linter de segurança não é defeito.** `public.curriculum` é
`SECURITY DEFINER` de propósito, e está documentado na 0010: é a vitrine — só
título, posição e duração de conteúdo PUBLICADO, sem vídeo, sem Para Saber, sem
Para Fazer, com `revoke from public, anon`. Ignora a RLS de `lessons` porque é
exatamente isso que uma página de vendas precisa fazer. O linter não tem como
saber a intenção. Cheguei a chamar de vazamento antes de ler a migration — era
minha pressa, não um bug.

**Os WARN de `SECURITY DEFINER` executável são as próprias funções da RLS** —
`has_access`, `auth_role`, `has_course_access`. Elas PRECISAM ser definer para
funcionar dentro de política. Chamá-las por RPC devolve o acesso de quem
chamou, sobre si mesmo.

**Proteção de senha vazada: não se aplica.** O login é por código no e-mail.
Não existe senha para vazar.

**As 33 advertências de performance não são acionáveis hoje**, e registrar isso
é mais útil que agir sobre elas:

- "Índice não usado" em quase tudo significa que as tabelas estão vazias e as
  consultas nunca rodaram. `apps_search_idx` está sem uso porque não há apps.
- "Chave estrangeira sem índice" importa com volume. Com 21 alunos e 4 aulas,
  criar doze índices é pagar custo de escrita e disco por um ganho que não
  existe.
- "Múltiplas políticas permissivas" é o padrão consistente do schema — uma de
  leitura pública, uma de gestão da equipe. Fundir tornaria as regras mais
  difíceis de ler para economizar microssegundos em tabelas de duas linhas.

Revisitar quando houver centenas de alunos e milhares de linhas. Otimizar antes
disso é adivinhação com custo.

## D-55 · A Home abre dizendo onde você está

O Gabriel mandou a referência do Arkom e pediu: saudação pela hora, espaço de
banner, mini dashboard, e o "continue de onde parou".

**Duas dessas já existiam e ele não via**, o que é informação por si só: o
banner (D-50) não aparecia porque nenhum estava publicado, e o "continue" não
aparecia porque ele nunca tinha começado um curso — via o "Comece por aqui",
que é o ramo correto para aluno novo. Nada quebrado; faltava conteúdo.

**O que mudou de verdade foi a ORDEM.** A jornada era o último bloco e virou o
primeiro. O motivo: ela responde "onde eu estou", que é a pergunta com que se
abre a plataforma. No rodapé, ela só respondia para quem já tinha rolado a
página inteira procurando outra coisa.

E ela aparece **sempre**, inclusive zerada. Antes havia uma condição
(`inProgress > 0 || completed > 0`) que a escondia de aluno novo. Um placar que
começa em zero, num produto sobre fazer, não é vazio — é o convite. Esconder
até existir número também esconde o que a escola mede.

**Quatro números, e o terceiro é azul.** Cursos em andamento, aulas concluídas,
**aplicações feitas**, cursos concluídos. Aplicações tem tratamento próprio
porque é a única das quatro que a Allen mede e as outras escolas não — igual às
demais, o painel viraria mais um placar de consumo.

**A saudação tem uma armadilha de fuso.** A Home renderiza no SERVIDOR, e o
servidor da Vercel roda em UTC: `getHours()` devolveria 0 para quem está às 21h
em São Paulo, e o aluno leria "Bom dia" na hora de dormir. O fuso é explícito
(`America/Sao_Paulo`) e há teste para exatamente esse caso. Resolver no cliente
consertaria o fuso e criaria outro problema: o texto piscaria na hidratação.

Os cortes são 5h e 18h, não 6h e 19h: a régua é o hábito brasileiro.

**O desenho saiu da página.** `BlocosDaHome` existe separado porque a Home mora
atrás do login e depende de progresso real — eu não conseguia VER o que estava
construindo. Agora `/design/inicio` monta a mesma tela com dados de mentira, e
as duas desenham o MESMO código em vez de duas cópias que divergem na primeira
correção.

## D-56 · O favicon é a marca solta (revê D-44)

D-44 pôs a marca clara sobre um quadrado navy arredondado. O argumento era
contraste: a marca é #000DFF sobre transparente, e em aba escura ela perde
definição.

O Gabriel pediu sem o quadrado, em azul. É a marca dele, e o argumento contra
tinha um limite: o quadrado navy resolvia contraste e, em troca, fazia o ícone
parecer um app genérico de fundo escuro em vez do símbolo da Allen. Símbolo sem
moldura é mais limpo quando funciona — e a 512px, com o azul cheio, funciona.

**O que o código faz por baixo:** a marca é 301×269, não é quadrada. Ela é
recortada no `getbbox()` antes de medir (folga embutida no PNG faria a margem
sair errada), redimensionada pela maior dimensão e centralizada numa tela
quadrada transparente. Sem isso o navegador esmaga a proporção ao reduzir para
32px.

**A ressalva fica registrada:** em aba de navegador em tema escuro, azul sobre
transparente tem menos contraste que a versão anterior. Se um dia isso
incomodar, o caminho de volta é este parágrafo.

## D-57 · Cursos e Capacitações: duas prateleiras

O Gabriel mandou os vídeos do Arkom e pediu que a aba "Masterclass" virasse
"Capacitações".

Eu li como "Capacitações = o catálogo inteiro", porque é o que a palavra
significa lá, e cheguei a construir assim. Ele corrigiu: quer **as duas
prateleiras separadas**. Está certo — são coisas procuradas em momentos
diferentes, e o banco já as separa em `courses.format`.

- **`/cursos`** — o catálogo geral. Era `/explorar`, que perdeu a cadeira na
  sidebar em D-42 por ter nome vago. "Cursos" é o nome que ela deveria ter tido
  desde o início: diz o que tem dentro. **Tirar o catálogo da sidebar foi erro
  meu** — o Mapa, a Busca e a Home respondem outras perguntas, e nenhuma delas
  é "o que existe para eu estudar?".
- **`/capacitacoes`** — o formato de mergulho, antes chamado Masterclass.

A faixa de Masterclass saiu de dentro de `/cursos`: com destino próprio,
repetir faria a mesma coisa aparecer em dois lugares sem ninguém saber qual é
o certo.

`/masterclass` e `/explorar` redirecionam. Oito destinos na sidebar; o dock do
celular continua com quatro, agora com Cursos no lugar de Apps.

## D-58 · O proxy não sabia quem é admin

O Gabriel clicou em "Admin" e viu a Início. Sem erro, sem 403 — como se o botão
não fizesse nada.

O proxy lia o papel **só** de `app_metadata.allen_role`. Essa claim só existe
se o hook de token estiver ligado no painel do Supabase, e ele não está.
`roleFromClaim(undefined)` devolve `'student'`, e o admin era redirecionado.

Confirmado no banco: a claim está nula nos dois usuários, e o papel dele é
`admin`.

O cruel é que **essa armadilha já estava documentada** — em `getSession()`, com
o fallback para `profiles.role` implementado e o comentário explicando
exatamente este cenário. O proxy ficou de fora, e como ele roda ANTES da
página, a correção de lá nunca chegava a rodar.

O SELECT extra só acontece em rota `/admin` e só quando a claim falta. Ligar o
hook no painel elimina a consulta sozinho.

## D-59 · O nó do Mapa inverteu o contraste

Referência do Arkom, e o pedido foi explícito: "principalmente os ícones".

A âncora era um anel vazado com o símbolo traçado por cima. Funcionava e
sumia: traço fino sobre céu escuro **compete** com as estrelas em vez de mandar
nelas.

O acerto da referência é **contraste invertido** — o nó é claro e o símbolo é
escuro, então ele lê antes de qualquer outra coisa. Aqui o disco não é creme: é
o matiz da constelação em luminosidade alta, o que traz a inversão sem perder a
cor por setor (D-37). O estado continua no brilho: apagada é disco fosco, acesa
queima.

O anel de seleção fica FORA do disco, com folga. Encostado, engrossaria a borda
e leria como parte do nó, não como estado.

**No painel, o símbolo entra junto.** Sem ele, quem clica confia que o painel
abriu sobre o que foi clicado; com ele, a ligação é instantânea. Curso e aula
herdam o símbolo da constelação — é o que amarra a aula ao setor de onde veio.
E entrou o caminho ("de que constelação isto faz parte"): num céu com seis
setores, "Abertura" sozinho não diz de onde veio.

## D-60 · A aula ganha a coluna de três abas

Do vídeo de Capacitações que o Gabriel mandou. Duas etapas num commit só,
porque ele pediu para não parar.

**ABAS, NÃO BLOCOS EMPILHADOS.** A coluna tem 320px, e a lista de aulas de um
curso longo já enche a altura inteira. Empilhados, materiais e anotações
ficariam abaixo da dobra — presentes e invisíveis, o pior dos dois mundos.
"Aulas" abre primeiro porque responde "o que vem agora", a pergunta que se faz
assistindo; anotação é gesto deliberado, e quem vai escrever procura.

**A MINIATURA NÃO PRECISOU DE COLUNA NOVA.** Ela sai do mesmo ticket que serve
o vídeo, e `createPlaybackTicket` não faz requisição — é HMAC local. Virou
`posterUrl()` no contrato do provedor (D-17), **síncrono de propósito**: uma
Promise ali convidaria a um `await` em laço sobre vinte aulas.

**ANOTAÇÕES (0021): uma por aula, não um histórico.** O gesto é reabrir e
reescrever. Chave composta `(user_id, lesson_id)` em vez de id próprio: a
unicidade vira estrutura, não uma regra que alguém precisa lembrar de aplicar.
Texto vazio APAGA a linha — senão quem limpou continuaria com linha no banco e
a aba diria "salvo" sobre o nada.

A anotação é privada até da equipe. É o caderno da pessoa, e a página de
privacidade promete isso.

**AVALIAÇÃO separada do progresso.** `lesson_progress` é o que a pessoa FEZ;
isto é o que ela ACHOU. Misturar faria a régua de progresso depender de
opinião. Cinco `<form>` em vez de estado de cliente: funciona com teclado e sem
hidratar. **Clicar na mesma estrela tira a nota** — sem isso, quem clicasse
errado ficaria preso, e a saída óbvia não faria nada.

**O CAMINHO no topo** substitui o "← Curso". Numa aula a pessoa precisa saber
onde está em quatro níveis; "Abertura" sozinho não diz de que módulo veio.

**CONCLUIR, AVALIAR E AVANÇAR ficam juntos**, numa barra sob o vídeo: são o
mesmo momento — o vídeo acabou. Espalhados, cada um vira uma decisão isolada.

**Erro meu no caminho, registrado:** ao reorganizar o arquivo com um corte por
marcador de texto, o marcador aparecia três vezes e o corte duplicou 170 linhas.
Reparado por linha. A lição é velha e eu repeti: corte por índice de texto em
arquivo grande precisa de marcador único, não do primeiro que aparece.

## D-61 · Apps vira catálogo: logo, teaser, link

O Gabriel definiu a tela em uma frase: a pessoa vê a **logo** do app, o
**teaser** que explica o que ele é, e um **link dedicado** que leva até ele.

A tabela `apps` (0015) já tinha nome, `tagline` e `access_url`. Faltava a
marca, e ela ganhou coluna própria (0022) em vez de reaproveitar qualquer
noção de capa. **Logo não é capa:** capa é cartaz, tem proporção e pode ser
cortada; logo é marca — precisa respirar, não pode ser cortada, e aparece
pequena. Tratar as duas como a mesma coisa é o caminho mais curto para uma
logo esmagada dentro de um 16:9.

No cartão ela é `object-contain` num quadrado com folga e **fundo próprio**:
logo com fundo transparente sobre vidro escuro some quando a marca é escura.

**A ordem dentro do cartão é a frase dele**, e não é arbitrária: num catálogo
de ferramentas a marca é o que se reconhece antes de ler.

**Duas ações, não uma.** "Abrir o app" leva para fora e é o que a maioria quer.
"Como usar" leva à página interna com a demonstração em vídeo e o passo a passo
— e **só aparece quando esse conteúdo existe**. Cartão que promete "como usar"
e abre página vazia é pior que cartão sem a opção.

**Sem `access_url`, o botão vira etiqueta "Em breve"** em vez de um botão que
não faz nada. Um app pode ser anunciado antes de abrir (era a razão de o campo
ser opcional em 0015), e um botão morto é pior que uma promessa honesta.

## D-62 · O disco do Mapa é sempre claro; o estado está na saturação

O Gabriel mandou a captura: a âncora de Vendas era um borrão roxo sem ícone
nenhum. Duas causas, e a segunda é erro meu.

**Nenhum tema tinha ícone.** Os cinco estavam com `icon = null` — o seletor foi
construído em D-43 e nunca usado. Atribuí padrões (olho, máscara, templo,
tocha, estandarte), que ele troca em um clique no Studio. Lição: campo opcional
que ninguém preenche é campo que não existe. Quando o padrão razoável é óbvio,
ele devia ter nascido preenchido.

**E o disco escurecia com o estado.** Eu tinha amarrado a LUZ ao estado
(88 / 62 / 42) para ficar coerente com D-37. Isso quebrava a única coisa que o
disco existe para fazer: sustentar um símbolo ESCURO em cima. Sem nada
aplicado — que é o estado de todo aluno novo — o disco vinha a 42% e o ícone
sumia dentro dele.

Agora a luz varia pouco (78–92), o bastante para o ícone sempre ler, e o estado
migrou para a **saturação**: apagada é quase cinza, acesa é o tom cheio.

A tese de D-37 continua de pé — a constelação ganha COR ao ser feita — e some o
efeito colateral de ela ganhar também legibilidade. **Codificar duas coisas no
mesmo canal só funciona enquanto uma delas não é pré-requisito da outra.**

## D-63 · Só a iconografia original, e o nome grande

Duas correções do Gabriel olhando o Mapa no ar.

**A máscara saiu.** Ela lia como um alienígena de desenho a 22px. Mas o que ele
apontou é mais importante que o desenho ruim: **ela era invenção minha**. A
pasta `ICONOGRAFIA ALLEN` tem um repertório, e os três símbolos que falharam
até agora — louros, elmo, máscara — são justamente os que eu criei "no
espírito" em vez de derivar de lá.

Os cinco temas passaram a usar só originais: olho, ágora (o balão de fala),
coluna, tocha e pódio. **Regra que fica: preferir sempre o que existe na
pasta.** Inventar só quando nenhum original serve, e sabendo que a chance de
errar é maior.

**O nome da constelação era pequeno demais.** 13px com teto de 1,4× virava 11px
no zoom de encaixe — o rótulo sumia ao lado do disco. Na referência, o nome do
setor é o segundo elemento mais forte da tela, depois do nó: caixa alta, bem
espaçado, legível atravessado.

Agora 26px de base com teto de 1,8×, piso de 15px, e o espaçamento subiu de
0,22em para 0,3em. O subtítulo acompanhou.

## D-64 · Habilidades sai da barra do Studio

O Gabriel disse que a tela não fazia sentido ali, e o diagnóstico é concreto:
**o trabalho de verdade acontece em outro lugar.** Ligar uma habilidade a uma
aula é feito no editor da AULA. `/admin/habilidades` só cria, renomeia e apaga
nomes — cinco palavras — ocupando uma cadeira num Studio de nove itens.

Ela saiu da barra e ganhou link no editor de aula, ao lado do mapeamento: é ali
que a necessidade aparece. Você percebe que falta uma habilidade enquanto mapeia
a aula, não navegando por um menu.

A rota continua. Nada foi apagado.

## D-65 · O perfil ganha rosto, contexto e selo

**A foto** fecha um buraco antigo: `avatar_url` existia desde 0002 e nunca teve
caminho de escrita — o mesmo padrão da capa de curso (D-48). Campo lido em
vários lugares, impossível de preencher.

Para isso o bucket precisou de uma fresta: aluno escreve em `avatares/`, e só
ali. D-48 dizia "abrir escrita para depois é como bucket vira lixão" — o
princípio continua; o que mudou é que agora existe um motivo real, e a permissão
é estreita o bastante para não virar porta.

**Empresário é RÁDIO, não caixa.** "Não respondeu" e "respondeu que não" são
estados diferentes, e uma caixa só sabe representar um. Por isso a coluna é
`boolean` anulável e não `not null default false`.

**O site ganha `https://` sozinho** quando a pessoa digita só o domínio.
"suaempresa.com.br" num href vira link relativo e leva para uma página que não
existe dentro do próprio app — é o erro mais comum de campo de URL.

**O SELO DE PIONEIRO NÃO É PREFERÊNCIA, É FATO.** Ele não aparece em nenhum
formulário: mora em `access_grants`, desce para `profiles` no cadastro e só é
lido. Se fosse editável, deixaria de significar alguma coisa.

E `pioneer = profiles.pioneer or excluded.pioneer` no conflito: selo ganho não
se perde num segundo login.

**A tela se divide em duas metades** — em cima o que a Allen sabe e a pessoa não
muda (papel, acesso, selo); embaixo o que é dela. Misturar faria parecer que o
prazo de acesso é editável, e a primeira coisa que alguém tentaria seria
esticá-lo.

**A arte do selo** foi extraída do JPEG da pasta com alfa vindo da luminância
invertida, não de corte binário: a arte tem traço fino, e um corte duro comeria
as bordas. O meio-tom da antisserrilha vira semitransparente, que é o que
preserva o traço.

## D-66 · Liberação programada por aluno (a blindagem dos 7 dias)

O Gabriel decidiu: **acesso começa no pagamento**. E pediu o que a Hotmart faz
— parte do conteúdo abrindo só alguns dias depois, para se blindar do direito
de arrependimento de 7 dias. Sem isso, alguém assina, raspa o catálogo numa
tarde e pede reembolso no sexto dia.

**Isto NÃO é o `available_at` de D-49.** Aquele é data de calendário, igual
para todo mundo, e serve para lançamento ("abre dia 15"). Este é prazo
**relativo à entrada de cada aluno**: quem assinou hoje libera em oito dias;
quem assinar em março libera oito dias depois de março. Os dois convivem e se
somam.

**A trava é na RLS, não na tela.** Conteúdo escondido só na interface está
disponível para quem abre o inspetor — e o motivo inteiro desta mudança é
impedir a raspagem antes do reembolso. `ja_liberado()` entra nas políticas de
`courses` e `lessons`.

A aula exige **os dois prazos**: o dela e o do curso. Um curso liberado em 8
dias com uma aula em 20 significa 20 para aquela aula — e não uma brecha.

**Equipe passa direto**, senão quem produz não conseguiria revisar o que ainda
não abriu.

`dias_de_acesso()` ancora em `subscriptions.started_at`, que é a mesma data que
a Conta mostra ao aluno. Uma fonte só para "desde quando você está aqui".

## D-67 · O Mapa ganha níveis, adaptando o briefing (não copiando)

O Gabriel mandou um briefing detalhado do Mapa e depois o contexto que muda
tudo: **quem escreveu foi o desenvolvedor do site de referência**, descrevendo
como ELE fez. É a arquitetura dele, não necessariamente a certa para a Allen.

**O que foi adotado** (a mecânica, que é o valor do documento):

- Câmera única com `{x, y, z}` animado — já existia, ganhou o voo entre níveis
- Dois lugares por astro: mapa geral e constelação em foco, interpolados
  DURANTE o voo. As partículas se espalham enquanto a câmera viaja, em vez de
  teleportarem no fim
- As outras constelações **recuam para ~15%**, não somem. Cair a zero seria
  troca de tela disfarçada, e o ponto do mapa é ser um lugar só
- Marca d'água gigante do tema em foco, migalha de volta, `Esc` subindo um nível

**O que foi recusado, e por quê:**

**Posições autorais em JSON.** O briefing manda desenhar a constelação à mão e
fixá-la no código. Isso quebraria D-04: tema é dado, criado no Studio às onze
da noite, e passaria a exigir alguém editando o repositório para aparecer no
céu. As posições continuam geradas por `ruido()` — determinístico, então a
constelação é a mesma em toda visita sem deixar de ser automática.

**Clusters entre tema e curso.** A hierarquia dele é tema → cluster → curso. A
nossa é tema → curso → aula, e os módulos vivem DENTRO do curso. Inventar um
nível intermediário para imitar o desenho dele criaria uma camada sem dado por
baixo.

**Zustand.** Ele recomenda store global porque o mapa dele é várias telas. O
nosso é um componente. Store para um consumidor é cerimônia.

**Uma armadilha que quase passou:** o laço de desenho é montado uma vez e roda
até a tela morrer — ele não é recriado a cada estado. Lendo `foco` direto, leria
para sempre o valor do primeiro quadro, e entrar numa constelação não mudaria
nada na tela. O `focoRef` é o que atravessa essa fronteira. O aviso do lint
sobre dependências, aqui, era um bug de verdade esperando para acontecer.

## D-68 · Busca não é lugar, é ação

O Gabriel perguntou se "Buscar" merecia uma cadeira inteira na sidebar. Não
merecia, e o motivo é categórico: **busca não é um destino.** Ninguém acorda
querendo "ir até a busca" — a pessoa quer achar uma coisa, e a busca é o atalho
para isso.

Como destino, ela cobrava **dois gestos** (ir na aba, depois digitar) pelo que
custa um. E ficava invisível exatamente onde serve mais: dentro de um curso, no
meio de uma aula, olhando o Mapa.

Virou um campo acima dos destinos, presente em toda tela, com `⌘K` de qualquer
lugar — e o atalho está ESCRITO no campo, porque atalho que ninguém descobre é
atalho que não existe. A rota `/buscar` continua e faz o trabalho pesado; o que
mudou foi a porta.

**Um bug que só apareceu porque eu olhei a tela.** O dock do celular escolhia
os quatro itens por POSIÇÃO (`DESTINOS[4]`). Com "Buscar" fora da lista, os
índices andaram e o dock passou a mostrar Apps onde devia mostrar Jornada — sem
erro de compilação, sem teste falhando, sem nenhum sinal.

Agora é por href. Lista por posição é uma dependência invisível entre duas
coisas distantes no arquivo, e a única defesa contra ela é alguém reparar.

## D-69 · Pente-fino: três defeitos que ninguém reportou

Auditoria pedida pelo Gabriel. O que ela achou não estava em nenhuma lista de
bugs — são coisas que degradam em silêncio.

**O Studio não tinha NENHUM `loading.tsx`.** Exatamente o buraco que a área do
aluno tinha antes de D-41, com o mesmo custo duplo: o clique não dá sinal até o
servidor responder, e o Next não faz prefetch de rota dinâmica sem fronteira de
loading — então toda navegação começava do zero. Pesa mais aqui: quem
administra passa a tarde trocando de tela.

**O Studio sumia inteiro no celular.** A barra era `hidden md:flex` e não havia
alternativa: no telefone, quem entrasse numa tela ficava preso, sem nem voltar
ao painel. Uma barra de 224px não cabe em 375px — mas "não cabe" é motivo para
virar outra coisa, não para desaparecer. Virou fila rolável no topo.

**Cinco telas tinham "Salvar" mudo.** Você clicava, a página revalidava, e nada
mudava. Quem escreve conteúdo fica sem saber se o texto foi — e o reflexo é
clicar de novo, ou copiar tudo antes por medo de perder.

`BotaoSalvar` dá dois sinais, que respondem perguntas diferentes: "Salvando…"
enquanto a ação está em voo (o clique pegou) e "Salvo" por dois segundos (deu
certo). O segundo some sozinho de propósito — confirmação permanente vira
ruído, e na visita seguinte a pessoa leria "Salvo" sem ter salvado nada.
