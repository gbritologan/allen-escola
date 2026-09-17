#!/usr/bin/env bash
#
# TESTAR A CHAVE DO BUNNY SEM DIGITAR NADA.
#
# A chave vem da ÁREA DE TRANSFERÊNCIA (pbpaste), não do teclado. Isso não é
# conveniência: a primeira versão pedia a chave num campo cego, e campo cego
# não dá retorno — o Gabriel colou mais de uma vez achando que não tinha
# pegado, e chegaram 208 caracteres onde cabiam 36. O Bunny recusou, e a
# mensagem de erro culpou a chave errada em vez do campo.
#
# Colar não repete. Digitar às cegas, sim.
#
# A chave vive só dentro deste processo: não vai para arquivo, não aparece na
# tela, não entra no histórico do shell.
#
#   1. copie a API Key no painel do Bunny
#   2. bash scripts/testar-bunny.sh
#
set -uo pipefail

LIB="${1:-755323}"

if ! command -v pbpaste >/dev/null 2>&1; then
  echo "Este script usa a área de transferência do macOS (pbpaste) e não achei ela."
  exit 1
fi

# Tira espaço, quebra de linha e aspas que vêm junto de um copiar desatento.
CHAVE=$(pbpaste | tr -d '[:space:]"'"'"'')

if [ -z "$CHAVE" ]; then
  echo "A área de transferência está vazia."
  echo "Copie a API Key no painel do Bunny e rode de novo."
  exit 1
fi

echo "Biblioteca $LIB"
echo "Na área de transferência: ${#CHAVE} caracteres"

# CONFERÊNCIA DE FORMATO — e uma lição cara.
#
# Eu presumi que a chave do Bunny fosse um UUID (8-4-4-4-12, quatro hifens) e
# fiz o script REJEITAR o que não tivesse essa cara. O Gabriel colou a chave
# certa seis vezes e seis vezes o script disse que ela era uma "máscara".
#
# A chave do Bunny tem CINCO hifens. Ele me disse isso, olhando para a tela, e
# eu não voltei aqui para desfazer a regra — o script seguiu ensinando o meu
# palpite como se fosse fato.
#
# Agora a conferência só faz o que tem base: barra o que claramente não é
# chave (página inteira colada, área vazia, texto com espaço no meio). O
# formato quem julga é o Bunny, que é quem sabe.
if [ "${#CHAVE}" -lt 20 ] || [ "${#CHAVE}" -gt 80 ]; then
  echo
  echo "❌ ISSO NÃO TEM CARA DE CHAVE: ${#CHAVE} caracteres."
  echo "   Uma chave do Bunny tem entre 36 e 41. O que costuma acontecer:"
  echo "   copiou um pedaço da página, ou a saída do terminal."
  exit 1
fi

if ! printf '%s' "$CHAVE" | grep -Eq '^[0-9A-Za-z-]+$'; then
  echo
  echo "❌ Há caracteres estranhos no meio. Copie de novo, só o campo da chave."
  exit 1
fi

echo "Perguntando ao Bunny…"
echo

CORPO=$(mktemp)
STATUS=$(curl -s -o "$CORPO" -w '%{http_code}' \
  -H "AccessKey: $CHAVE" -H 'accept: application/json' \
  "https://video.bunnycdn.com/library/$LIB/videos?page=1&itemsPerPage=1")

case "$STATUS" in
  200)
    echo "✅ A CHAVE FUNCIONA."
    echo "   O Bunny respondeu 200 e listou a biblioteca."
    echo
    echo "   Ela continua na sua área de transferência — pode colar direto em"
    echo "   BUNNY_STREAM_API_KEY na Vercel, sem copiar de novo."
    ;;
  401)
    echo "❌ 401 na biblioteca $LIB."
    echo
    # O 401 do Bunny é ambíguo de propósito: ele responde a mesma coisa para
    # chave errada e para biblioteca que a chave não alcança (testado — até um
    # ID inventado devolve 401, nunca 404). Então perguntar "de quem é esta
    # chave?" é o que desempata, e só o endpoint de CONTA responde isso.
    echo "   Perguntando de quem é esta chave…"
    echo
    CONTA=$(mktemp)
    ST2=$(curl -s -o "$CONTA" -w '%{http_code}' \
      -H "AccessKey: $CHAVE" -H 'accept: application/json' \
      "https://api.bunny.net/videolibrary?page=1&perPage=100")

    if [ "$ST2" = "200" ]; then
      echo "   ✅ ELA É VÁLIDA — mas é a chave da CONTA, não a da biblioteca."
      echo
      echo "   As bibliotecas que ela enxerga:"
      python3 -c '
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
itens = d.get("Items", d if isinstance(d, list) else [])
for b in itens:
    print("     %s  ·  %s" % (b.get("Id"), b.get("Name")))
' "$CONTA"
      echo
      echo "   Abra a que você usa, vá na aba API e copie a API Key DELA."
      echo "   Se o Id acima não for $LIB, é esse o número que a gente precisa."
    else
      echo "   ❌ O endpoint de conta também recusou (HTTP $ST2)."
      echo
      echo "   Então sobrou uma hipótese: a chave é de OUTRA biblioteca."
      echo "   Confira, na mesma página em que você copiou a chave, o campo"
      echo "   \"Video Library ID\". Se não for $LIB, rode assim:"
      echo
      echo "     bash scripts/testar-bunny.sh <o número que aparece lá>"
    fi
    rm -f "$CONTA"
    ;;
  404)
    echo "❌ 404 — ESTE ID DE BIBLIOTECA NÃO EXISTE NESTA CONTA."
    echo "   Confira o número em Stream → a biblioteca → aba API."
    ;;
  000)
    echo "❌ Não consegui falar com o Bunny. Confira sua conexão."
    ;;
  *)
    echo "❌ HTTP $STATUS"
    head -c 200 "$CORPO"
    echo
    ;;
esac

rm -f "$CORPO"
unset CHAVE
