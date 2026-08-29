#!/usr/bin/env bash
set -euo pipefail

export GOOGLE_CLOUD_PROJECT="demo-amparai"
export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
export AMPARAI_TEST_MODE="1"
export EXPO_PUBLIC_BACKEND_URL="http://127.0.0.1:8000"

cd backend
python -m uvicorn server:app --host 127.0.0.1 --port 8000 > /tmp/amparai-api.log 2>&1 &
api_pid=$!

cleanup() {
  status=$?
  if [[ $status -ne 0 ]]; then
    echo "Backend log after failure:"
    sed -n '1,240p' /tmp/amparai-api.log
  fi
  kill "$api_pid" 2>/dev/null || true
  wait "$api_pid" 2>/dev/null || true
  exit "$status"
}
trap cleanup EXIT

for _ in {1..40}; do
  if curl --fail --silent http://127.0.0.1:8000/api/health > /dev/null; then
    break
  fi
  sleep 0.5
done

curl --fail --silent http://127.0.0.1:8000/api/health > /dev/null
python -m pytest tests -q
