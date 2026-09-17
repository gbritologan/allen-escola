#!/usr/bin/env bash
#
# DE QUAL SERVIÇO DO BUNNY É ESTA CHAVE?
#
# As duas chaves da página (a normal e a read-only) são recusadas pela API do
# Stream. Isso descarta "chave errada" — chave errada não vem em par. O que
# sobra é que elas valem para OUTRA COISA.
#
# O Bunny tem chaves separadas por serviço: conta, Stream (por biblioteca),
# Storage (por zona). Cada uma só abre a sua porta. Este script bate em todas
# as portas de uma vez e diz qual abriu.
#
# Nenhum segredo aparece na saída: só nomes de endpoint e códigos HTTP.
#
set -uo pipefail
LIB="${1:-735837}"

CHAVE=$(pbpaste | tr -d '[:space:]"'"'"'')
if [ -z "$CHAVE" ]; then
  printf 'Cole a chave e tecle Enter (ela vai aparecer, é de propósito): '
  read -r CHAVE
  CHAVE=$(printf '%s' "$CHAVE" | tr -d '[:space:]"'"'"'')
fi
[ -z "$CHAVE" ] && { echo "Nada para testar."; exit 1; }

echo "Chave de ${#CHAVE} caracteres. Batendo em todas as portas:"
echo

bater() {
  local rotulo="$1" url="$2"
  local st
  st=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
    -H "AccessKey: $CHAVE" -H 'accept: application/json' "$url")
  local marca="  "
  [ "$st" = "200" ] && marca="✅"
  printf '%s %-4s  %s\n' "$marca" "$st" "$rotulo"
}

echo "── CONTA (api.bunny.net) ──"
bater "lista de Pull Zones"        "https://api.bunny.net/pullzone?page=1&perPage=1"
bater "lista de Storage Zones"     "https://api.bunny.net/storagezone?page=1&perPage=1"
bater "lista de Video Libraries"   "https://api.bunny.net/videolibrary?page=1&perPage=100"
bater "dados da conta"             "https://api.bunny.net/user"
bater "estatísticas"               "https://api.bunny.net/statistics"

echo
echo "── STREAM (video.bunnycdn.com) ──"
bater "vídeos da biblioteca $LIB"  "https://video.bunnycdn.com/library/$LIB/videos?page=1&itemsPerPage=1"
bater "coleções da biblioteca $LIB" "https://video.bunnycdn.com/library/$LIB/collections?page=1&itemsPerPage=1"

echo
echo "────────────────────────────────────────────"
echo "Se algum CONTA deu 200: é chave de conta — e eu consigo listar suas"
echo "bibliotecas com ela para achar o número certo."
echo "Se só o STREAM desse 200: é chave de biblioteca e está tudo certo."
echo "Se NADA deu 200: a chave é de outro serviço, ou a conta tem pendência."
unset CHAVE
