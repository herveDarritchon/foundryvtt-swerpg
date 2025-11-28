#!/bin/bash
# Script de validation de la migration du logging
# Usage: ./validate-logging-migration.sh

set -e

echo "=================================================="
echo "Validation de la Migration du Logging"
echo "=================================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Vérifier qu'il n'y a pas d'appels console.xxx dans module/ (sauf logger.mjs)
echo "1. Vérification des appels console.xxx dans module/..."
CONSOLE_CALLS=$(grep -r "console\." module/ --include="*.mjs" --exclude="logger.mjs" | wc -l | tr -d ' ')
if [ "$CONSOLE_CALLS" -eq "0" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Aucun appel console trouvé dans module/ (hors logger.mjs)"
else
  echo -e "${RED}❌ FAIL${NC}: $CONSOLE_CALLS appels console trouvés dans module/"
  grep -r "console\." module/ --include="*.mjs" --exclude="logger.mjs" | head -10
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Vérifier que logger.mjs existe et contient bien les méthodes attendues
echo "2. Vérification de logger.mjs..."
if [ -f "module/utils/logger.mjs" ]; then
  echo -e "${GREEN}✅ PASS${NC}: logger.mjs existe"

  # Vérifier les méthodes principales
  METHODS=("error" "warn" "info" "debug" "log" "enableDebug" "disableDebug" "isDebugEnabled")
  for method in "${METHODS[@]}"; do
    if grep -q "$method" module/utils/logger.mjs; then
      echo -e "${GREEN}  ✅${NC} Méthode '$method' trouvée"
    else
      echo -e "${RED}  ❌${NC} Méthode '$method' manquante"
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo -e "${RED}❌ FAIL${NC}: logger.mjs n'existe pas"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Vérifier les imports du logger
echo "3. Vérification des imports du logger..."
LOGGER_IMPORTS=$(grep -r "import { logger } from" module/ --include="*.mjs" | wc -l | tr -d ' ')
LOGGER_USAGES=$(grep -rE "logger\.(error|warn|info|debug|log)" module/ --include="*.mjs" | wc -l | tr -d ' ')

if [ "$LOGGER_IMPORTS" -gt "0" ]; then
  echo -e "${GREEN}✅ PASS${NC}: $LOGGER_IMPORTS fichiers importent le logger"
else
  echo -e "${YELLOW}⚠️  WARN${NC}: Aucun import du logger trouvé"
fi

if [ "$LOGGER_USAGES" -gt "0" ]; then
  echo -e "${GREEN}✅ PASS${NC}: $LOGGER_USAGES appels au logger trouvés"
else
  echo -e "${RED}❌ FAIL${NC}: Aucun appel au logger trouvé"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Vérifier les fichiers autorisés à utiliser console
echo "4. Vérification des fichiers autorisés (gulpfile.mjs, tests/, etc.)..."
GULPFILE_CONSOLE=$(grep "console\." gulpfile.mjs 2>/dev/null | wc -l | tr -d ' ')
if [ "$GULPFILE_CONSOLE" -gt "0" ]; then
  echo -e "${GREEN}ℹ️  INFO${NC}: gulpfile.mjs contient $GULPFILE_CONSOLE appels console (autorisé pour build)"
fi
echo ""

# 5. Résumé final
echo "=================================================="
echo "RÉSUMÉ"
echo "=================================================="
echo ""
echo "Fichiers avec import logger: $LOGGER_IMPORTS"
echo "Appels au logger: $LOGGER_USAGES"
echo "Appels console dans module/: $CONSOLE_CALLS (hors logger.mjs)"
echo ""

if [ "$ERRORS" -eq "0" ]; then
  echo -e "${GREEN}🎉 SUCCÈS${NC}: La migration du logging est complète et conforme !"
  echo ""
  echo "Tous les logs de l'application passent par le logger centralisé."
  exit 0
else
  echo -e "${RED}❌ ÉCHEC${NC}: $ERRORS erreur(s) détectée(s)"
  echo ""
  echo "Veuillez corriger les erreurs avant de valider la migration."
  exit 1
fi

