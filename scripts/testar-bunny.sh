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

LIB="${1:-735837}"

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

# A chave do Bunny é um UUID — 36 caracteres. Conferir o FORMATO antes de
# perguntar ao Bunny é o que separa "você colou a coisa errada" de "o Bunny
# recusou", que são problemas diferentes com soluções diferentes.
if [ "${#CHAVE}" -lt 30 ] || [ "${#CHAVE}" -gt 60 ]; then
  echo
  echo "❌ ISSO NÃO TEM CARA DE CHAVE."
  echo "   Uma API Key do Bunny tem ~36 caracteres. Esta tem ${#CHAVE}."
  echo
  echo "   O que costuma estar na área de transferência nesse caso:"
  echo "   um pedaço da página, ou a chave colada duas vezes."
  echo "   Copie de novo, só o campo API Key, e rode outra vez."
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
    echo "❌ 401 — O BUNNY RECUSOU A CHAVE."
    echo
    echo "   O formato está certo, então não foi erro de colar."
    echo "   Quase sempre é a chave da CONTA no lugar da chave da BIBLIOTECA:"
    echo "   a certa fica em Stream → a biblioteca → aba API → \"API Key\"."
    echo "   A de Account Settings não serve para este endpoint."
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
