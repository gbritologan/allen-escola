/**
 * "O QUE VOCÊ VAI APRENDER" — de textarea para lista, e de volta.
 *
 * No Studio a promessa do curso é digitada como texto corrido, uma por linha,
 * porque é assim que se escreve rápido. No banco ela é `text[]`, porque é uma
 * LISTA — e lista guardada como parágrafo vira parágrafo com travessão, que
 * ninguém varre com o olho.
 *
 * A conversão mora aqui, pura e testada, porque ela tem mais regra do que
 * parece: linha em branco no meio não pode virar item vazio (e vira, se a
 * pessoa separa os itens com uma linha de respiro), e travessão colado no
 * começo é reflexo de quem escreve lista — a interface é que desenha o
 * marcador, não o texto.
 */

const MARCADOR = /^\s*[-–—•*]\s*/
const LIMITE = 12

export function pontosDoTexto(texto: string): string[] {
  return texto
    .split('\n')
    .map((linha) => linha.replace(MARCADOR, '').trim())
    .filter((linha) => linha.length > 0)
    .slice(0, LIMITE)
}

export function textoDosPontos(pontos: readonly string[] | null | undefined): string {
  return (pontos ?? []).join('\n')
}
