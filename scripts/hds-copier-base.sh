#!/bin/bash
# Copies the old EasyPhysio database (MIGRATION_SOURCE_URL) into the new HDS
# database (PGRST_DB_URI), inside a Scalingo one-off container.
# Never prints a URL or a password.
#
# Why not a plain pg_dump: every table has FORCE ROW LEVEL SECURITY, so even
# the owner role sees nothing and pg_dump refuses. Data is therefore read in a
# transaction that turns FORCE off and is ROLLED BACK: the change is never
# visible to any other session (the site keeps its protection throughout).
set -o pipefail
for v in 17.10 17.9 ""; do
  dbclient-fetcher pgsql $v > /tmp/fetch.log 2>&1
  [ -x /app/bin/pg_dump ] && break
done
[ -x /app/bin/pg_dump ] || { echo "FETCH_FAILED"; exit 1; }
P=/app/bin/psql; OLD="$MIGRATION_SOURCE_URL"; NEW="$PGRST_DB_URI"
mkdir -p /tmp/data; : > /tmp/cols.txt

# 0. New DB must be empty (no tables in public/internal)
existing=$($P "$NEW" -Atc "select count(*) from information_schema.tables where table_schema in ('public','internal')")
if [ "$existing" != "0" ] && [ "$1" != "--reset" ]; then echo "NEW_DB_NOT_EMPTY ($existing tables) - rerun with --reset"; exit 1; fi
if [ "$1" = "--reset" ]; then
  $P "$NEW" -q -v ON_ERROR_STOP=1 -c "drop schema if exists internal cascade; drop schema if exists public cascade; create schema public;" || { echo RESET_FAILED; exit 1; }
  echo "new DB reset"
fi

# 1. Schema (pre-data: types, tables, functions) — schema only, no rows read
/app/bin/pg_dump -Fc --schema-only --no-owner --no-acl "$OLD" > /tmp/schema.dump || { echo SCHEMA_DUMP_FAILED; exit 1; }
/app/bin/pg_restore --section=pre-data --no-owner --no-acl --single-transaction --exit-on-error -d "$NEW" /tmp/schema.dump || { echo PREDATA_FAILED; exit 1; }
echo "pre-data OK"

# 2. Export data from OLD inside a rolled-back transaction
TABLES=$($P "$OLD" -Atc "select format('%I.%I',table_schema,table_name) from information_schema.tables where table_type='BASE TABLE' and table_schema in ('public','internal') order by 1")
FORCED=$($P "$OLD" -Atc "select format('%I.%I',n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and c.relforcerowsecurity and n.nspname in ('public','internal')")
{
  echo "\\set ON_ERROR_STOP on"; echo "begin;"
  for t in $FORCED; do echo "alter table $t no force row level security;"; done
  for t in $TABLES; do
    cols=$($P "$OLD" -Atc "select string_agg(format('%I',column_name),',' order by ordinal_position) from information_schema.columns where format('%I.%I',table_schema,table_name)='$t' and is_generated='NEVER'")
    f="/tmp/data/$(echo "$t" | tr -d '"' | tr . _).csv"
    echo "$t|$cols|$f" >> /tmp/cols.txt
    echo "\\copy (select $cols from $t) to '$f' with (format csv)"
    echo "select '$t', count(*) from $t;"
  done
  echo "rollback;"
} > /tmp/export.sql
$P "$OLD" -q -At -f /tmp/export.sql > /tmp/oldcounts.txt || { echo EXPORT_FAILED; exit 1; }
echo "export OK ($(wc -l < /tmp/oldcounts.txt) tables)"

# 3. Import into NEW (RLS switched off only inside the transaction, restored before commit)
RLS_ON=$($P "$NEW" -Atc "select format('%I.%I',n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and c.relrowsecurity and n.nspname in ('public','internal')")
FORCED_NEW=$($P "$NEW" -Atc "select format('%I.%I',n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and c.relforcerowsecurity and n.nspname in ('public','internal')")
{
  echo "\\set ON_ERROR_STOP on"; echo "begin;"
  for t in $RLS_ON; do echo "alter table $t disable row level security;"; done
  for t in $FORCED_NEW; do echo "alter table $t no force row level security;"; done
  while IFS='|' read -r t cols f; do echo "\\copy $t ($cols) from '$f' with (format csv)"; done < /tmp/cols.txt
  for t in $RLS_ON; do echo "alter table $t enable row level security;"; done
  for t in $FORCED_NEW; do echo "alter table $t force row level security;"; done
  echo "commit;"
} > /tmp/import.sql
$P "$NEW" -q -f /tmp/import.sql || { echo IMPORT_FAILED; exit 1; }
echo "import OK"

# 4. Sequences
$P "$OLD" -Atc "select format('select setval(%L, %s, %s);', format('%I.%I',schemaname,sequencename), last_value, 'true') from pg_sequences where schemaname in ('public','internal') and last_value is not null" > /tmp/seq.sql
$P "$NEW" -q -v ON_ERROR_STOP=1 -f /tmp/seq.sql > /dev/null || { echo SEQ_FAILED; exit 1; }
echo "sequences OK ($(wc -l < /tmp/seq.sql))"

# 5. Post-data: constraints, indexes, triggers, policies
/app/bin/pg_restore --section=post-data --no-owner --no-acl --single-transaction --exit-on-error -d "$NEW" /tmp/schema.dump || { echo POSTDATA_FAILED; exit 1; }
echo "post-data OK"

# 6. Compare row counts (read in a rolled-back transaction on NEW too)
FORCED_NEW2=$($P "$NEW" -Atc "select format('%I.%I',n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and c.relforcerowsecurity and n.nspname in ('public','internal')")
{
  echo "\\set ON_ERROR_STOP on"; echo "begin;"
  for t in $FORCED_NEW2; do echo "alter table $t no force row level security;"; done
  for t in $TABLES; do echo "select '$t', count(*) from $t;"; done
  echo "rollback;"
} > /tmp/count.sql
$P "$NEW" -q -At -f /tmp/count.sql > /tmp/newcounts.txt || { echo COUNT_FAILED; exit 1; }
if diff /tmp/oldcounts.txt /tmp/newcounts.txt > /tmp/diff.txt; then
  echo "ROW COUNTS IDENTICAL ($(wc -l < /tmp/oldcounts.txt) tables, $(awk -F'|' '{s+=$2} END {print s}' /tmp/oldcounts.txt) rows)"
else
  echo "ROW COUNT DIFFERENCES:"; cat /tmp/diff.txt
fi

# 7. Security structure, old vs new
R="select count(*) filter (where relrowsecurity)||'/'||count(*) filter (where relforcerowsecurity)||'/'||(select count(*) from pg_policies) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','internal') and c.relkind='r'"
echo "RLS enabled/forced/policies  old: $($P "$OLD" -Atc "$R")  new: $($P "$NEW" -Atc "$R")"
F="select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','internal')"
echo "functions  old: $($P "$OLD" -Atc "$F")  new: $($P "$NEW" -Atc "$F")"
rm -rf /tmp/data /tmp/schema.dump
echo DONE
