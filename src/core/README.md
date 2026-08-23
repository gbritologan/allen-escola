# `src/core` — o domínio da Allen Escola

TypeScript puro. **Sem React, sem Next, sem UI.** A regra é aplicada pelo ESLint
(ver `eslint.config.mjs`), não por disciplina.

## Por que essa fronteira existe

O briefing pede uma plataforma com múltiplas experiências — web hoje, iOS e
Android depois — sobre a mesma conta, o mesmo catálogo, o mesmo progresso e as
mesmas regras. Isso só é possível se as regras **não morarem dentro de
componentes**. Quando o app Expo existir, esta pasta vira `packages/core` e é
consumida sem alteração.

## Convenção de nomes

Identificadores em inglês (`title`, `position`, `status`), com uma exceção
deliberada: `para_saber` e `para_fazer`. Esses dois não são campos genéricos —
são o vocabulário do produto. Traduzi-los para `knowledge` e `action` apagaria
exatamente aquilo que distingue a Allen de um LMS.

Comentários e textos de interface: português.

## Mapa

| pasta | responsabilidade |
|---|---|
| `shared/` | tipos e utilitários sem dono (ids, resultado, slug, duração) |
| `identity/` | papéis e a matriz de permissões (espelho de D-11) |
| `catalog/` | tema, curso, módulo, aula, instrutor, material |
| `progress/` | matrícula, progresso de aula, "continue de onde parou" |
| `applications/` | aplicações — a unidade de valor da Allen |
| `skills/` | sinais e scores; grava desde o dia um, sem UI (D-08) |
| `video/` | contrato `VideoProvider` (D-17) |
| `home/` | `resolveHome()` — composição da Home (D-18) |

## O que **não** vai aqui

Chamadas ao Supabase, `cookies()`, `fetch` com segredo, componentes, CSS.
Adaptadores ficam em `src/lib`. Interface fica em `src/components` e `src/app`.
