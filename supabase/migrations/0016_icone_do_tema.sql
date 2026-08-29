-- ============================================================================
-- 0016 — ÍCONE DO TEMA
--
-- Cada constelação do Mapa ganha um símbolo no centro. Tema é DADO (D-04): o
-- catálogo cresce sem deploy, então o ícone tem que ser escolha de quem
-- cadastra, não um `if (nome === 'Vendas')` escondido no código.
--
-- Guarda a CHAVE, não o desenho. O desenho mora em
-- `components/icons/temas.ts`, onde pode ser corrigido sem migration — e onde
-- o canvas do Mapa e o seletor do Studio leem a mesma fonte.
--
-- Sem `check` da lista de chaves de propósito: ícone novo no código não deve
-- exigir migration, e chave desconhecida degrada para "sem ícone" em vez de
-- quebrar a tela.
-- ============================================================================

alter table public.themes add column icon text;

comment on column public.themes.icon is
  'Chave em components/icons/temas.ts. Nulo = constelação sem símbolo.';
