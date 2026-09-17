import { avaliarAula } from './actions'

/**
 * A AVALIAÇÃO DA AULA.
 *
 * Cinco estrelas, cada uma um botão de formulário — sem JavaScript de cliente.
 * Funciona com teclado e com a aba sem hidratar, e o custo é cinco `<form>`
 * em vez de um estado.
 *
 * CLICAR NA MESMA ESTRELA TIRA A NOTA. Sem isso, quem clicasse errado ficaria
 * preso à primeira escolha, e a saída óbvia — clicar de novo — não faria nada.
 * Por isso cada botão leva a nota atual junto: a ação compara e decide entre
 * gravar e apagar.
 *
 * A pergunta é sobre a AULA, não sobre a pessoa. Fica pequena e no fim, longe
 * do Para Fazer, que é onde o esforço dela importa.
 */
export function Avaliar({
  lessonId,
  caminho,
  atual,
}: {
  lessonId: string
  caminho: string
  atual: number
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption uppercase tracking-[0.14em] text-ink-4">Avalie esta aula</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <form key={n} action={avaliarAula}>
            <input type="hidden" name="lesson_id" value={lessonId} />
            <input type="hidden" name="caminho" value={caminho} />
            <input type="hidden" name="stars" value={n} />
            <input type="hidden" name="atual" value={atual} />
            <button
              type="submit"
              aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
              className="p-0.5 transition-transform duration-150 hover:scale-110"
            >
              <svg
                viewBox="0 0 24 24"
                className={n <= atual ? 'size-5 fill-blue-light' : 'size-5 fill-[var(--color-realce-4)]'}
                aria-hidden
              >
                <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
              </svg>
            </button>
          </form>
        ))}
      </div>
      {atual > 0 && (
        <span className="text-caption text-ink-4">
          Sua nota: {atual}. Clique nela de novo para tirar.
        </span>
      )}
    </div>
  )
}
