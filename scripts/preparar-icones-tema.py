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

import unicodedata
from difflib import SequenceMatcher
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / 'ICONES DOS TEMAS'
SAIDA = RAIZ / 'public' / 'temas'

# AS CHAVES E COMO AS PESSOAS REALMENTE ESCREVEM.
#
# A primeira versão exigia que o arquivo começasse exatamente com a chave, e
# duas das oito ficaram de fora: "hefesos.jpeg" (letra a menos) e
# "prometheus.jpeg" (grafia em inglês). Nenhum dos dois é erro de quem nomeou
# — é grafia de nome grego, que tem variante em toda língua.
#
# Ferramenta que exige ortografia exata de nome próprio inventa um trabalho
# que não existia. Os apelidos abaixo cobrem as formas previsíveis, e a
# similaridade cobre as que eu não previ.
CHAVES = {
    'atena': ['atena', 'athena', 'athene'],
    'hefesto': ['hefesto', 'hefestos', 'hefesos', 'hefaisto', 'hephaestus', 'hephaistos'],
    'socrates': ['socrates', 'sokrates'],
    'prometeu': ['prometeu', 'prometheus', 'prometeus', 'prometheu'],
    'zeus': ['zeus', 'jupiter'],
    'hermes': ['hermes', 'mercurio'],
    'apolo': ['apolo', 'apollo', 'apollon'],
    'nike': ['nike', 'nice', 'vitoria'],
}

LADO = 512  # 2x do maior tamanho em tela, para Retina não esticar (D-83).


def normalizar(texto: str) -> str:
    semacento = unicodedata.normalize('NFKD', texto.lower())
    return ''.join(c for c in semacento if c.isalnum())


def achar(chave: str, apelidos: list[str]):
    arquivos = [f for f in sorted(ENTRADA.iterdir()) if f.is_file() and not f.name.startswith('.')]

    # Primeiro o que bate com algum apelido conhecido.
    for f in arquivos:
        nome = normalizar(f.stem)
        if any(nome.startswith(normalizar(a)) for a in apelidos):
            return f

    # Depois, o mais PARECIDO — cobre as grafias que eu não previ. O corte em
    # 0.72 é alto o bastante para "hefesos" achar "hefesto" e baixo o
    # suficiente para "zeus" não achar "nike".
    melhor, nota = None, 0.0
    for f in arquivos:
        atual = SequenceMatcher(None, normalizar(f.stem), chave).ratio()
        if atual > nota:
            melhor, nota = f, atual
    return melhor if nota >= 0.72 else None


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
    usados: set = set()
    for chave, apelidos in CHAVES.items():
        origem = achar(chave, apelidos)
        # Um arquivo não pode servir a dois temas: sem isto, a similaridade
        # poderia dar o mesmo desenho para dois personagens e ninguém notaria.
        if origem and origem in usados:
            origem = None
        if origem:
            usados.add(origem)
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
