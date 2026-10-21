#!/usr/bin/env bash
# Planches de relecture d'une zone, 6 animations par planche.
#   bash relecture.sh <Zone> <dossier-sortie>
# Zones : clés de $TEMP/zones.json (écrit à partir de galerie.html).
cd "$(dirname "$0")/.."
zone=$1; out=$2; mkdir -p "$out"
list=$(node -e 'const z=JSON.parse(require("fs").readFileSync(process.env.TEMP+"/zones.json","utf8"));console.log((z[process.argv[1]]||[]).join(" "))' "$zone")
set -- $list
i=1
while [ $# -gt 0 ]; do
  batch=""; for k in 1 2 3 4 5 6; do [ $# -gt 0 ] && { batch="$batch $1"; shift; }; done
  node outils/planche.mjs "$out/$zone-$i.png" $batch >/dev/null && echo "$out/$zone-$i.png :$batch"
  i=$((i+1))
done
