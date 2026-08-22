#!/usr/bin/env bash
set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly DEPLOY_ROOT="/opt/bizici"
readonly SERVICE_USER="bizici"
readonly DEPLOY_USER="bizici-deploy"
readonly API_ENV_FILE="/etc/bizici/api.env"
readonly NGINX_SITE="/etc/nginx/sites-available/bizici-staging"
readonly LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-${1:-}}"
readonly PNPM_VERSION="10.26.1"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root." >&2
  exit 1
fi

if [[ -z "${LETSENCRYPT_EMAIL}" ]]; then
  echo "Usage: LETSENCRYPT_EMAIL=ops@example.com $0" >&2
  exit 1
fi

for required_file in \
  "${SCRIPT_DIR}/api.env.example" \
  "${SCRIPT_DIR}/bizici-api.service" \
  "${SCRIPT_DIR}/deploy-release.sh" \
  "${SCRIPT_DIR}/rollback-release.sh" \
  "${SCRIPT_DIR}/nginx/bizici-staging.conf"; do
  if [[ ! -f "${required_file}" ]]; then
    echo "Missing required file: ${required_file}" >&2
    exit 1
  fi
done

if [[ -L /etc/nginx/sites-enabled/default && ! -e /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  ca-certificates \
  certbot \
  curl \
  gnupg \
  nginx \
  openssh-client \
  python3-certbot-nginx \
  sudo \
  ufw \
  util-linux

install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
  | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
  > /etc/apt/sources.list.d/nodesource.list
apt-get update
apt-get install -y nodejs
npm install --global "pnpm@${PNPM_VERSION}"

if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
  useradd \
    --system \
    --create-home \
    --home-dir "/var/lib/${SERVICE_USER}" \
    --shell /usr/sbin/nologin \
    "${SERVICE_USER}"
fi
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd \
    --create-home \
    --home-dir "/home/${DEPLOY_USER}" \
    --shell /bin/bash \
    "${DEPLOY_USER}"
fi
install -d -m 0700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" \
  "/home/${DEPLOY_USER}/.ssh"

install -d -m 0755 "${DEPLOY_ROOT}" "${DEPLOY_ROOT}/releases"
install -d -m 0755 -o "${SERVICE_USER}" -g "${SERVICE_USER}" \
  "${DEPLOY_ROOT}/releases/bootstrap/api" \
  "${DEPLOY_ROOT}/releases/bootstrap/admin" \
  "${DEPLOY_ROOT}/releases/bootstrap/site"

cat > "${DEPLOY_ROOT}/releases/bootstrap/admin/index.html" <<'HTML'
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>BizIci Admin</title></head>
<body><p>Déploiement de BizIci Admin en attente.</p></body></html>
HTML
cat > "${DEPLOY_ROOT}/releases/bootstrap/site/index.html" <<'HTML'
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>BizIci</title></head>
<body><p>Déploiement du site BizIci en attente.</p></body></html>
HTML
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${DEPLOY_ROOT}/releases/bootstrap"

if [[ ! -e "${DEPLOY_ROOT}/current" && ! -L "${DEPLOY_ROOT}/current" ]]; then
  ln -s "${DEPLOY_ROOT}/releases/bootstrap" "${DEPLOY_ROOT}/current"
fi

install -d -m 0750 -o root -g "${SERVICE_USER}" /etc/bizici
if [[ ! -f "${API_ENV_FILE}" ]]; then
  install -m 0640 -o root -g "${SERVICE_USER}" \
    "${SCRIPT_DIR}/api.env.example" \
    "${API_ENV_FILE}"
  echo "Created ${API_ENV_FILE}. Replace every CHANGE_ME value before the first deployment."
else
  chown root:"${SERVICE_USER}" "${API_ENV_FILE}"
  chmod 0640 "${API_ENV_FILE}"
  echo "Preserved existing ${API_ENV_FILE}."
fi

install -m 0644 \
  "${SCRIPT_DIR}/bizici-api.service" \
  /etc/systemd/system/bizici-api.service
install -m 0750 \
  "${SCRIPT_DIR}/deploy-release.sh" \
  /usr/local/sbin/bizici-deploy-release
install -m 0750 \
  "${SCRIPT_DIR}/rollback-release.sh" \
  /usr/local/sbin/bizici-rollback-release
cat > /etc/sudoers.d/bizici-deploy <<'SUDOERS'
Cmnd_Alias BIZICI_DEPLOY_RELEASE = /usr/local/sbin/bizici-deploy-release *
bizici-deploy ALL=(root) NOPASSWD: BIZICI_DEPLOY_RELEASE
SUDOERS
chmod 0440 /etc/sudoers.d/bizici-deploy
visudo -cf /etc/sudoers.d/bizici-deploy
systemctl daemon-reload
systemctl enable bizici-api.service

install -m 0644 \
  "${SCRIPT_DIR}/nginx/bizici-staging.conf" \
  "${NGINX_SITE}"
rm -f /etc/nginx/conf.d/bizici-server-names.conf
if grep -Eq '^[[:space:]]*server_names_hash_bucket_size[[:space:]]+' /etc/nginx/nginx.conf; then
  sed -Ei \
    's/^([[:space:]]*)server_names_hash_bucket_size[[:space:]]+[0-9]+;/\1server_names_hash_bucket_size 64;/' \
    /etc/nginx/nginx.conf
elif grep -Eq '^[[:space:]]*#[[:space:]]*server_names_hash_bucket_size[[:space:]]+' /etc/nginx/nginx.conf; then
  sed -Ei \
    's/^([[:space:]]*)#[[:space:]]*server_names_hash_bucket_size[[:space:]]+[0-9]+;/\1server_names_hash_bucket_size 64;/' \
    /etc/nginx/nginx.conf
else
  sed -i \
    '/^[[:space:]]*http[[:space:]]*{/a\\    server_names_hash_bucket_size 64;' \
    /etc/nginx/nginx.conf
fi
ln -sfn "${NGINX_SITE}" /etc/nginx/sites-enabled/bizici-staging
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

ssh_port="$(
  /usr/sbin/sshd -T 2>/dev/null \
    | awk '$1 == "port" && !found { print $2; found = 1 }'
)"
ssh_port="${ssh_port:-22}"
ufw default deny incoming
ufw default allow outgoing
ufw allow "${ssh_port}/tcp" comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable

certbot --nginx \
  --non-interactive \
  --agree-tos \
  --email "${LETSENCRYPT_EMAIL}" \
  --redirect \
  --keep-until-expiring \
  -d api-bizici.run.place \
  -d admin-bizici.run.place \
  -d site-bizici.run.place
systemctl enable --now certbot.timer

nginx -t
systemctl reload nginx

cat <<EOF

BizIci staging host provisioning is complete.

Before the first GitHub deployment:
1. Edit ${API_ENV_FILE} and replace every CHANGE_ME value.
2. Allow 198.46.146.184 in the MongoDB Atlas test cluster network access list.
3. Add the GitHub Actions public key to /home/${DEPLOY_USER}/.ssh/authorized_keys.
4. Add the matching private key and pinned SSH known_hosts entry to GitHub.
5. Push the repository workflow to the test branch.

Node: $(node --version)
pnpm: $(pnpm --version)
Nginx: $(nginx -v 2>&1)
EOF