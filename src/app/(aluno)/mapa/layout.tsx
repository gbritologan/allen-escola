/**
 * O mapa é a única tela do aluno que ocupa a altura inteira.
 *
 * A casca reserva espaço embaixo para o dock do celular; aqui esse espaço
 * cortaria o céu, e o dock flutua sobre ele de qualquer forma.
 */
export default function MapaLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative -mb-28 md:-mb-10">{children}</div>
}
