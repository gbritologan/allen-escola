-- =============================================================================
-- 0014 — Suporte.
--
-- O que faz o suporte das grandes empresas parecer rápido não é gente digitando
-- depressa. São três coisas, e as três são estruturais:
--
--   1. A MAIORIA DAS PERGUNTAS NÃO CHEGA A UM HUMANO. Uma busca de respostas
--      que funciona resolve o grosso — "como cancelo", "o vídeo não carrega",
--      "troquei de cartão". Por isso `help_articles` vem primeiro, com o mesmo
--      índice em português do catálogo.
--
--   2. O CONTEXTO VAI JUNTO, SEM A PESSOA DIGITAR. Quando alguém abre um
--      chamado dentro de uma aula, a aula vai anexada. Ninguém precisa
--      explicar onde estava, e ninguém do outro lado precisa perguntar.
--
--   3. A CONVERSA TEM UM LUGAR. Não é e-mail solto que se perde numa caixa de
--      entrada: é uma thread que o aluno reabre e vê o histórico.
--
-- E há um ganho que só existe porque isto é próprio, e não um widget alugado:
-- chamado preso a uma aula VIRA DIAGNÓSTICO DE CONTEÚDO. Três pessoas
-- perguntando a mesma coisa na mesma aula não é problema de suporte — é uma
-- aula mal escrita, e o Admin consegue ver isso.
-- =============================================================================

create type public.thread_status as enum (
  'open',      -- a bola está com a Allen
  'waiting',   -- respondemos, a bola está com a pessoa
  'resolved'
);

-- --- Respostas prontas -------------------------------------------------------
--
-- O título é a PERGUNTA, escrita como a pessoa faria — "Como cancelo minha
-- assinatura?", não "Cancelamento". Ninguém busca por substantivo.
create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  question text not null,
  answer text not null,
  -- Agrupa na tela. Texto livre e não enum: a lista muda com o produto.
  category text,
  position integer not null default 0,
  status public.content_status not null default 'draft',
  -- Quantas vezes foi aberta. É o dado que diz o que as pessoas realmente
  -- procuram — e, por tabela, o que o produto está explicando mal.
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_doc tsvector generated always as (
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(question, ''))), 'A') ||
    setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(answer, ''))), 'B')
  ) stored
);

create index help_articles_search_idx on public.help_articles using gin (search_doc);
create index help_articles_order_idx on public.help_articles (position) where status = 'published';

create trigger help_articles_set_updated_at
  before update on public.help_articles
  for each row execute function public.set_updated_at();

-- --- Conversas ---------------------------------------------------------------

create table public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  status public.thread_status not null default 'open',

  -- O contexto que viaja junto sem ninguém digitar.
  context_path text,
  lesson_id uuid references public.lessons (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,

  -- Mantido por trigger. Ordenar a caixa de entrada por "quem esperou mais"
  -- é a única ordenação que importa num suporte.
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_threads_user_idx on public.support_threads (user_id, last_message_at desc);
create index support_threads_fila_idx on public.support_threads (last_message_at)
  where status = 'open';
create index support_threads_lesson_idx on public.support_threads (lesson_id)
  where lesson_id is not null;

create trigger support_threads_set_updated_at
  before update on public.support_threads
  for each row execute function public.set_updated_at();

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  -- Congelado na gravação, e não deduzido do papel na leitura: se um aluno
  -- virar conteudista amanhã, as mensagens antigas dele não podem passar a
  -- aparecer como resposta da Allen.
  from_staff boolean not null default false,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index support_messages_thread_idx on public.support_messages (thread_id, created_at);

-- --- Quem está esperando -----------------------------------------------------

create or replace function public.tocar_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_threads t
     set last_message_at = new.created_at,
         -- Quem falou por último define de quem é a bola. Um chamado resolvido
         -- que recebe resposta do aluno reabre sozinho — senão ele morre em
         -- silêncio e a pessoa fica sem resposta achando que respondeu.
         status = case when new.from_staff then 'waiting'::public.thread_status
                                           else 'open'::public.thread_status end,
         resolved_at = null
   where t.id = new.thread_id;
  return null;
end;
$$;

create trigger support_messages_tocar_thread
  after insert on public.support_messages
  for each row execute function public.tocar_thread();

revoke all on function public.tocar_thread() from public, anon, authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.help_articles    enable row level security;
alter table public.support_threads  enable row level security;
alter table public.support_messages enable row level security;

-- Ajuda é para todo mundo que tem conta, com acesso ou sem. Quem está com o
-- pagamento recusado é justamente quem mais precisa achar a resposta.
create policy "ajuda publicada é legível"
  on public.help_articles for select to authenticated
  using (status = 'published' or public.is_staff());

create policy "equipe gere a ajuda"
  on public.help_articles for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "chamado próprio é legível"
  on public.support_threads for select to authenticated
  using ((select auth.uid()) = user_id or public.is_staff());

create policy "abre chamado próprio"
  on public.support_threads for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- O aluno não muda status: ele responde, e o trigger reabre. Mexer no status
-- é da equipe — senão "resolvido" vira botão que o aluno aperta sem querer.
create policy "equipe gere chamados"
  on public.support_threads for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "mensagens do próprio chamado são legíveis"
  on public.support_messages for select to authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.support_threads t
       where t.id = support_messages.thread_id and t.user_id = (select auth.uid())
    )
  );

