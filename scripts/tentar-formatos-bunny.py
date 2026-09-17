#!/usr/bin/env python3
"""
O valor copiado do painel do Bunny tem 6 grupos (8-4-4-12-4-4), 36 dígitos
hexadecimais. Um UUID tem 5 grupos (8-4-4-4-12), 32 dígitos. Sobra um grupo.

Em vez de pedir ao Gabriel uma sétima cópia, este script testa as
reconstruções possíveis contra a API do Bunny e diz QUAL delas funciona —
pelo nome da transformação, nunca pelo valor.

Se nenhuma funcionar, também é resposta: significa que o problema não é
formato, e a gente para de procurar aqui.

    python3 scripts/tentar-formatos-bunny.py [idDaBiblioteca]
"""
import re
import subprocess
import sys
import urllib.error
import urllib.request

LIB = sys.argv[1] if len(sys.argv) > 1 else "735837"

bruto = subprocess.run(["pbpaste"], capture_output=True, text=True).stdout
valor = "".join(bruto.split())

if not valor:
    print("Área de transferência vazia. Copie a chave no Bunny e rode de novo.")
    raise SystemExit(1)

grupos = valor.split("-")
hexes = re.sub(r"[^0-9a-fA-F]", "", valor)

print(f"valor: {len(valor)} caracteres · {len(grupos)} grupos · {len(hexes)} dígitos hex")
print(f"grupos por tamanho: {[len(g) for g in grupos]}")
print()


def uuid(*partes: str) -> str:
    return "-".join(partes)


candidatos: list[tuple[str, str]] = [("como está", valor)]

if len(hexes) >= 32:
    candidatos.append(("só os hex, sem hífen", hexes))
    p = hexes[:32]
    candidatos.append(
        ("primeiros 32 hex em forma de UUID", uuid(p[:8], p[8:12], p[12:16], p[16:20], p[20:])),
    )
    u = hexes[-32:]
    candidatos.append(
        ("últimos 32 hex em forma de UUID", uuid(u[:8], u[8:12], u[12:16], u[16:20], u[20:])),
    )

if [len(g) for g in grupos] == [8, 4, 4, 12, 4, 4]:
    a, b, c, d, e, f = grupos
    candidatos += [
        ("grupos 1-2-3-5-4 (descarta o último)", uuid(a, b, c, e, d)),
        ("grupos 1-2-3-6-4 (descarta o quinto)", uuid(a, b, c, f, d)),
        ("quebrando o grupo longo, com o quinto", uuid(a, b, c, d[:4], d[4:] + e)),
        ("quebrando o grupo longo, com o sexto", uuid(a, b, c, d[:4], d[4:] + f)),
    ]

vistos: set[str] = set()
achou = False

for nome, chave in candidatos:
    if chave in vistos:
        continue
    vistos.add(chave)

    req = urllib.request.Request(
        f"https://video.bunnycdn.com/library/{LIB}/videos?page=1&itemsPerPage=1",
        headers={"AccessKey": chave, "accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            status = r.status
    except urllib.error.HTTPError as err:
        status = err.code
    except Exception as err:  # rede fora, timeout
        status = f"erro: {err}"

    marca = "✅" if status == 200 else "  "
    print(f"{marca} {status}  {nome}")
    if status == 200:
        achou = True

print()
if achou:
    print("Achamos. Me diga QUAL linha deu 200 — eu ajusto o resto.")
else:
    print("Nenhuma forma funcionou.")
    print("Então não é problema de formato, e a busca sai daqui:")
    print("  · a chave pode ser de outra biblioteca")
    print("  · ou a conta do Bunny pode estar com pendência (olhe se há")
    print("    aviso de cobrança no painel)")
