#!/usr/bin/env bash
#
# DIAGNÓSTICO COMPLETO, EM UMA RODADA SÓ.
#
# Depois de quatro tentativas que só devolveram "401", este script para de
# adivinhar e mostra TUDO de uma vez — mas sem nunca imprimir a chave:
#
#   · o que há na área de transferência, byte a byte (caractere invisível
#     vindo junto do botão de copiar é a hipótese que faltava testar)
#   · a resposta da biblioteca
#   · a resposta da conta, que separa "chave ruim" de "conta bloqueada"
#
# A saída pode ser colada no chat: não há segredo nela, só formas e códigos.
#
#   bash scripts/diagnostico-bunny.sh [idDaBiblioteca]
#
set -uo pipefail
LIB="${1:-735837}"

echo "════════ ÁREA DE TRANSFERÊNCIA ════════"
BRUTO=$(pbpaste)
printf '%s' "$BRUTO" | python3 -c '
import sys, re
b = sys.stdin.buffer.read()
print("bytes:", len(b))
try:
    t = b.decode("utf-8")
    print("caracteres:", len(t))
except UnicodeDecodeError:
    print("NÃO é UTF-8 válido — isso já é um problema")
    sys.exit(0)

invisiveis = [(i, hex(ord(c))) for i, c in enumerate(t) if not (32 <= ord(c) <= 126)]
if invisiveis:
    print("⚠  CARACTERES INVISÍVEIS/NÃO-ASCII:", invisiveis)
else:
    print("só ASCII visível — nenhum caractere escondido")

print("hifens:", t.count("-"))
# Máscara: mostra a FORMA, nunca o conteúdo.
print("forma:", re.sub(r"[0-9]", "0", re.sub(r"[a-zA-Z]", "a", t)))
uuid = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
print("é UUID válido?", "SIM" if uuid.match(t) else "NÃO")
'

CHAVE=$(printf '%s' "$BRUTO" | tr -d '[:space:]"'"'"'' | tr -d '\200-\277\302\342')

echo
echo "════════ BIBLIOTECA $LIB ════════"
curl -s -o /dev/null -w 'HTTP %{http_code}\n' \
  -H "AccessKey: $CHAVE" -H 'accept: application/json' \
  "https://video.bunnycdn.com/library/$LIB/videos?page=1&itemsPerPage=1"

echo
echo "════════ CONTA ════════"
CONTA=$(mktemp)
ST=$(curl -s -o "$CONTA" -w '%{http_code}' \
  -H "AccessKey: $CHAVE" -H 'accept: application/json' \
  "https://api.bunny.net/videolibrary?page=1&perPage=100")
echo "HTTP $ST"
if [ "$ST" = "200" ]; then
  echo "Bibliotecas que esta chave enxerga:"
  python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
for b in d.get("Items", d if isinstance(d, list) else []):
    print("  %s  ·  %s" % (b.get("Id"), b.get("Name")))
' "$CONTA"
fi
rm -f "$CONTA"

echo
echo "════════ O CDN DA BIBLIOTECA ════════"
curl -s -o /dev/null -w 'vz-057393d5-4e6.b-cdn.net -> HTTP %{http_code}\n' \
  "https://vz-057393d5-4e6.b-cdn.net/"

echo
echo "Pode colar esta saída no chat — não há chave nenhuma nela."
unset CHAVE BRUTO
