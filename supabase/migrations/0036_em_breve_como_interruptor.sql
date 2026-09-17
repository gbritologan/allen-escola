-- =============================================================================
-- 0036 — "Em breve" ganha um interruptor, além da data.
--
-- Até aqui "em breve" era só `available_at`: uma data no futuro. Isso resolve
-- o caso planejado — o curso abre sozinho no dia — mas não resolve o comum:
-- "quero publicar a capa agora e ainda não sei quando abro".
--
-- Com só a data, esse caso obrigava a inventar uma. Data inventada é pior que
-- nenhuma: ela CHEGA, e o curso abre sozinho num dia que ninguém escolheu.
--
--   coming_soon    "ainda não" — sem prazo, só sai quando alguém desligar
--   available_at   "a partir de tal dia" — se resolve sozinho quando chega
--
-- Em breve = um OU outro. Dois caminhos para o mesmo estado normalmente é
-- cheiro de má modelagem; aqui não é, porque eles se distinguem por QUEM
-- desliga: o interruptor espera uma pessoa, a data espera o relógio.
-- =============================================================================

alter table public.courses
  add column if not exists coming_soon boolean not null default false;

comment on column public.courses.coming_soon is
  'Em breve sem prazo. Só sai quando alguém desligar. Para prazo, use available_at.';
