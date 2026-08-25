/**
 * O mapa é a única tela do aluno que ocupa a altura inteira.
 *
 * A casca da área do aluno reserva espaço embaixo para o dock; aqui esse
 * espaço cortaria o céu, e o dock flutua sobre ele de qualquer forma. Este
 * layout existe só para desfazer aquele respiro.
 */
export default function MapaLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative -mb-28 md:-mb-16">{children}</div>
}
