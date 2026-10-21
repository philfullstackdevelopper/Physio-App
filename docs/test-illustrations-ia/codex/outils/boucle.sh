#!/usr/bin/env bash
# Relance un script de génération jusqu'au bout : quand le quota Codex est
# atteint (code 2), on attend 30 minutes puis on reprend où on s'était arrêté.
#   bash boucle.sh gen.mjs --tous
#   bash boucle.sh gen-nouveaux.mjs
cd "$(dirname "$0")"
while true; do
  node "$@"
  code=$?
  if [ "$code" -ne 2 ]; then echo "fin ($code)"; exit "$code"; fi
  echo "pause quota $(date +%H:%M)"
  sleep 1800
done
