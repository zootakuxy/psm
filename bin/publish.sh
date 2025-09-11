#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

# ---------------------------
# Funções auxiliares
# ---------------------------

abort() {
  echo "❌ $1"
  exit 1
}

check_deps() {
  for cmd in jq npm; do
    command -v "$cmd" >/dev/null 2>&1 || abort "Dependência não encontrada: $cmd"
  done
}

validate_version() {
  local v="$1"
  if [[ ! "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
    abort "Versão inválida: $v (use semver, ex: 1.2.3 ou 1.2.3-beta.1)"
  fi
}

update_version() {
  local dir="$1"
  echo "📦 Atualizando versão em $dir/package.json -> $VERSION"
  jq --arg v "$VERSION" '.version = $v' "$dir/package.json" > "$dir/package.json.tmp" \
    && mv "$dir/package.json.tmp" "$dir/package.json"
}

publish_pkg() {
  local dir="$1"
  echo "🚀 Publicando $dir"
  (cd "$dir" && npm publish --access public)
}

# ---------------------------
# Script principal
# ---------------------------

if [ -z "$VERSION" ]; then
  abort "Uso: $0 <version>"
fi

check_deps
validate_version "$VERSION"

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
PG_DIR="$ROOT_DIR/../psm-pg"

echo "⚡ Preparando publicação da versão $VERSION"
read -rp "Confirmar publicação? (y/N) " resp
[[ "$resp" =~ ^[Yy]$ ]] || abort "Operação cancelada."

# Atualizar versão nos dois projetos
update_version "$ROOT_DIR"
update_version "$PG_DIR"

# Publicar nos dois projetos
publish_pkg "$ROOT_DIR"
publish_pkg "$PG_DIR"

echo "✅ Publicação concluída! Versão $VERSION"
