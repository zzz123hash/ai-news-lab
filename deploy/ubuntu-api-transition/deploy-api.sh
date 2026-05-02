#!/usr/bin/env bash
set -euo pipefail

APP_NAME="omnihex-api"
TARGET_DIR="/opt/omnihex/api"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Run server-setup.sh first."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "PM2 is not installed. Run server-setup.sh first."
  exit 1
fi

echo "==> Preparing ${TARGET_DIR}"
mkdir -p /opt/omnihex

if [ ! -d "${SCRIPT_DIR}/api" ]; then
  echo "Cannot find API template at ${SCRIPT_DIR}/api"
  exit 1
fi

mkdir -p "${TARGET_DIR}"
cp -R "${SCRIPT_DIR}/api/." "${TARGET_DIR}/"

cd "${TARGET_DIR}"

echo "==> Installing API dependencies"
npm install --omit=dev

echo "==> Starting API with PM2"
if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  pm2 restart "${APP_NAME}" --update-env
else
  pm2 start server.js --name "${APP_NAME}" --time
fi

pm2 save

echo
echo "Deployment complete."
echo "PM2 process list:"
pm2 list
echo
echo "Manual startup step:"
echo "Run this command, then copy and execute the command printed by PM2:"
echo
echo "  pm2 startup"
echo
echo "The API should now listen on http://127.0.0.1:3000/health"
