#!/usr/bin/env bash
set -Eeuo pipefail

readonly DEPLOY_ROOT="/opt/bizici"
readonly RELEASES_DIR="${DEPLOY_ROOT}/releases"
readonly CURRENT_LINK="${DEPLOY_ROOT}/current"
readonly SERVICE_NAME="bizici-api.service"

if [[ "${EUID}" -ne 0 ]]; then
  echo "This script must be run as root." >&2
  exit 1
fi

if [[ "$#" -ne 1 ]]; then
  echo "Usage: $0 <release-id>" >&2
  echo "Available releases:" >&2
  find "${RELEASES_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '  %f\n' \
    | sort >&2
  exit 1
fi

readonly RELEASE_ID="$1"
readonly TARGET_RELEASE="${RELEASES_DIR}/${RELEASE_ID}"

if [[ ! "${RELEASE_ID}" =~ ^(bootstrap|[a-fA-F0-9]{7,64})$ ]]; then
  echo "Invalid release id: ${RELEASE_ID}" >&2
  exit 1
fi
if [[ ! -d "${TARGET_RELEASE}" ]]; then
  echo "Release not found: ${TARGET_RELEASE}" >&2
  exit 1
fi
if [[ "${RELEASE_ID}" != "bootstrap" && ! -f "${TARGET_RELEASE}/api/index.mjs" ]]; then
  echo "Release is missing api/index.mjs: ${TARGET_RELEASE}" >&2
  exit 1
fi

previous_target="$(readlink -f "${CURRENT_LINK}" 2>/dev/null || true)"
temporary_link="${DEPLOY_ROOT}/.rollback-${RELEASE_ID}-$$"
ln -s "${TARGET_RELEASE}" "${temporary_link}"
mv -Tf "${temporary_link}" "${CURRENT_LINK}"

rollback_failed() {
  local exit_code=$?
  trap - ERR
  if [[ -n "${previous_target}" && -d "${previous_target}" ]]; then
    fallback_link="${DEPLOY_ROOT}/.rollback-fallback-$$"
    ln -s "${previous_target}" "${fallback_link}"
    mv -Tf "${fallback_link}" "${CURRENT_LINK}"
    if [[ -f "${previous_target}/api/index.mjs" ]]; then
      systemctl restart "${SERVICE_NAME}" || true
    fi
    systemctl reload nginx || true
  fi
  exit "${exit_code}"
}
trap rollback_failed ERR

nginx -t
systemctl reload nginx
if [[ "${RELEASE_ID}" == "bootstrap" ]]; then
  systemctl stop "${SERVICE_NAME}"
else
  systemctl restart "${SERVICE_NAME}"
  curl --fail --silent --show-error \
    --retry 15 --retry-connrefused --retry-delay 2 \
    http://127.0.0.1:8080/api/healthz >/dev/null
fi

trap - ERR
echo "Rolled back to ${RELEASE_ID}."