#!/usr/bin/env bash
# Liste les animations faites mais pas encore contrôlées (relu.txt = déjà vues).
cd "$(dirname "$0")/.."
touch relu.txt
for d in out/*/ out-nouveaux/*/; do d=${d%/}; [ -f "$d/apercu.gif" ] && ! grep -qx "$d" relu.txt && echo "$d"; done
