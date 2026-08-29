import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termos de uso',
  description: 'As regras de uso da Allen Escola.',
}

/**
 * TERMOS DE USO.
 *
 * ESTE TEXTO PRECISA DE REVISÃO JURÍDICA ANTES DE VALER COMO CONTRATO. Ele foi
 * escrito a partir do que a plataforma REALMENTE faz — o modelo de dados, o
 * controle de acesso, o que é guardado e por quanto tempo — e não copiado de
 * um modelo genérico. Isso o torna honesto e específico, não o torna revisado
 * por advogado.
 *
 * O texto mora em código, e não no banco, de propósito: mudança em termos é
 * evento raro e precisa de rastro. Um termo editável por formulário é um termo
 * que muda sem ninguém saber quando nem por quê — e a data de vigência abaixo
 * viraria mentira.
 */
export default function TermosPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-display font-light">Termos de uso</h1>
        <p className="text-caption text-ink-4">Em vigor desde 1º de setembro de 2026.</p>
      </header>

      <div className="flex flex-col gap-7 text-body text-ink-2">
        <Secao titulo="1. O que é a Allen Escola">
          <p>
            A Allen Escola é uma plataforma de cursos em vídeo sobre habilidades corporativas.
            Ao criar uma conta e usar a plataforma, você concorda com estes termos.
          </p>
        </Secao>

        <Secao titulo="2. Sua conta">
          <p>
            O acesso é pessoal e intransferível. A entrada é feita por um código enviado ao seu
            e-mail — não existe senha. Isso significa que quem tem acesso à sua caixa de entrada
            tem acesso à sua conta, e manter esse e-mail seguro é responsabilidade sua.
          </p>
          <p>
            Compartilhar sua conta com outra pessoa é motivo para suspensão. Detectamos isso por
            padrão de uso, não por vigilância do seu conteúdo.
          </p>
        </Secao>

        <Secao titulo="3. Prazo do seu acesso">
          <p>
            Cada acesso tem uma data de início e, quando combinado, uma data de fim. As suas
            estão sempre visíveis em <strong className="text-ink">Sua conta</strong>.
          </p>
          <p>
            Quando o prazo termina, você deixa de acessar as aulas. Seu histórico — progresso,
            aplicações registradas, habilidades acumuladas — não é apagado, e volta com você se
            renovar.
          </p>
        </Secao>

        <Secao titulo="4. O conteúdo é nosso, e é seu para aprender">
          <p>
            Os vídeos, textos e materiais são propriedade da Allen. Você pode assistir, baixar
            os materiais oferecidos e usá-los no seu trabalho — é para isso que existem.
          </p>
          <p>
            Você não pode: gravar, redistribuir, revender ou usar o conteúdo para montar
            treinamento próprio, dentro ou fora da sua empresa.
          </p>
        </Secao>

        <Secao titulo="5. O que você escreve na plataforma">
          <p>
            Ao registrar uma aplicação, você descreve o que fez. Esse texto é seu, e serve para
            a plataforma entender o que você desenvolveu. Não publicamos essas anotações, não as
            mostramos para outros alunos, e não as usamos para treinar modelos.
          </p>
        </Secao>

        <Secao titulo="6. Disponibilidade">
          <p>
            Fazemos o possível para manter a plataforma no ar, mas ela depende de serviços de
            terceiros e pode ter interrupções. Não prometemos disponibilidade ininterrupta.
          </p>
          <p>
            Se uma interrupção longa atrapalhar seu acesso de forma relevante, fale com a gente
            pelo Suporte — resolvemos caso a caso, e a régua é o bom senso.
          </p>
        </Secao>

        <Secao titulo="7. Suspensão e encerramento">
          <p>
            Podemos suspender uma conta que compartilhe acesso, tente extrair conteúdo em massa
            ou atrapalhe o funcionamento da plataforma. Quando isso acontecer, avisamos por
            e-mail e explicamos o motivo.
          </p>
          <p>
            Você pode encerrar sua conta quando quiser, pelo Suporte.
          </p>
        </Secao>

        <Secao titulo="8. Mudanças nestes termos">
          <p>
            Se estes termos mudarem de forma relevante, avisamos por e-mail antes de a mudança
            valer. A data de vigência no topo desta página é sempre a da versão atual.
          </p>
        </Secao>

        <Secao titulo="9. Foro">
          <p>
            Estes termos são regidos pela lei brasileira. Questões não resolvidas pelo Suporte
            ficam sob a comarca do Rio de Janeiro/RJ.
          </p>
        </Secao>
      </div>
    </main>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lead font-light text-ink">{titulo}</h2>
      {children}
    </section>
  )
}
