#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

ok()     { printf "${GREEN}✔${RESET}  %s\n" "$1"; }
warn()   { printf "${YELLOW}⚠${RESET}  %s\n" "$1"; }
err()    { printf "${RED}✖${RESET}  %s\n" "$1" >&2; }
info()   { printf "${CYAN}→${RESET}  %s\n" "$1"; }
header() { printf "\n${BOLD}%s${RESET}\n" "$1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# ─── 1. Checks système ─────────────────────────────────────────────────────────
header "FlowSync — Vérification de l'environnement"

if ! command -v node &>/dev/null; then
  err "Node.js n'est pas installé. Installe-le via https://nodejs.org (v18+)"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  err "Node.js v18+ requis. Version actuelle : $(node --version)"
  exit 1
fi
ok "Node.js $(node --version)"

if ! command -v npm &>/dev/null; then
  err "npm n'est pas installé."
  exit 1
fi
ok "npm $(npm --version)"

# ─── 2. Répertoire backend ─────────────────────────────────────────────────────
header "Préparation du backend"

if [ ! -d "$BACKEND_DIR" ]; then
  err "Dossier backend introuvable : $BACKEND_DIR"
  exit 1
fi
ok "Dossier backend trouvé"

# ─── 3. Fichier .env ───────────────────────────────────────────────────────────
ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    warn ".env absent — copié depuis .env.example"
    warn "Pense à remplir les variables dans backend/.env avant de continuer !"
    printf "\n"
    printf "  Variables obligatoires :\n"
    printf "    ${CYAN}MONGODB_URI${RESET}   → URI de ta base MongoDB\n"
    printf "    ${CYAN}JWT_SECRET${RESET}    → Clé secrète JWT (min 32 chars)\n"
    printf "\n"
    read -r -p "  Appuie sur [Entrée] pour continuer quand même, ou Ctrl+C pour configurer d'abord... "
    printf "\n"
  else
    err ".env et .env.example introuvables dans backend/"
    exit 1
  fi
else
  ok ".env présent"
fi

# ─── 4. Vérification des variables critiques ───────────────────────────────────
set +u  # désactive le "unbound variable" le temps du source
# shellcheck disable=SC1090
source "$ENV_FILE" 2>/dev/null || true
set -u

if [ -z "${MONGODB_URI:-}" ]; then
  err "MONGODB_URI n'est pas défini dans backend/.env"
  exit 1
fi
ok "MONGODB_URI configuré"

JWT_DEFAULT="change_this_to_a_random_64_char_string_in_production"
if [ -z "${JWT_SECRET:-}" ] || [ "${JWT_SECRET}" = "$JWT_DEFAULT" ]; then
  warn "JWT_SECRET utilise encore la valeur par défaut — change-la en production !"
else
  ok "JWT_SECRET configuré"
fi

# ─── 5. Installation des dépendances ──────────────────────────────────────────
npm_install() {
  local label="$1"
  info "${label}..."
  # Pas de --silent : les erreurs npm s'affichent directement
  if ! npm install --prefix "$BACKEND_DIR"; then
    err "npm install a échoué — consulte les messages ci-dessus"
    exit 1
  fi
  ok "${label} — OK"
}

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  npm_install "Installation des dépendances npm"
else
  if [ "$BACKEND_DIR/package.json" -nt "$BACKEND_DIR/node_modules" ] 2>/dev/null; then
    npm_install "Mise à jour des dépendances npm"
  else
    ok "Dépendances déjà à jour"
  fi
fi

# ─── 6. Libérer le port si déjà occupé ────────────────────────────────────────
PORT="${PORT:-5000}"
NODE_ENV="${NODE_ENV:-development}"

if lsof -ti tcp:"$PORT" &>/dev/null 2>&1; then
  PID_LIST=$(lsof -ti tcp:"$PORT" 2>/dev/null | tr '\n' ' ' | xargs)
  warn "Le port $PORT est déjà utilisé (PID: $PID_LIST)"
  read -r -p "  Tuer ces processus et continuer ? [o/N] " CONFIRM
  printf "\n"
  if [[ "$CONFIRM" =~ ^[oO]$ ]]; then
    # Tuer nodemon s'il tourne (sinon il respawn immédiatement un nouveau node)
    pkill -9 -f "nodemon" 2>/dev/null || true
    pkill -9 -f "node server.js" 2>/dev/null || true
    sleep 0.5
    # Boucle jusqu'à ce que le port soit vraiment libre (max 5 secondes)
    MAX=10
    i=0
    while lsof -ti tcp:"$PORT" &>/dev/null 2>&1; do
      lsof -ti tcp:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
      sleep 0.5
      i=$((i + 1))
      if [ "$i" -ge "$MAX" ]; then
        err "Impossible de libérer le port $PORT. Ferme ton terminal et réessaie."
        exit 1
      fi
    done
    ok "Port $PORT libéré"
  else
    err "Abandon. Change le PORT dans backend/.env ou arrête le processus manuellement."
    exit 1
  fi
fi

# ─── 7. Démarrage ─────────────────────────────────────────────────────────────
header "Démarrage"

printf "\n"
printf "  ${BOLD}Mode   :${RESET} ${CYAN}${NODE_ENV}${RESET}\n"
printf "  ${BOLD}Port   :${RESET} ${CYAN}${PORT}${RESET}\n"
printf "  ${BOLD}API    :${RESET} ${CYAN}http://localhost:${PORT}/api${RESET}\n"
printf "  ${BOLD}Health :${RESET} ${CYAN}http://localhost:${PORT}/health${RESET}\n"
printf "\n"

if [ "$NODE_ENV" = "development" ]; then
  info "Démarrage en mode développement (nodemon)..."
  exec npm run dev --prefix "$BACKEND_DIR"
else
  info "Démarrage en mode production..."
  exec npm start --prefix "$BACKEND_DIR"
fi
