-- =============================================================================
-- SEED — catálogo mínimo para desenvolver contra conteúdo real.
--
-- Não é conteúdo de produção. Existe para que a área do aluno nasça sobre algo
-- verdadeiro em vez de lorem ipsum — e para provar, já na Fase 4, que a
-- estrutura aguenta um curso e uma Masterclass ao mesmo tempo.
--
-- UUIDs fixos: rodar de novo é idempotente.
-- =============================================================================

-- --- Temas -------------------------------------------------------------------
insert into public.themes (id, slug, name, description, accent, position, status) values
  ('11111111-0000-4000-a000-000000000001', 'dados-e-tecnologia', 'Dados e Tecnologia',
   'Ler números, tomar decisão e conversar com quem constrói.', '#4C41FF', 1, 'published'),
  ('11111111-0000-4000-a000-000000000002', 'marketing', 'Marketing',
   'Atenção, posicionamento e demanda — sem fórmula mágica.', '#4C41FF', 2, 'published'),
  ('11111111-0000-4000-a000-000000000003', 'ferramentas', 'Ferramentas',
   'O que usar, quando usar e o que deixar de usar.', '#4C41FF', 3, 'published'),
  ('11111111-0000-4000-a000-000000000004', 'inteligencia-artificial', 'Inteligência Artificial',
   'Colocar IA para trabalhar no que você já faz.', '#4C41FF', 4, 'published'),
  ('11111111-0000-4000-a000-000000000005', 'vendas', 'Vendas',
   'Prospecção, condução e fechamento na prática.', '#4C41FF', 5, 'published')
on conflict (id) do nothing;

-- --- Skills ------------------------------------------------------------------
insert into public.skills (id, slug, name, description) values
  ('22222222-0000-4000-a000-000000000001', 'negociacao', 'Negociação',
   'Conduzir uma conversa com interesses divergentes até um acordo.'),
  ('22222222-0000-4000-a000-000000000002', 'comunicacao', 'Comunicação',
   'Ser entendido na primeira vez.'),
  ('22222222-0000-4000-a000-000000000003', 'analise-de-dados', 'Análise de dados',
   'Sair do achismo sem virar planilha ambulante.'),
  ('22222222-0000-4000-a000-000000000004', 'uso-de-ia', 'Uso de IA',
   'Transformar uma ferramenta genérica em vantagem específica.'),
  ('22222222-0000-4000-a000-000000000005', 'prospeccao', 'Prospecção',
   'Encontrar e abrir conversa com quem pode comprar.')
on conflict (id) do nothing;

-- --- Instrutores -------------------------------------------------------------
insert into public.instructors (id, slug, name, headline, bio) values
  ('33333333-0000-4000-a000-000000000001', 'equipe-allen', 'Equipe Allen',
   'Time da Allen', 'Conteúdo produzido internamente pela Allen.'),
  ('33333333-0000-4000-a000-000000000002', 'convidado-exemplo', 'Convidado (exemplo)',
   'Especialista convidado', 'Perfil de exemplo para validar o layout de Masterclass.')
on conflict (id) do nothing;

-- =============================================================================
-- CURSO — Negociação
-- =============================================================================
insert into public.courses (id, slug, title, summary, description, format, instructor_id, status, published_at) values
  ('44444444-0000-4000-a000-000000000001', 'negociacao', 'Negociação',
   'Conduzir uma negociação sem depender de sorte nem de script decorado.',
   'Um curso curto e prático sobre preparar, conduzir e fechar negociações no trabalho. Cada aula termina com uma aplicação que você faz na sua própria rotina.',
   'course', '33333333-0000-4000-a000-000000000001', 'published', now())
on conflict (id) do nothing;

insert into public.course_themes (course_id, theme_id, position) values
  ('44444444-0000-4000-a000-000000000001', '11111111-0000-4000-a000-000000000005', 1),
  ('44444444-0000-4000-a000-000000000001', '11111111-0000-4000-a000-000000000002', 4)
on conflict do nothing;

insert into public.modules (id, course_id, title, summary, position, status) values
  ('55555555-0000-4000-a000-000000000001', '44444444-0000-4000-a000-000000000001',
   'Preparação', 'O que decidir antes de entrar na sala.', 1, 'published'),
  ('55555555-0000-4000-a000-000000000002', '44444444-0000-4000-a000-000000000001',
   'Condução', 'O que fazer quando a conversa já começou.', 2, 'published')
on conflict (id) do nothing;

insert into public.lessons
  (id, module_id, course_id, slug, title, description, position, status, duration_seconds, para_saber, para_fazer)
