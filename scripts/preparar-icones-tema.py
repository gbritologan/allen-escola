#!/usr/bin/env python3
"""
PREPARA OS ÍCONES DOS TEMAS — tira o fundo e vira estêncil.

Os oito emblemas chegam como PNG/JPEG azul sobre branco. Para a plataforma
poder pintar cada um na COR DO TEMA, eles precisam virar estêncil: forma
opaca, resto transparente. Aí o CSS usa a imagem como máscara e a cor vem do
banco — um arquivo só serve para o tema claro, o escuro e qualquer cor futura.

Sem isso seriam oito arquivos por cor, e trocar a cor de um tema viraria
trabalho de edição de imagem.

COMO FUNCIONA. O que é claro vira transparente, o que é escuro vira opaco, com
a transição preservada — é ela que mantém a borda suave em vez de serrilhada.
A cor original não importa: o que sobra é a SILHUETA.

    python3 scripts/preparar-icones-tema.py

Lê de "ICONES DOS TEMAS/" e escreve em "public/temas/".
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / 'ICONES DOS TEMAS'
SAIDA = RAIZ / 'public' / 'temas'

# O nome do arquivo de entrada precisa começar com a chave. "atena.png",
# "atena-v2.png" e "Atena final.jpeg" vão todos para atena.png.
CHAVES = ['atena', 'hefesto', 'socrates', 'prometeu', 'zeus', 'hermes', 'apolo', 'nike']

LADO = 512  # 2x do maior tamanho em tela, para Retina não esticar (D-83).


def achar(chave: str):
    for f in sorted(ENTRADA.iterdir()):
        if f.is_file() and f.stem.lower().replace(' ', '-').startswith(chave):
            return f
    return None


def virar_estencil(origem: Path, destino: Path) -> None:
    img = Image.open(origem).convert('RGBA')

    # Luminância: claro → transparente, escuro → opaco. Preserva o
    # antialiasing da borda, que é o que separa desenho limpo de serrilhado.
    cinza = img.convert('L')
    alpha = cinza.point(lambda v: 255 - v)

    estencil = Image.new('RGBA', img.size, (255, 255, 255, 255))
    estencil.putalpha(alpha)

    # Recorta no conteúdo antes de encaixar no quadrado: sem isso, uma imagem
    # com margem branca larga viraria um ícone pequeno no meio de um vazio, e
    # os oito ficariam de tamanhos diferentes na grade.
    caixa = estencil.getbbox()
    if caixa:
        estencil = estencil.crop(caixa)

    # Quadrado com respiro, para todos ocuparem o mesmo peso visual.
    lado = max(estencil.size)
    respiro = int(lado * 0.08)
    tela = Image.new('RGBA', (lado + respiro * 2, lado + respiro * 2), (255, 255, 255, 0))
    tela.paste(
        estencil,
        ((tela.width - estencil.width) // 2, (tela.height - estencil.height) // 2),
    )

    tela.resize((LADO, LADO), Image.LANCZOS).save(destino, optimize=True)


def main() -> None:
    ENTRADA.mkdir(exist_ok=True)
    SAIDA.mkdir(parents=True, exist_ok=True)

    faltando = []
    for chave in CHAVES:
        origem = achar(chave)
        if not origem:
            faltando.append(chave)
            continue
        destino = SAIDA / f'{chave}.png'
        virar_estencil(origem, destino)
        print(f'  ✅ {chave:10} ← {origem.name}')

    if faltando:
        print(f'\n  ❌ Faltam: {", ".join(faltando)}')
        print(f'     Coloque os arquivos em "{ENTRADA.name}/" com o nome do personagem')
        print('     (atena.png, hefesto.png, socrates.png, …) e rode de novo.')
    else:
        print('\n  Os oito prontos em public/temas/.')


if __name__ == '__main__':
    main()
