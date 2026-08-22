#!/usr/bin/env bash
set -Eeuo pipefail

readonly DEPLOY_ROOT="/opt/bizici"
readonly RELEASES_DIR="${DEPLOY_ROOT}/releases"
readonly CURRENT_LINK="${DEPLOY_ROOT}/current"
readonly API_ENV_FILE="/etc/bizici/api.env"
readonly SERVICE_NAME="bizici-api.service"
readonly SERVICE_USER="bizici"
readonly KEEP_RELEASES=5
readonly MAX_ARCHIVE_BYTES=$((256 * 1024 * 1024))
readonly MAX_CHECKSUM_BYTES=4096

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root." >&2
  exit 1
fi

if [[ "$#" -ne 3 ]]; then
  echo "Usage: $0 <release-id> <archive.tar.gz> <archive.sha256>" >&2
  exit 1
fi

readonly RELEASE_ID="$1"
readonly ARCHIVE_UPLOAD_PATH="$2"
readonly CHECKSUM_UPLOAD_PATH="$3"
readonly RELEASE_DIR="${RELEASES_DIR}/${RELEASE_ID}"
readonly TEMP_RELEASE_DIR="${RELEASES_DIR}/.${RELEASE_ID}.tmp"
readonly EXPECTED_ARCHIVE_PATH="/var/tmp/bizici-${RELEASE_ID}.tar.gz"
readonly EXPECTED_CHECKSUM_PATH="${EXPECTED_ARCHIVE_PATH}.sha256"

if [[ ! "${RELEASE_ID}" =~ ^[a-fA-F0-9]{7,64}$ ]]; then
  echo "Invalid release id: ${RELEASE_ID}" >&2
  exit 1
fi
if [[ "${ARCHIVE_UPLOAD_PATH}" != "${EXPECTED_ARCHIVE_PATH}" ]]; then
  echo "Unexpected release archive path: ${ARCHIVE_UPLOAD_PATH}" >&2
  exit 1
fi
if [[ "${CHECKSUM_UPLOAD_PATH}" != "${EXPECTED_CHECKSUM_PATH}" ]]; then
  echo "Unexpected checksum path: ${CHECKSUM_UPLOAD_PATH}" >&2
  exit 1
fi

for required_path in \
  "${ARCHIVE_UPLOAD_PATH}" \
  "${CHECKSUM_UPLOAD_PATH}" \
  "${API_ENV_FILE}"; do
  if [[ ! -f "${required_path}" ]]; then
    echo "Missing required file: ${required_path}" >&2
    exit 1
  fi
done

install -d -m 0700 -o root -g root "${DEPLOY_ROOT}/incoming"
exec 9> "${DEPLOY_ROOT}/deploy.lock"
if ! flock -n 9; then
  echo "Another BizIci deployment is already running." >&2
  exit 1
fi

umask 0077
readonly LOCKED_INPUT_DIR="$(
  mktemp -d "${DEPLOY_ROOT}/incoming/${RELEASE_ID}.XXXXXX"
)"
trap 'rm -rf "${LOCKED_INPUT_DIR}"' EXIT

lock_uploaded_file() {
  local source_path="$1"
  local destination_path="$2"
  local max_bytes="$3"
  local source_fd
  local source_type
  local source_size
  local copied_size

  exec {source_fd}< "${source_path}"
  source_type="$(stat -Lc '%F' "/proc/$$/fd/${source_fd}")"
  source_size="$(stat -Lc '%s' "/proc/$$/fd/${source_fd}")"
  if [[ "${source_type}" != "regular file" ]]; then
    echo "Upload is not a regular file: ${source_path}" >&2
    exec {source_fd}<&-
    return 1
  fi
  if ((source_size <= 0 || source_size > max_bytes)); then
    echo "Upload has an invalid size: ${source_path}" >&2
    exec {source_fd}<&-
    return 1
  fi

  head -c "$((max_bytes + 1))" <&"${source_fd}" > "${destination_path}"
  exec {source_fd}<&-
  copied_size="$(stat -c '%s' "${destination_path}")"
  if ((copied_size <= 0 || copied_size > max_bytes)); then
    echo "Locked upload has an invalid size: ${source_path}" >&2
    return 1
  fi
  chown root:root "${destination_path}"
  chmod 0600 "${destination_path}"
}

readonly ARCHIVE_PATH="${LOCKED_INPUT_DIR}/release.tar.gz"
readonly CHECKSUM_PATH="${LOCKED_INPUT_DIR}/release.sha256"
lock_uploaded_file \
  "${ARCHIVE_UPLOAD_PATH}" \
  "${ARCHIVE_PATH}" \
  "${MAX_ARCHIVE_BYTES}"
lock_uploaded_file \
  "${CHECKSUM_UPLOAD_PATH}" \
  "${CHECKSUM_PATH}" \
  "${MAX_CHECKSUM_BYTES}"
rm -f -- "${ARCHIVE_UPLOAD_PATH}" "${CHECKSUM_UPLOAD_PATH}" || true

for required_key in \
  MONGODB_URI \
  SESSION_SECRET \
  CLERK_SECRET_KEY \
  CLERK_PUBLISHABLE_KEY \
  ADMIN_JWT_SECRET \
  ROOT_ADMIN_PASSWORD; do
  if ! grep -Eq "^${required_key}=.+" "${API_ENV_FILE}"; then
    echo "Missing ${required_key} in ${API_ENV_FILE}" >&2
    exit 1
  fi
  if grep -Eq "^${required_key}=CHANGE_ME([[:space:]]*)$" "${API_ENV_FILE}"; then
    echo "${required_key} still contains CHANGE_ME in ${API_ENV_FILE}" >&2
    exit 1
  fi
