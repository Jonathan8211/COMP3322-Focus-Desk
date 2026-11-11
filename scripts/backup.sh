#!/usr/bin/env bash
set -euo pipefail
umask 077

if [[ $# -ne 1 || "$1" != *.sql.gz ]]; then
  echo 'Usage: scripts/backup.sh backups/name.sql.gz' >&2
  exit 2
fi

cd "$(dirname "$0")/.."
target=$1
mkdir -p "$(dirname "$target")"
temporary=$(mktemp "${target}.tmp.XXXXXX")
trap 'rm -f "$temporary"' EXIT

compose=(docker compose)
if [[ -n "${FOCUSDESK_ENV_FILE:-}" ]]; then
  compose+=(--env-file "$FOCUSDESK_ENV_FILE")
fi

"${compose[@]}" exec -T db sh -c 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysqldump --single-transaction --quick --no-tablespaces --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"' | gzip -9 > "$temporary"
test -s "$temporary"
mv "$temporary" "$target"
trap - EXIT
echo "Backup saved to $target"
