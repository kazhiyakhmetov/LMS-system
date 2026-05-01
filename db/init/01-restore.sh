#!/bin/bash
# Auto-restore on first postgres init.
# Mounted into /docker-entrypoint-initdb.d/ — runs only when data directory is empty.
# Looks at /backups/* and detects format: PGDMP (custom) -> pg_restore, plain SQL -> psql.

set -euo pipefail

BACKUP_DIR="/backups"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "[init] No /backups directory — skipping restore"
  exit 0
fi

shopt -s nullglob
files=("$BACKUP_DIR"/*)
if [ ${#files[@]} -eq 0 ]; then
  echo "[init] No backup files in $BACKUP_DIR — skipping restore"
  exit 0
fi

for f in "${files[@]}"; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  case "$base" in
    .gitkeep|.gitignore|README*) continue ;;
  esac

  echo "[init] Processing $f"
  if head -c 5 "$f" | grep -q "PGDMP"; then
    echo "[init]   format: pg_dump custom → pg_restore"
    pg_restore \
      -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" \
      --no-owner \
      --no-acl \
      --exit-on-error \
      "$f"
  else
    echo "[init]   format: plain SQL → psql"
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
  fi
  echo "[init]   done: $base"
done

echo "[init] All backups restored."
