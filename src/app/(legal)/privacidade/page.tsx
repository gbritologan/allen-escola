import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacidade',
  description: 'O que a Allen Escola guarda sobre você, e por quê.',
}

/**
 * POLÍTICA DE PRIVACIDADE.
 *
 * PRECISA DE REVISÃO JURÍDICA antes de valer como documento de conformidade.
 *
 * O que ela tem de diferente de um modelo baixado da internet: cada item foi
 * escrito olhando o schema. `profiles`, `subscriptions`, `lesson_progress`,
 * `applications`, `skill_signals`, `support_threads` — a lista abaixo é a lista
 * real, não a lista genérica. Se uma tabela nova guardar dado de pessoa, esta
 * página precisa mudar junto, e é por isso que ela mora no código, ao lado do
 * resto.
 */
export default function PrivacidadePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-display font-light">Privacidade</h1>
        <p className="text-caption text-ink-4">Em vigor desde 1º de setembro de 2026.</p>
      </header>

      <div className="flex flex-col gap-7 text-body text-ink-2">
        <Secao titulo="O resumo">
          <p>
            Guardamos o mínimo para a escola funcionar: quem é você, até quando seu acesso vale,
            o que você assistiu e o que você registrou ter aplicado. Não vendemos nada disso,
            não usamos para publicidade, e não treinamos modelos de IA com o que você escreve.
          </p>
        </Secao>

        <Secao titulo="O que guardamos, item por item">
          <Lista
            itens={[
              ['Nome, e-mail e telefone', 'para identificar sua conta e falar com você.'],
              [
                'Datas do seu acesso',
                'início e fim, para saber se sua conta está ativa. O valor pago não fica na plataforma.',
              ],
              [
                'Progresso nas aulas',
                'o que você concluiu e em que ponto do vídeo parou, para a Home abrir de onde você estava.',
              ],
              [
                'Aplicações registradas',
                'o texto que você escreve ao registrar o que fez. É o coração do método, e é privado.',
              ],
              [
                'Sinais de habilidade',
                'derivados das suas aplicações, para o Mapa mostrar o que você desenvolveu.',
              ],
              [
                'Conversas de suporte',
                'o que você escreve ao abrir um chamado, e nossas respostas.',
              ],
              [
                'Data do último acesso',
                'para sabermos quem entrou e quem nunca chegou a entrar.',
              ],
            ]}
          />
          <p>
            Não guardamos dados de pagamento. Não usamos cookies de rastreamento nem
            ferramentas de análise de terceiros — a plataforma usa apenas os cookies necessários
            para manter você logado.
          </p>
        </Secao>

        <Secao titulo="Quem mais vê">
          <p>Três serviços processam dados para a Allen funcionar:</p>
          <Lista
            itens={[
              ['Supabase', 'banco de dados e autenticação.'],
              ['Vercel', 'hospedagem da aplicação.'],
              ['Bunny', 'armazenamento e entrega dos vídeos.'],
              ['Resend', 'envio dos e-mails de código e de notificação.'],
            ]}
          />
          <p>
            A equipe da Allen vê seu nome, e-mail, telefone, prazo de acesso, progresso e seus
            chamados de suporte. As suas anotações de aplicação são visíveis à equipe para
            suporte pedagógico — se isso for um problema para você, fale com a gente.
          </p>
        </Secao>

        <Secao titulo="Por quanto tempo">
          <p>
            Enquanto sua conta existir. Quando o acesso vence, os dados continuam guardados —
            é o que permite você renovar e voltar de onde parou. Se você pedir o encerramento
            definitivo, apagamos tudo em até 30 dias, exceto o que a lei exigir manter.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            Pela LGPD, você pode pedir a qualquer momento: acesso aos seus dados, correção do
            que estiver errado, uma cópia em formato legível, ou a exclusão da sua conta.
          </p>
          <p>
            Todos esses pedidos passam pelo Suporte, dentro da plataforma, ou por{' '}
            <a href="mailto:contato@allenescola.com" className="text-blue-light hover:underline">
              contato@allenescola.com
            </a>
            . Respondemos em até 15 dias.
          </p>
        </Secao>

        <Secao titulo="Segurança">
          <p>
            O banco de dados aplica regras de acesso por linha: um aluno só consegue ler os
            próprios dados, mesmo que tente. Os vídeos são entregues por links que expiram, não
            por endereços fixos. A entrada é por código de e-mail, sem senha para vazar.
          </p>
        </Secao>

        <Secao titulo="Mudanças">
          <p>
            Se esta política mudar de forma relevante, avisamos por e-mail antes. A data de
            vigência no topo é sempre a da versão atual.
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

function Lista({ itens }: { itens: Array<[string, string]> }) {
  return (
    <ul className="flex flex-col gap-2">
      {itens.map(([o_que, por_que]) => (
        <li key={o_que} className="flex flex-col border-l border-line pl-4">
          <span className="text-ink">{o_que}</span>
          <span className="text-label text-ink-3">{por_que}</span>
        </li>
      ))}
    </ul>
  )
}
