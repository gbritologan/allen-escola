-- =============================================================================
-- 0032 — Um personagem grego por tema.
--
-- Os ícones anteriores eram OBJETOS: coluna, balança, estandarte. "Genéricos e
-- nada originais" — e o diagnóstico é preciso: uma balança é a balança de
-- qualquer produto jurídico do mundo. Objeto é vocabulário compartilhado.
--
-- Personagem é o contrário. A associação entre Prometeu e Inteligência
-- Artificial é uma decisão editorial nossa, e não existe em lugar nenhum
-- porque ninguém mais a tomou.
--
--   Atena     Dados e Tecnologia   estratégia que nasce de informação
--   Hefesto   Ferramentas          o ferreiro: faz a ferramenta que os outros usam
--   Sócrates  Filosofia            a pergunta antes da resposta
--   Prometeu  IA                   deu aos humanos um poder que era dos deuses
--   Zeus      Liderança e Gestão   a decisão que vem de cima
--   Hermes    Marketing            o mensageiro; a mensagem viaja antes do produto
--   Apolo     Softskills           harmonia entre vozes diferentes
--   Nike      Vendas               a vitória: vender não é falar, é ganhar
--
-- Hermes serviria para Marketing E Vendas — é deus do comércio e da mensagem.
-- Ficou com Marketing, e Vendas foi para Nike, porque a diferença entre os
-- dois temas é exatamente essa: um leva a mensagem, o outro fecha.
-- =============================================================================

update public.themes set icon = 'atena'    where slug = 'dados-e-tecnologia';
update public.themes set icon = 'hefesto'  where slug = 'ferramentas';
update public.themes set icon = 'socrates' where slug = 'filosofia';
update public.themes set icon = 'prometeu' where slug = 'inteligencia-artificial';
update public.themes set icon = 'zeus'     where slug = 'lideranca-e-gestao';
update public.themes set icon = 'hermes'   where slug = 'marketing';
update public.themes set icon = 'apolo'    where slug = 'softskills';
update public.themes set icon = 'nike'     where slug = 'vendas';

comment on column public.themes.icon is
  'Chave em DEUSES: o personagem grego que representa o tema. Um por tema.';
