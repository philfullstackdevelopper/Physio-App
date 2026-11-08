#!/usr/bin/env bash
# =============================================================================
# Recopie les variables d'environnement d'une app Scalingo osc-fr1 vers sa
# jumelle en région HDS osc-secnum-fr1 (bascule HDS, docs/bascule-hds.md).
#
# N'affiche JAMAIS une valeur : seulement les noms. Par défaut, ne fait que
# lister ce qui serait copié ; ajouter --apply pour écrire.
#
#   bash scripts/hds-copier-variables.sh easyphysio
#   bash scripts/hds-copier-variables.sh easyphysio --apply
#   bash scripts/hds-copier-variables.sh easyphysio-postgrest --apply
#
# Variables NON recopiées (elles changent avec la nouvelle région) :
# - SCALINGO_POSTGRESQL_URL : créée automatiquement par l'addon de la nouvelle base ;
# - SCALINGO_DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, PGRST_DB_URI,
#   PGRST_DB_ANON_ROLE : à régler à la main (voir la procédure) ;
# - CRON_SECRET : plus utilisée depuis le retrait de la facturation automatique.
# =============================================================================
set -euo pipefail
APP="${1:?Nom de l app (easyphysio ou easyphysio-postgrest)}"
APPLY="${2:-}"
SKIP=" SCALINGO_POSTGRESQL_URL SCALINGO_DATABASE_URL NEXT_PUBLIC_SUPABASE_URL PGRST_DB_URI PGRST_DB_ANON_ROLE CRON_SECRET "

src=$(scalingo --region osc-fr1 --app "$APP" env 2>/dev/null)
args=()
while IFS= read -r line; do
  [[ "$line" =~ ^[A-Z_][A-Z0-9_]*= ]] || continue
  name="${line%%=*}"
  if [[ "$SKIP" == *" $name "* ]]; then
    echo "  ignorée : $name"
    continue
  fi
  echo "  copiée  : $name"
  args+=("$line")
done <<< "$src"

echo "${#args[@]} variables à copier vers $APP (osc-secnum-fr1)."
if [ "$APPLY" != "--apply" ]; then
  echo "Rien n'a été écrit. Relancer avec --apply."
  exit 0
fi
scalingo --region osc-secnum-fr1 --app "$APP" env-set "${args[@]}" > /dev/null
echo "Variables écrites sur $APP en osc-secnum-fr1."
