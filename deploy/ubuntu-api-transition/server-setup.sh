#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run this setup script with sudo or as root."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating Ubuntu packages"
apt-get update
apt-get upgrade -y

echo "==> Installing base packages"
apt-get install -y \
  ca-certificates \
  curl \
  debian-archive-keyring \
  debian-keyring \
  git \
  gnupg \
  gpg \
  unzip \
  ufw

echo "==> Installing Node.js 22 from NodeSource"
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
chmod 0644 /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs

echo "==> Installing Caddy"
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
chmod 0644 /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
  > /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

echo "==> Installing PM2"
npm install -g pm2

echo "==> Configuring UFW"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Creating /opt/omnihex"
mkdir -p /opt/omnihex
if [ -n "${SUDO_USER:-}" ] && [ "${SUDO_USER}" != "root" ]; then
  chown -R "${SUDO_USER}:${SUDO_USER}" /opt/omnihex
fi

echo
echo "Setup complete."
echo "Installed versions:"
node --version
npm --version
caddy version
pm2 --version
echo
echo "SSH hardening note:"
echo "- This script did not change SSH settings or disable root login."
echo "- After you confirm sudo access with another user, consider disabling password login and root SSH login manually."
