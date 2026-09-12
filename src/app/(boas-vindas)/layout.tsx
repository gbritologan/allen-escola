import { AmbienteAllen } from '@/components/backgrounds/ambiente'

/**
 * A CASCA DAS BOAS-VINDAS.
 *
 * Fora de `(aluno)` de propósito, e não é detalhe de organização: a casca do
 * aluno REDIRECIONA para cá quem ainda não passou por aqui. Se esta tela
 * vivesse lá dentro, o redirecionamento apontaria para si mesmo e o aluno
 * entraria num laço infinito no primeiro login — o pior momento possível.
 *
 * Sem sidebar e sem dock: é uma tela de uma tarefa só. Navegação aqui seria
 * convite para sair antes de entender o que a escola pede.
 */
export default function BoasVindasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AmbienteAllen />
      {children}
    </>
  )
}
