import type { NextConfig } from 'next'

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Capas e retratos vêm do Storage do Supabase; thumbnails de vídeo, do provedor.
    remotePatterns: [
      ...(supabaseHost
        ? ([{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] as const)
        : []),
      { protocol: 'https', hostname: '**.b-cdn.net' },
      { protocol: 'https', hostname: 'image.mux.com' },
    ],
  },
  /**
   * `/ajuda` virou `/suporte`.
   *
   * O e-mail de notificação de chamado já saiu com links `/ajuda/<id>` na
   * caixa de entrada de alguém, e esses links não têm como ser corrigidos
   * retroativamente. Renomear rota sem redirecionar é quebrar o que já foi
   * enviado.
   */
  async redirects() {
    return [
      { source: '/ajuda', destination: '/suporte', permanent: true },
      { source: '/ajuda/:id', destination: '/suporte/:id', permanent: true },
      // "Explorar" saiu da sidebar mas a página continua; nenhum redirect
      // aqui, de propósito.
    ]
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default nextConfig
