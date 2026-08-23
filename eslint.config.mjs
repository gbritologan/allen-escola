import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  /**
   * D-01 — A FRONTEIRA DO DOMÍNIO.
   *
   * `src/core/**` é TypeScript puro: tipos, regras e políticas da Allen Escola.
   * Não pode conhecer React, Next nem a UI. É isto — e não disciplina — que
   * garante que o app nativo (Expo) reuse a escola inteira sem reescrevê-la.
   *
   * Se esta regra te bloquear, a resposta quase nunca é desligá-la: é mover o
   * código para `src/lib` (adaptadores) ou `src/components` (interface).
   */
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'react/*',
                'react-dom/*',
                'next',
                'next/*',
                'server-only',
                'client-only',
                '@/app/*',
                '@/components/*',
                '@/design/*',
                '@/lib/*',
              ],
              message:
                'src/core é o domínio puro — sem React, sem Next, sem UI (ver docs/DECISOES.md, D-01).',
            },
          ],
        },
      ],
    },
  },

  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
