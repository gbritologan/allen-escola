#!/usr/bin/env bash
#
# TESTAR A CHAVE DO BUNNY SEM ELA VAZAR PARA LUGAR NENHUM.
#
# A chave é digitada escondida (`read -rs`) e vive só dentro deste processo:
# não entra no histórico do shell, não vai para arquivo, não aparece na tela.
#
# Por que existe: descobrir que a chave está errada DEPOIS de salvá-la na
# Vercel custa um redeploy e mais uma rodada de "não funcionou". Aqui a
# resposta vem em dois segundos, antes de qualquer coisa ser salva.
#
#   bash scripts/testar-bunny.sh
#
set -uo pipefail

printf 'ID da biblioteca [735837]: '
read -r LIB
LIB="${LIB:-735837}"

printf 'API Key da biblioteca (não aparece enquanto você digita): '
read -rs CHAVE
printf '\n\n'

if [ -z "$CHAVE" ]; then
  echo "Nenhuma chave digitada. Rode de novo."
  exit 1
fi

echo "Biblioteca $LIB · chave de ${#CHAVE} caracteres"
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
    echo "   Pode salvar esta chave em BUNNY_STREAM_API_KEY na Vercel."
    ;;
  401)
    echo "❌ 401 — O BUNNY RECUSOU A CHAVE."
    echo
    echo "   Quase sempre é a chave da CONTA no lugar da chave da BIBLIOTECA."
    echo "   A certa fica em: Stream → a biblioteca → aba API → \"API Key\"."
    echo "   A de Account Settings NÃO serve para este endpoint."
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