-- `from_staff` é verificado contra o papel de verdade: sem esta linha, um
-- aluno insere uma mensagem marcada como resposta da Allen no próprio chamado.
create policy "escreve no próprio chamado"
  on public.support_messages for insert to authenticated
  with check (
    (select auth.uid()) = author_id
    and from_staff = public.is_staff()
    and (
      public.is_staff() or exists (
        select 1 from public.support_threads t
         where t.id = support_messages.thread_id and t.user_id = (select auth.uid())
      )
    )
  );

-- --- Contagem de leitura -----------------------------------------------------
--
-- `views` precisa subir para quem só lê, e leitor não tem UPDATE em
-- `help_articles`. Uma função definer, restrita a incrementar um contador,
-- é menos perigosa que abrir a tabela para escrita.
create or replace function public.contar_leitura(p_slug text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.help_articles set views = views + 1
   where slug = p_slug and status = 'published';
$$;

revoke execute on function public.contar_leitura(text) from public, anon;
grant execute on function public.contar_leitura(text) to authenticated;

-- --- As primeiras respostas --------------------------------------------------
--
-- Escritas como pergunta, na voz da Allen: direto, sem "prezado cliente".
insert into public.help_articles (slug, question, answer, category, position, status) values
  ('entrar-sem-senha', 'Como entro? Não me lembro da senha.',
   E'A Allen não tem senha.\n\nEm app.allenescola.com/entrar você digita seu e-mail e recebe um código de 6 dígitos. Digita o código e pronto.\n\nO código vale 1 hora e serve uma vez só. Se não chegar em dois minutos, olhe o spam — e peça outro, que o anterior deixa de valer.',
   'Acesso', 1, 'published'),

  ('codigo-nao-chega', 'O código não chegou no meu e-mail.',
   E'Três causas, nesta ordem de probabilidade:\n\n1. Caiu no spam ou em "Promoções". Procure por "Allen".\n2. O e-mail digitado tem um erro. Confira letra por letra.\n3. Você ainda não tem conta. A Allen é por convite ou por compra — a tela de entrada não cria conta.\n\nSe nada disso resolver, fale com a gente por aqui mesmo.',
   'Acesso', 2, 'published'),

  ('video-nao-carrega', 'O vídeo não carrega ou trava.',
   E'Primeiro, recarregue a página. O link do vídeo expira depois de um tempo por segurança, e recarregar gera um novo — isso resolve a maioria dos casos.\n\nSe continuar: teste outra rede (trocar do Wi-Fi para o 4G, ou o contrário). Se travar nas duas, nos conte qual aula e qual aparelho.',
   'Aulas', 3, 'published'),

  ('o-que-e-para-fazer', 'O que é o "Para Fazer" e por que ele importa tanto?',
   E'É a ação concreta que você executa na sua própria rotina depois da aula.\n\nNa Allen, assistir não conclui nada. O que conclui é marcar que você aplicou — e é isso que move sua habilidade na Minha Jornada.\n\nNão é rigor por rigor: vinte aulas assistidas sobre negociação e zero negociações conduzidas não é habilidade, é conteúdo consumido. O produto foi construído para não deixar você se enganar sobre isso.',
   'Aulas', 4, 'published'),

  ('habilidade-nao-sobe', 'Minha habilidade parou de subir.',
   E'Provavelmente você está assistindo e não aplicando.\n\nSem nenhuma aplicação marcada, o nível de uma habilidade para em 40 e não passa disso, por mais aulas que você veja. A tela diz isso quando acontece.\n\nMarque o "Para Fazer" de uma aula como aplicado e o teto sai na hora.',
   'Aulas', 5, 'published'),

  ('cancelar', 'Como cancelo minha assinatura?',
   E'Em Conta → Minha assinatura, botão "Cancelar assinatura".\n\nVocê continua com acesso até o fim do período já pago — não perde os dias que comprou. Não há multa e não há ligação de retenção.\n\nSe voltar depois, seu progresso e suas aplicações estarão exatamente onde ficaram.',
   'Assinatura', 6, 'published'),

  ('trocar-cartao', 'Preciso trocar meu cartão.',
   E'Em Conta → Minha assinatura, "Trocar cartão".\n\nSe a cobrança já falhou, trocar o cartão faz a Allen tentar de novo na hora — você não precisa esperar o próximo mês.',
   'Assinatura', 7, 'published'),

  ('nota-fiscal', 'Onde pego a nota fiscal?',
   E'Ela é emitida automaticamente a cada pagamento e vai para o seu e-mail.\n\nAs anteriores ficam em Conta → Minha assinatura, na lista de cobranças.\n\nNo plano Empresarial a nota sai no CNPJ cadastrado na compra.',
   'Assinatura', 8, 'published'),

  ('time-vagas', 'Como coloco mais gente no meu time?',
   E'Em Meu Time você convida por e-mail, e a pessoa entra com o código dela — sem senha, sem cadastro.\n\nO plano Empresarial vem com 3 vagas, e uma delas é sua: quem contrata estuda junto.\n\nPara passar de 3, cada vaga extra custa R$ 80 por mês, e as pessoas novas precisam ter e-mail do domínio da sua empresa.',
   'Time', 9, 'published'),

  ('ver-progresso-time', 'O que eu consigo ver do meu time?',
   E'O que cada pessoa concluiu e quantas aplicações fez.\n\nSó isso, e de propósito: não há nota, não há tempo de tela, não há relatório de quanto tempo alguém ficou com o vídeo aberto.\n\nUm gestor que enxerga só "assistiu 80%" cobra a coisa errada. O que interessa é o que virou prática.',
   'Time', 10, 'published')
on conflict (slug) do nothing;
