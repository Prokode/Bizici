#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this setup with sudo." >&2
  exit 1
fi
origin="${1:-https://api-bizici.run.place}"
if [[ ! "${origin}" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]{1,5})?$ ]]; then
  echo "Expected an HTTPS API origin without a path." >&2
  exit 1
fi
id bizici >/dev/null 2>&1 || { echo "The bizici service user must exist first." >&2; exit 1; }
install -d -m 0750 -o bizici -g bizici /var/lib/bizici/photos
install -d -m 0755 /etc/systemd/system/bizici-api.service.d
cat > /etc/systemd/system/bizici-api.service.d/photos.conf <<CONFIG
[Service]
Environment=PHOTO_STORAGE_PROVIDER=local
Environment=PHOTO_STORAGE_DIR=/var/lib/bizici/photos
Environment=PHOTO_PUBLIC_ORIGIN=${origin}
StateDirectory=bizici/photos
StateDirectoryMode=0750
ReadWritePaths=/var/lib/bizici/photos
CONFIG
chmod 0644 /etc/systemd/system/bizici-api.service.d/photos.conf
systemctl daemon-reload
if systemctl is-active --quiet bizici-api.service; then
  systemctl restart bizici-api.service
fi
echo "Persistent photos configured in /var/lib/bizici/photos."
echo "Back up this directory together with MongoDB. Releases and rollbacks do not remove it."
