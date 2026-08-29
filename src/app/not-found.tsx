import Link from 'next/link'
import { Marca } from '@/components/brand/marca'

/**
 * 404.
 *
 * Sem este arquivo, um endereço errado devolvia a página padrão do Next: fundo
 * branco, fonte do sistema, "404 | This page could not be found." em inglês.
 * Num produto pago, em português, isso não parece um link errado — parece que
 * a empresa sumiu.
 *
 * A saída é UMA. Uma parede de links aqui é a versão educada de "vira-te".
 */
export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-6">
      <Marca size={26} />
      <div className="flex flex-col gap-3">
        <h1 className="text-display font-light">Esta página não existe.</h1>
        <p className="text-body text-ink-3">
          O endereço pode ter mudado, ou o link que te trouxe está velho. Nada do seu progresso
          se perdeu.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/" className="text-label text-blue-light hover:underline">
          Voltar ao início
        </Link>
        <Link href="/suporte" className="text-label text-ink-4 hover:text-ink">
          Falar com a gente
        </Link>
      </div>
    </main>
  )
}
