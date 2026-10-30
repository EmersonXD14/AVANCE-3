#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 o superior es requerido." >&2
  exit 1
fi
node -e "if(Number(process.versions.node.split('.')[0]) < 22) process.exit(1)" || {
  echo "Se requiere Node.js 22 o superior." >&2
  exit 1
}
npm start
