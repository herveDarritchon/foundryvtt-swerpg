#!/usr/bin/env bash
set -euo pipefail

# e2e-foundry-start.sh
# Script pour démarrer une instance Foundry VTT dédiée aux tests E2E Playwright pour le système Swerpg.
# Il prépare un environnement de données éphémère et nettoie après arrêt.
# Usage:
#   ./scripts/e2e-foundry-start.sh start   # démarre le container
#   ./scripts/e2e-foundry-start.sh stop    # arrête et nettoie
#   ./scripts/e2e-foundry-start.sh restart # redémarre
#   Variables personnalisables via env avant appel:
#     FOUNDRY_IMAGE (défaut: felddy/foundryvtt:13.351.0)
#     FOUNDRY_PORT (défaut: 30000)
#     FOUNDRY_INTERNAL_PORT (défaut: 30000)
#     FOUNDRY_CONTAINER_NAME (défaut: foundry-e2e-local)
#     FOUNDRY_LICENSE_KEY (OBLIGATOIRE si pas déjà licencié)
#     FOUNDRY_USERNAME (défaut: herveDarritchon)
#     FOUNDRY_PASSWORD (défaut: 2BZUKy3JgbnX2ai)
#     FOUNDRY_ADMIN_KEY (défaut: admin)
#     SYSTEM_ID (défaut: swerpg)
#     KEEP_DATA (si =1 ne nettoie pas le dossier data à l'arrêt)
#     SKIP_ENV_FILE (si =1 ne charge pas le fichier .env.e2e.local automatiquement)
#
# Le script charge automatiquement .env.e2e.local s'il existe (sauf si SKIP_ENV_FILE=1)
# Sécurité: ne commitez jamais vos secrets dans le dépôt.

COMMAND=${1:-start}

# Chargement automatique du fichier .env.e2e.local s'il existe
ROOT_DIR="$(pwd)"
ENV_FILE="${ROOT_DIR}/.env.e2e.local"
SKIP_ENV_FILE=${SKIP_ENV_FILE:-0}

load_env_file() {
  if [[ "$SKIP_ENV_FILE" -eq 1 ]]; then
    return
  fi

  if [[ -f "$ENV_FILE" ]]; then
    log "Chargement des variables depuis $ENV_FILE"
    # Charge le fichier en ignorant les commentaires et lignes vides
    set -a
    source <(grep -v '^#' "$ENV_FILE" | grep -v '^$' | sed "s/^export //")
    set +a
  fi
}

log() { printf "[e2e-foundry] %s\n" "$*"; }
err() { printf "[e2e-foundry][ERROR] %s\n" "$*" >&2; }

# Charger les variables depuis .env.e2e.local si présent
load_env_file

FOUNDRY_WORKING_DIR_NAME='.e2e-foundry-data/'
FOUNDRY_IMAGE=${FOUNDRY_IMAGE:-felddy/foundryvtt:13.351.0}
FOUNDRY_PORT=${FOUNDRY_PORT:-30000}
FOUNDRY_INTERNAL_PORT=${FOUNDRY_INTERNAL_PORT:-30000}
FOUNDRY_CONTAINER_NAME=${FOUNDRY_CONTAINER_NAME:-foundry-e2e-local}
FOUNDRY_LICENSE_KEY=${FOUNDRY_LICENSE_KEY:-""}
FOUNDRY_USERNAME=${FOUNDRY_USERNAME:-herveDarritchon}
FOUNDRY_PASSWORD=${FOUNDRY_PASSWORD:-2BZUKy3JgbnX2ai}
FOUNDRY_ADMIN_KEY=${FOUNDRY_ADMIN_KEY:-admin}
SYSTEM_ID=${SYSTEM_ID:-swerpg}
KEEP_DATA=${KEEP_DATA:-0}

DATA_DIR="${ROOT_DIR}/${FOUNDRY_WORKING_DIR_NAME}"
SYSTEM_DIR="${ROOT_DIR}" # montage du système directement dans Data/systems
INITIAL_INSTANCE_DATA_DIR="${ROOT_DIR}/resources/data/"

docker_exists() { command -v docker >/dev/null 2>&1; }

ensure_docker() { if ! docker_exists; then err "Docker non trouvé dans PATH"; exit 1; fi }

ensure_license() { if [[ -z "$FOUNDRY_LICENSE_KEY" ]]; then err "FOUNDRY_LICENSE_KEY est requis pour démarrer Foundry"; exit 1; fi }

