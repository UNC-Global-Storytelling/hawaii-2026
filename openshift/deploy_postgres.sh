#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Default timeout values
ROLLOUT_TIMEOUT=${ROLLOUT_TIMEOUT:-300s}
POD_READY_TIMEOUT=${POD_READY_TIMEOUT:-300s}

# Choose oc (OpenShift) if available, otherwise kubectl
KCMD=""
if command -v oc >/dev/null 2>&1; then
  KCMD=oc
else
  KCMD=kubectl
fi

echo "Using kubernetes client: $KCMD"

ENV_FILE="openshift/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy openshift/.env.example to openshift/.env and fill values." >&2
  exit 1
fi

# load env file safely (export all keys)
set -o allexport
# shellcheck disable=SC1090
. "$ENV_FILE"
set +o allexport

# determine namespace/project
NAMESPACE=""
if [ "$KCMD" = "oc" ]; then
  NAMESPACE=$($KCMD project -q 2>/dev/null || true)
else
  NAMESPACE=$($KCMD config view --minify --output 'jsonpath={..namespace}' 2>/dev/null || true)
fi
NAMESPACE=${NAMESPACE:-default}

echo "Target namespace/project: $NAMESPACE"

echo "Applying openshift/postgres.yaml with env substitution..."
envsubst < openshift/postgres.yaml | $KCMD apply -f -

echo "Waiting for StatefulSet 'postgres' rollout... (timeout: $ROLLOUT_TIMEOUT)"
$KCMD rollout status statefulset/postgres -n "$NAMESPACE" --timeout="$ROLLOUT_TIMEOUT"

echo "Waiting for Postgres pod(s) to be Ready... (timeout: $POD_READY_TIMEOUT)"
$KCMD wait --for=condition=Ready pod -l app=postgres -n "$NAMESPACE" --timeout="$POD_READY_TIMEOUT"

echo "Listing PVCs for Postgres (label app=postgres)"
$KCMD get pvc -l app=postgres -n "$NAMESPACE" || true

POD_NAME=$($KCMD get pods -l app=postgres -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' || true)
if [ -n "$POD_NAME" ]; then
  echo "Streaming last 200 lines of logs from $POD_NAME (press Ctrl-C to stop)"
  $KCMD logs -n "$NAMESPACE" --tail=200 "$POD_NAME" || true
else
  echo "No postgres pod found to show logs." >&2
fi

cat <<EOF
Postgres apply complete.
- Namespace: $NAMESPACE
- To re-run with custom timeouts, set ROLLOUT_TIMEOUT and POD_READY_TIMEOUT env vars.

To test DB connectivity from cluster:
  $KCMD run -i --rm pg-client --image=bitnami/postgresql --restart=Never --namespace $NAMESPACE -- bash -lc \
    "PGPASSWORD=\$POSTGRES_PASSWORD psql -h postgres-0.postgres.$NAMESPACE.svc.cluster.local -U $POSTGRES_USER -d $POSTGRES_DB -c '\\l'"

Replace service host if your DNS differs.
EOF
