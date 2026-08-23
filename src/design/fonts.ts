import localFont from 'next/font/local'

/**
 * ELVON GROTESK — a fonte oficial da Allen Escola.
 *
 * Uma família só, do Thin ao Heavy. O contraste da marca não vem de misturar
 * tipos diferentes: vem da distância entre 200 e 900 dentro do mesmo desenho.
 * É mais difícil de acertar e muito mais difícil de imitar.
 *
 * Carregamos 6 dos 9 pesos. Os três que faltam (ExtraLight, Bold, Medium
 * itálico) entram no dia em que forem realmente usados — cada peso é ~15KB.
 */
export const elvon = localFont({
  src: [
    { path: './fonts/ElvonGrotesk-Thin.woff2', weight: '100', style: 'normal' },
    { path: './fonts/ElvonGrotesk-Light.woff2', weight: '300', style: 'normal' },
    { path: './fonts/ElvonGrotesk-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/ElvonGrotesk-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/ElvonGrotesk-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/ElvonGrotesk-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-elvon',
  display: 'swap',
  // Sem fallback de sistema visualmente parecido, o swap dá um salto feio.
  // Helvetica é o grotesk mais próximo que já está na máquina de todo mundo.
  fallback: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
  adjustFontFallback: false,
})
