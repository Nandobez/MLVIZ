#!/usr/bin/env bash
# Unified launcher for the Neural Network Visualisation (React + Python).
#
# Usage:
#   ./run.sh                    # start the Vite dev server (front only)
#   ./run.sh --train [args]     # (re)train the MLP, export weights, then dev
#   ./run.sh --export-only      # just train + export, no front
#   ./run.sh --build            # production build (vite build)
#   ./run.sh --install          # set up Node + Python deps
#   ./run.sh --help

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV="$SCRIPT_DIR/.venv"
PY="$VENV/bin/python"
PIP="$VENV/bin/pip"
EXPORT_PATH="$SCRIPT_DIR/public/exports/mlp_weights.json"
TRAIN_SCRIPT="$SCRIPT_DIR/training/mlp_train.py"

color() { printf "\033[1;36m==> %s\033[0m\n" "$*"; }
warn()  { printf "\033[1;33m!! %s\033[0m\n" "$*" >&2; }
die()   { printf "\033[1;31mxx %s\033[0m\n" "$*" >&2; exit 1; }

usage() {
  sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

ensure_node_deps() {
  [[ -d node_modules ]] && return 0
  color "Installing Node deps (npm install)"
  npm install
}

ensure_python_deps() {
  if [[ ! -x "$PY" ]]; then
    color "Creating Python venv ($VENV)"
    python3 -m venv "$VENV"
  fi
  if ! "$PY" -c "import torch" 2>/dev/null; then
    color "Installing Python deps (numpy + torch CPU + torchvision)"
    "$PIP" install --quiet --upgrade pip
    "$PIP" install --quiet numpy torch torchvision \
      --index-url https://download.pytorch.org/whl/cpu
  fi
}

train_and_export() {
  ensure_python_deps
  color "Training MLP + exporting weights → $EXPORT_PATH"
  mkdir -p "$(dirname "$EXPORT_PATH")"
  "$PY" "$TRAIN_SCRIPT" \
    --export-path "$EXPORT_PATH" \
    --data-dir "$SCRIPT_DIR/.mnist-cache" \
    --device cpu \
    --num-workers 0 \
    "$@"
}

run_dev() {
  ensure_node_deps
  color "Starting Vite dev server (http://localhost:5173)"
  exec npm run dev
}

run_build() {
  ensure_node_deps
  color "Production build"
  npm run build
}

# ---- arg dispatch ----
mode="dev"
extra=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --install) mode="install"; shift ;;
    --train) mode="train_then_dev"; shift; extra=("$@"); break ;;
    --export-only) mode="export_only"; shift; extra=("$@"); break ;;
    --build) mode="build"; shift ;;
    *) extra+=("$1"); shift ;;
  esac
done

case "$mode" in
  install)        ensure_node_deps; ensure_python_deps; color "Done." ;;
  build)          run_build ;;
  export_only)    train_and_export "${extra[@]+"${extra[@]}"}" ;;
  train_then_dev) train_and_export "${extra[@]+"${extra[@]}"}"; run_dev ;;
  dev|*)          run_dev ;;
esac
