/**
 * O AMBIENTE DA ALLEN — o que o vidro filtra.
 *
 * Existe por causa de uma objeção que eu mesmo levantei: vidro sobre fundo
 * chapado não é vidro, é plástico fosco. `backdrop-filter` desfoca o que está
 * atrás; se atrás só há navy sólido, o resultado é navy sólido com borda
 * clara, e todo o custo de composição do navegador foi gasto para nada.
 *
 * Então o vidro veio com o que ele filtra: três massas de luz, grandes e
 * moles, respirando fora de fase. Ao rolar a página, cada painel atravessa
 * regiões de tom diferente — e é isso que faz o vidro parecer vidro.
 *
 * POR QUE CSS E NÃO A AURORA. A `Aurora` de WebGL do login é bonita e cara:
 * contexto GL, shader, laço de animação. Atrás de TODA tela do produto ela
 * brigaria com a navegação rápida. Aqui são três gradientes radiais e uma
 * animação de opacidade — o compositor resolve na GPU e a CPU nem fica sabendo.
 *
 * `vigil-breathe` (D-16) dá o RITMO: 24s, deslocamento de 1,4%. Mas a faixa de
 * opacidade dele (13–19%) é calibragem de TEXTURA de fundo, e aqui a luz é o
 * assunto — nessa intensidade o vidro não tinha o que pegar e voltava a
 * parecer plástico. Cada massa sobrescreve `--vigil-min/max`.
 *
 * `prefers-reduced-motion` congela tudo pela regra global: a composição
 * continua, o movimento não.
 */
export function AmbienteAllen() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-navy-deep"
    >
      {/* O azul da marca, no alto à esquerda. É a massa dominante. */}
      <div
        style={{ ['--vigil-min' as string]: '0.30', ['--vigil-max' as string]: '0.42' }}
        className="vigil-breathe absolute -left-[18%] -top-[26%] size-[85vw] max-w-[1100px] rounded-full [background:radial-gradient(circle,rgba(76,65,255,0.62)_0%,rgba(76,65,255,0.18)_42%,transparent_68%)]"
      />

      {/* O violeta, embaixo à direita, mais lento e mais fraco: contrapeso, não
          segunda estrela. */}
      <div
        style={{
          animationDelay: '-9s',
          animationDuration: '31s',
          ['--vigil-min' as string]: '0.26',
          ['--vigil-max' as string]: '0.36',
        }}
        className="vigil-breathe absolute -bottom-[30%] -right-[14%] size-[70vw] max-w-[900px] rounded-full [background:radial-gradient(circle,rgba(126,72,255,0.42)_0%,rgba(126,72,255,0.12)_45%,transparent_70%)]"
      />

      {/* Um ciano frio no meio, quase invisível. Ele existe para o vidro ter
          uma TERCEIRA temperatura para pegar — com duas, a variação ao rolar
          fica previsível e o efeito morre. */}
      <div
        style={{
          animationDelay: '-17s',
          animationDuration: '27s',
          ['--vigil-min' as string]: '0.22',
          ['--vigil-max' as string]: '0.30',
        }}
        className="vigil-breathe absolute left-[38%] top-[34%] size-[52vw] max-w-[700px] rounded-full [background:radial-gradient(circle,rgba(60,170,255,0.3)_0%,transparent_62%)]"
      />

      {/* A vinheta devolve o peso às bordas. Sem ela o conteúdo boia num campo
          uniforme e a tela perde o centro. */}
      <div className="absolute inset-0 [background:radial-gradient(120%_90%_at_50%_40%,transparent_38%,rgba(5,7,20,0.72)_100%)]" />
    </div>
  )
}
