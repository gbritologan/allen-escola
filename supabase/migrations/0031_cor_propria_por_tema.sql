-- =============================================================================
-- 0031 — Cada tema ganha a sua cor.
--
-- `accent` existia desde 0003 e os oito temas tinham o MESMO valor: o azul da
-- marca. Uma coluna de cor em que todas as linhas são iguais não é cor, é
-- decoração — e era por isso que os temas não tinham identidade: eles eram
-- oito retângulos idênticos com textos diferentes.
--
-- COMO AS OITO FORAM ESCOLHIDAS:
--
-- · Todas nascem no mesmo nível de saturação e luz. Assim nenhuma "grita" mais
--   que a outra numa grade onde as oito aparecem juntas — hierarquia entre
--   temas seria mentira, porque nenhum é mais importante.
-- · Espalhadas pelo círculo cromático com distância suficiente para serem
--   distinguíveis LADO A LADO, que é como aparecem.
-- · Todas legíveis sobre o navy E sobre o off-white.
-- · A Inteligência Artificial fica com o azul da marca: é o tema que mais
--   aparece ao lado do logotipo, e discordar dele ali seria ruído.
--
-- A associação segue convenção, não gosto — vermelho para liderança (comando),
-- verde para softskills (relação), dourado para vendas (fechamento). Convenção
-- é o que deixa o aluno reconhecer o tema pela cor antes de ler o nome.
-- =============================================================================

update public.themes set accent = '#3CAAFF' where slug = 'dados-e-tecnologia';
update public.themes set accent = '#E8A33C' where slug = 'ferramentas';
update public.themes set accent = '#9B6BFF' where slug = 'filosofia';
update public.themes set accent = '#4C41FF' where slug = 'inteligencia-artificial';
update public.themes set accent = '#FF6B5E' where slug = 'lideranca-e-gestao';
update public.themes set accent = '#FF5EA8' where slug = 'marketing';
update public.themes set accent = '#48D6A8' where slug = 'softskills';
update public.themes set accent = '#F2C14E' where slug = 'vendas';

comment on column public.themes.accent is
  'Cor de identidade do tema. Usada no Mapa, nos cartões e no ícone. Cada tema tem a sua.';
