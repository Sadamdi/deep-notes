#!/usr/bin/env bash
# One-time server preparation for Deep Notes. Run as root ON THE SERVER, after reading it.
#
#   sudo bash bootstrap-server.sh "<ssh public key line for the deploy user>" [server_name]
#
# What it does: installs git, nginx, Node 22, pnpm, pm2; creates a "deploy" user that can only log in with the
# given public key; creates /opt/deepnotes; installs an nginx site. What it deliberately does NOT do: touch the
# firewall, change sshd settings, remove existing nginx sites, or write any secret.
set -euo pipefail

PUBKEY="${1:?usage: bootstrap-server.sh \"<public key line>\" [server_name]}"
SERVER_NAME="${2:-_}"
APP_ROOT=/opt/deepnotes

echo "== Preflight: what already runs here (read this before continuing) =="
ss -ltnp 2>/dev/null | awk 'NR==1 || /:80 |:443 |:4000 /' || true
ls /etc/nginx/sites-enabled 2>/dev/null || echo "(no nginx sites yet)"
read -r -p "Continue? [y/N] " ok
[ "${ok:-N}" = "y" ] || { echo "aborted"; exit 1; }

echo "== Packages =="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y git curl ca-certificates nginx

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  echo "== Node 22 (NodeSource setup script; review https://github.com/nodesource/distributions if unsure) =="
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
corepack enable
npm install -g pm2

echo "== deploy user =="
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
grep -qxF "$PUBKEY" /home/deploy/.ssh/authorized_keys 2>/dev/null || echo "$PUBKEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
# the only privileged command the deploy user may run without a password
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl reload nginx' > /etc/sudoers.d/deploy-nginx
chmod 440 /etc/sudoers.d/deploy-nginx

echo "== Directories =="
install -d -o deploy -g deploy "$APP_ROOT" "$APP_ROOT/app" "$APP_ROOT/uploads" "$APP_ROOT/backups" "$APP_ROOT/logs"
chmod 700 "$APP_ROOT/uploads"

echo "== nginx site =="
sed "s/__SERVER_NAME__/${SERVER_NAME}/" "$(dirname "$0")/nginx/deepnotes.conf" > /etc/nginx/sites-available/deepnotes
ln -sf /etc/nginx/sites-available/deepnotes /etc/nginx/sites-enabled/deepnotes
nginx -t
systemctl reload nginx

echo "== pm2 startup for the deploy user =="
su - deploy -c 'pm2 startup systemd -u deploy --hp /home/deploy' | tail -n 3 || true
echo
echo "Next (as the deploy user): clone the repo into $APP_ROOT/app, create $APP_ROOT/.env (chmod 600), run scripts/deploy.sh."
echo "Then, once key login works for deploy, consider disabling SSH password login yourself."