values
  ('66666666-0000-4000-a000-000000000001', '55555555-0000-4000-a000-000000000001',
   '44444444-0000-4000-a000-000000000001', 'o-que-esta-em-jogo', 'O que está em jogo',
   'Separar o que você quer do que você precisa antes de qualquer conversa.',
   1, 'published', 720,
   'Toda negociação tem três números: o que você pede, o que você aceita e o ponto em que sair da mesa é melhor que fechar. Quem entra sem os três definidos negocia com o outro lado e consigo mesmo ao mesmo tempo.',
   'Escolha uma negociação que você tem nos próximos 15 dias e escreva os três números em uma linha cada. Guarde onde você vai reler antes da conversa.'),

  ('66666666-0000-4000-a000-000000000002', '55555555-0000-4000-a000-000000000001',
   '44444444-0000-4000-a000-000000000001', 'a-informacao-que-falta', 'A informação que falta',
   'O que você precisa descobrir antes de propor qualquer coisa.',
   2, 'published', 840,
   'A maior parte das concessões desnecessárias acontece por falta de informação, não por falta de firmeza. Antes de propor, mapeie o que o outro lado precisa resolver — e o prazo dele.',
   'Liste três perguntas que você ainda não sabe responder sobre o outro lado. Envie pelo menos uma delas antes da próxima conversa.'),

  ('66666666-0000-4000-a000-000000000003', '55555555-0000-4000-a000-000000000002',
   '44444444-0000-4000-a000-000000000001', 'como-conduzir', 'Como conduzir uma negociação',
   'Manter a conversa avançando sem ceder por reflexo.',
   1, 'published', 960,
   'Silêncio não é hostilidade e pausa não é fraqueza. Quando a proposta vier, a resposta mais útil quase nunca é um contra-número imediato — é uma pergunta que devolve o problema para a mesa.',
   'Na próxima negociação, conte até três antes de responder à primeira proposta. Anote depois o que mudou na conversa.')
on conflict (id) do nothing;

insert into public.lesson_skills (lesson_id, skill_id, weight) values
  ('66666666-0000-4000-a000-000000000001', '22222222-0000-4000-a000-000000000001', 1.00),
  ('66666666-0000-4000-a000-000000000002', '22222222-0000-4000-a000-000000000001', 1.00),
  ('66666666-0000-4000-a000-000000000002', '22222222-0000-4000-a000-000000000005', 0.50),
  ('66666666-0000-4000-a000-000000000003', '22222222-0000-4000-a000-000000000001', 1.50),
  ('66666666-0000-4000-a000-000000000003', '22222222-0000-4000-a000-000000000002', 1.00)
on conflict do nothing;

-- =============================================================================
-- MASTERCLASS — um expert, um assunto, um mergulho profundo.
-- Mesma estrutura, formato diferente. É só isso que `format` muda no banco;
-- o resto da diferença é apresentação.
-- =============================================================================
insert into public.courses (id, slug, title, summary, description, format, instructor_id, status, published_at) values
  ('44444444-0000-4000-a000-000000000002', 'ia-no-trabalho-diario', 'IA no trabalho diário',
   'Um mergulho em como usar IA no que você já faz toda semana.',
   'Masterclass de exemplo, criada para validar a apresentação editorial do formato.',
   'masterclass', '33333333-0000-4000-a000-000000000002', 'published', now())
on conflict (id) do nothing;

insert into public.course_themes (course_id, theme_id, position) values
  ('44444444-0000-4000-a000-000000000002', '11111111-0000-4000-a000-000000000004', 1),
  ('44444444-0000-4000-a000-000000000002', '11111111-0000-4000-a000-000000000003', 2)
on conflict do nothing;

insert into public.modules (id, course_id, title, summary, position, status) values
  ('55555555-0000-4000-a000-000000000003', '44444444-0000-4000-a000-000000000002',
   'O mergulho', 'Sessão única, dividida em partes.', 1, 'published')
on conflict (id) do nothing;

insert into public.lessons
  (id, module_id, course_id, slug, title, description, position, status, duration_seconds, para_saber, para_fazer)
values
  ('66666666-0000-4000-a000-000000000004', '55555555-0000-4000-a000-000000000003',
   '44444444-0000-4000-a000-000000000002', 'onde-a-ia-ganha-tempo', 'Onde a IA ganha tempo de verdade',
   'As tarefas em que a IA devolve tempo, e as em que ela cobra.',
   1, 'published', 1680,
   'IA rende onde o trabalho é rascunho, volume ou tradução de formato — e atrapalha onde a decisão depende de contexto que só você tem. Saber a diferença vale mais do que saber prompt.',
   'Escolha uma tarefa recorrente da sua semana e refaça-a com IA. Cronometre as duas versões e anote qual das duas você entregaria.')
on conflict (id) do nothing;

insert into public.lesson_skills (lesson_id, skill_id, weight) values
  ('66666666-0000-4000-a000-000000000004', '22222222-0000-4000-a000-000000000004', 2.00),
  ('66666666-0000-4000-a000-000000000004', '22222222-0000-4000-a000-000000000003', 0.50)
on conflict do nothing;

-- Recalcula duração e contagem dos cursos semeados.
select public.refresh_course_rollup('44444444-0000-4000-a000-000000000001');
select public.refresh_course_rollup('44444444-0000-4000-a000-000000000002');