done
if ! grep -Eq '^REQUIRE_DB_READY=true([[:space:]]*)$' "${API_ENV_FILE}"; then
  echo "REQUIRE_DB_READY=true is required in ${API_ENV_FILE}" >&2
  exit 1
fi

expected_checksum="$(awk 'NF { print $1; exit }' "${CHECKSUM_PATH}")"
actual_checksum="$(sha256sum "${ARCHIVE_PATH}" | awk '{ print $1 }')"
if [[ -z "${expected_checksum}" || "${expected_checksum}" != "${actual_checksum}" ]]; then
  echo "Release archive checksum verification failed." >&2
  exit 1
fi

while IFS= read -r archive_entry; do
  if [[ "${archive_entry}" == /* || "${archive_entry}" == *"../"* ]]; then
    echo "Unsafe path in release archive: ${archive_entry}" >&2
    exit 1
  fi
done < <(tar -tzf "${ARCHIVE_PATH}")
while IFS= read -r archive_metadata; do
  archive_type="${archive_metadata:0:1}"
  if [[ "${archive_type}" != "-" && "${archive_type}" != "d" ]]; then
    echo "Unsupported entry type in release archive: ${archive_metadata}" >&2
    exit 1
  fi
done < <(LC_ALL=C tar -tvzf "${ARCHIVE_PATH}")

current_target="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
if [[ -d "${RELEASE_DIR}" && "${current_target}" == "${RELEASE_DIR}" ]]; then
  echo "Release ${RELEASE_ID} is already active."
  systemctl restart "${SERVICE_NAME}"
  curl --fail --silent --show-error \
    --retry 15 --retry-connrefused --retry-delay 2 \
    http://127.0.0.1:8080/api/healthz >/dev/null
  exit 0
fi

rm -rf "${TEMP_RELEASE_DIR}"
if [[ -d "${RELEASE_DIR}" ]]; then
  rm -rf "${RELEASE_DIR}"
fi
install -d -m 0755 "${TEMP_RELEASE_DIR}"
tar --extract \
  --gzip \
  --file "${ARCHIVE_PATH}" \
  --directory "${TEMP_RELEASE_DIR}" \
  --no-same-owner \
  --no-same-permissions

for release_file in \
  "${TEMP_RELEASE_DIR}/api/index.mjs" \
  "${TEMP_RELEASE_DIR}/_data/countries.json" \
  "${TEMP_RELEASE_DIR}/admin/index.html" \
  "${TEMP_RELEASE_DIR}/site/index.html"; do
  if [[ ! -f "${release_file}" ]]; then
    echo "Incomplete release: missing ${release_file}" >&2
    exit 1
  fi
done

find "${TEMP_RELEASE_DIR}" -type d -exec chmod 0755 {} +
find "${TEMP_RELEASE_DIR}" -type f -exec chmod 0644 {} +
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${TEMP_RELEASE_DIR}"
mv "${TEMP_RELEASE_DIR}" "${RELEASE_DIR}"

previous_target="${current_target}"
activated=false

activate_release() {
  local target="$1"
  local temporary_link="${DEPLOY_ROOT}/.current-${RELEASE_ID}-$$"
  ln -s "${target}" "${temporary_link}"
  mv -Tf "${temporary_link}" "${CURRENT_LINK}"
}

restore_previous_release() {
  if [[ "${activated}" != true ]]; then
    return
  fi

  echo "Deployment failed; restoring the previous release." >&2
  if [[ -n "${previous_target}" && -d "${previous_target}" ]]; then
    activate_release "${previous_target}"
    if [[ -f "${previous_target}/api/index.mjs" ]]; then
      systemctl restart "${SERVICE_NAME}" || true
    else
      systemctl stop "${SERVICE_NAME}" || true
    fi
    systemctl reload nginx || true
  else
    rm -f "${CURRENT_LINK}"
    systemctl stop "${SERVICE_NAME}" || true
  fi
}

on_error() {
  local exit_code=$?
  trap - ERR
  restore_previous_release
  rm -rf "${TEMP_RELEASE_DIR}"
  exit "${exit_code}"
}
trap on_error ERR

activate_release "${RELEASE_DIR}"
activated=true

nginx -t
systemctl reload nginx
systemctl restart "${SERVICE_NAME}"

curl --fail --silent --show-error \
  --retry 15 --retry-connrefused --retry-delay 2 \
  http://127.0.0.1:8080/api/healthz >/dev/null
curl --fail --silent --show-error \
  --retry 8 --retry-connrefused --retry-delay 2 \
  https://api-bizici.run.place/api/healthz >/dev/null
curl --fail --silent --show-error \
  --retry 8 --retry-connrefused --retry-delay 2 \
  https://admin-bizici.run.place/ >/dev/null
curl --fail --silent --show-error \
  --retry 8 --retry-connrefused --retry-delay 2 \
  https://site-bizici.run.place/ >/dev/null

mapfile -t old_releases < <(
  find "${RELEASES_DIR}" \
    -mindepth 1 \
    -maxdepth 1 \
    -type d \
    ! -name bootstrap \
    ! -name ".*" \
    -printf '%T@ %p\n' \
    | sort -nr \
    | awk -v keep="${KEEP_RELEASES}" 'NR > keep { $1=""; sub(/^ /, ""); print }'
)
for old_release in "${old_releases[@]}"; do
  if [[ -n "${old_release}" && "${old_release}" != "${previous_target}" ]]; then
    rm -rf "${old_release}"
  fi
done

trap - ERR

echo "Release ${RELEASE_ID} deployed successfully."
echo "Active release: $(readlink -f "${CURRENT_LINK}")"