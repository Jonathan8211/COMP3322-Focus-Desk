#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || "$2" != '--yes' || ! -f "$1" ]]; then
  echo 'Usage: scripts/restore.sh backups/name.sql.gz --yes' >&2
  exit 2
fi

source_file=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
gzip -t "$source_file"
cd "$(dirname "$0")/.."

compose=(docker compose)
if [[ -n "${FOCUSDESK_ENV_FILE:-}" ]]; then
  compose+=(--env-file "$FOCUSDESK_ENV_FILE")
fi

restart_services() { "${compose[@]}" up -d api web >/dev/null || true; }
"${compose[@]}" stop web api
trap restart_services EXIT
gzip -dc "$source_file" | "${compose[@]}" exec -T db sh -c 'export MYSQL_PWD="$MYSQL_PASSWORD"; exec mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE"'
"${compose[@]}" up -d api web
trap - EXIT
echo 'Restore complete; check service health before using FocusDesk.'
