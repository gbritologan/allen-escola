-- =============================================================================
-- 0033 — Reverte os emblemas gregos. O conceito fica; o meu desenho, não.
--
-- Em 0032 apontei os oito temas para emblemas de personagens gregos que eu
-- mesmo desenhei em SVG. Renderizei antes de publicar — e foi bom ter olhado:
--
--   Atena (elmo coríntio)  saiu como o fantasma do Pac-Man
--   Hermes (elmo alado)    saiu como um dente rosa com chifres
--   Hefesto (martelo)      saiu como a letra T
--   Zeus (raio)            este ficou bom
--
-- É a segunda vez que eu erro do mesmo jeito: escrevo coordenadas de SVG sem
-- ver o resultado e aposto que vai sair bem. Da primeira vez o Gabriel recebeu
-- um alienígena no lugar do ícone de Marketing.
--
-- A lição, escrita onde eu vou reler: **eu não desenho.** Componho, posiciono,
-- coloro, animo — isso o código faz bem. Traduzir "elmo coríntio" em curvas de
-- Bézier às cegas é ilustração, e ilustração não se faz digitando números.
--
-- Os temas voltam aos ícones anteriores, do repertório real da marca. A
-- escolha de PERSONAGEM (Atena para Dados, Prometeu para IA...) continua
-- registrada em 0032 e em `deuses.ts`: ela é boa e é editorial, não técnica.
-- Quando a arte de verdade existir, é só trocar o desenho.
-- =============================================================================

update public.themes set icon = 'olho'       where slug = 'dados-e-tecnologia';
update public.themes set icon = 'coluna'     where slug = 'ferramentas';
update public.themes set icon = 'mestre'     where slug = 'filosofia';
update public.themes set icon = 'tocha'      where slug = 'inteligencia-artificial';
update public.themes set icon = 'estandarte' where slug = 'lideranca-e-gestao';
update public.themes set icon = 'agora'      where slug = 'marketing';
update public.themes set icon = 'balanca'    where slug = 'softskills';
update public.themes set icon = 'podio'      where slug = 'vendas';