create_data_dir() {
  if [[ -d "$DATA_DIR" ]]; then
    log "Répertoire data déjà présent: $DATA_DIR"
  else
    mkdir -p "$DATA_DIR" || { err "Impossible de créer $DATA_DIR"; exit 1; }
    log "Répertoire data créé: $DATA_DIR"
  fi
}

fill_data_dir() {
  if [[ -d "$DATA_DIR" ]]; then
    log "Répertoire data a déjà été crée: $DATA_DIR"
  else
    create_data_dir
  fi
  cp -Rp "${INITIAL_INSTANCE_DATA_DIR}" "${DATA_DIR}" || { err "Échec copie données initiales dans $DATA_DIR"; exit 1; }
}

start_container() {
  ensure_docker
  ensure_license
  create_data_dir
  fill_data_dir

  log "Démarrage container $FOUNDRY_CONTAINER_NAME sur le port $FOUNDRY_PORT ..."
  log "Utilisation de l'image: $FOUNDRY_IMAGE"
  log " Utilisation du port interne: $FOUNDRY_INTERNAL_PORT"
  log " Utilisation du port externe: $FOUNDRY_PORT"
  log "Montage du système '$SYSTEM_ID' depuis $SYSTEM_DIR"
  log "Répertoire data: $DATA_DIR"
  log "Licence Foundry: ${FOUNDRY_LICENSE_KEY:0:4}****${FOUNDRY_LICENSE_KEY: -4}"
  log "Utilisateur: $FOUNDRY_USERNAME"
  log "Mot de passe: ********"
  log "Clé admin: ********"

  docker run --rm -d \
    --name "$FOUNDRY_CONTAINER_NAME" \
    -p "${FOUNDRY_PORT}:${FOUNDRY_INTERNAL_PORT}" \
    -e FOUNDRY_LICENSE_KEY="$FOUNDRY_LICENSE_KEY" \
    -e FOUNDRY_USERNAME="$FOUNDRY_USERNAME" \
    -e FOUNDRY_PASSWORD="$FOUNDRY_PASSWORD" \
    -e FOUNDRY_ADMIN_KEY="$FOUNDRY_ADMIN_KEY" \
    -e FOUNDRY_PORT="$FOUNDRY_INTERNAL_PORT" \
    -v "$DATA_DIR:/data" \
    -v "$SYSTEM_DIR:/data/Data/systems/$SYSTEM_ID" \
    "$FOUNDRY_IMAGE"

  log "Container démarré. Accès: http://localhost:${FOUNDRY_PORT}";
  log "Pour logs: docker logs -f $FOUNDRY_CONTAINER_NAME";
}

stop_container() {
  ensure_docker
  if docker ps --format '{{.Names}}' | grep -q "^${FOUNDRY_CONTAINER_NAME}$"; then
    log "Arrêt du container $FOUNDRY_CONTAINER_NAME ..."
    docker stop "$FOUNDRY_CONTAINER_NAME" >/dev/null
    log "Container arrêté."
  else
    log "Container $FOUNDRY_CONTAINER_NAME non démarré."
  fi
  if [[ "$KEEP_DATA" -eq 0 ]]; then
    log "Nettoyage du répertoire data éphémère ..."
    rm -rf "$DATA_DIR" || err "Échec suppression $DATA_DIR"
  else
    log "Conservation du répertoire data (KEEP_DATA=1)."
  fi
}

restart_container() { stop_container; start_container; }

usage() {
  cat <<EOF
Usage: $0 [start|stop|restart]
  start    Démarre l'instance Foundry E2E
  stop     Arrête et nettoie (sauf si KEEP_DATA=1)
  restart  Redémarre l'instance

Le script charge automatiquement .env.e2e.local s'il existe.

Variables d'environnement optionnelles:
  FOUNDRY_IMAGE, FOUNDRY_PORT, FOUNDRY_CONTAINER_NAME, FOUNDRY_LICENSE_KEY,
  FOUNDRY_USERNAME, FOUNDRY_PASSWORD, FOUNDRY_ADMIN_KEY, SYSTEM_ID,
  KEEP_DATA (1=conserver data), SKIP_ENV_FILE (1=ignorer .env.e2e.local)
EOF
}

case "$COMMAND" in
  start) start_container;;
  stop) stop_container;;
  restart) restart_container;;
  *) usage; exit 1;;
 esac
