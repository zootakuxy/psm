#!/usr/bin/env bash
set -euo pipefail

# ---------------------------
# Funções auxiliares
# ---------------------------

abort() {
  echo "❌ $1"
  exit 1
}

check_deps() {
  for cmd in jq npm tsc; do
    command -v "$cmd" >/dev/null 2>&1 || abort "Dependência não encontrada: $cmd"
  done
}

validate_version() {
  local v="$1"
  if [[ ! "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
    abort "Versão inválida: $v (use semver, ex: 1.2.3 ou 1.2.3-beta.1)"
  fi
}

bump_patch_version() {
  local dir="$1"
  local current
  current=$(jq -r '.version' "$dir/package.json")
  validate_version "$current"
  local major minor patch
  IFS='.' read -r major minor patch <<< "${current%%-*}"
  patch=$((patch + 1))
  echo "$major.$minor.$patch"
}

update_version() {
  local dir="$1"
  echo "📦 Atualizando versão em $dir/package.json -> $VERSION"
  jq --arg v "$VERSION" '.version = $v' "$dir/package.json" > "$dir/package.json.tmp" \
    && mv "$dir/package.json.tmp" "$dir/package.json"
}

build_pkg() {
  local dir="$1"
  echo "🔨 Compilando TypeScript em $dir"
  (cd "$dir" && tsc)
}

publish_pkg() {
  local dir="$1"
  echo "🚀 Publicando $dir"
  (cd "$dir" && npm publish --access public)
}

# ---------------------------
# Script principal
# ---------------------------

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
PG_DIR="$ROOT_DIR/../psm-pg"

check_deps

# Se versão não for passada, incrementar o patch
if [ $# -eq 0 ]; then
  VERSION=$(bump_patch_version "$ROOT_DIR")
  echo "ℹ️ Nenhuma versão informada, usando versão incrementada automaticamente: $VERSION"
else
  VERSION="$1"
fi

validate_version "$VERSION"

echo "⚡ Preparando publicação da versão $VERSION"
read -rp "Confirmar publicação? (y/N) " resp
[[ "$resp" =~ ^[Yy]$ ]] || abort "Operação cancelada."

# Atualizar versão nos dois projetos
update_version "$ROOT_DIR"
update_version "$PG_DIR"

# Compilar antes de publicar
build_pkg "$ROOT_DIR"
build_pkg "$PG_DIR"

# Publicar nos dois projetos
publish_pkg "$ROOT_DIR"
publish_pkg "$PG_DIR"

echo "✅ Publicação concluída! Versão $VERSION"
