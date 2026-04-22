#!/bin/bash

# Eleventy Deployment Script for OpenShift
# This script deploys static _site output using OpenShift nginx S2I

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

MANIFEST_PATH="openshift/manifests/eleventy.yaml"
SITE_DIR="_site"
S2I_CFG_DIR="openshift/nginx-s2i"
IMAGE_REGISTRY="${IMAGE_REGISTRY:-image-registry.openshift-image-registry.svc:5000}"
OPENSHIFT_NAMESPACE="$(oc project -q)"

echo "🚀 Deploying Eleventy site to OpenShift..."

if [ ! -d "$SITE_DIR" ]; then
    echo "❌ Error: $SITE_DIR directory not found."
    echo "Build the site first so OpenShift can serve static assets."
    exit 1
fi

if [ ! -d "$S2I_CFG_DIR/nginx-cfg" ]; then
    echo "❌ Error: Missing nginx S2I config at $S2I_CFG_DIR/nginx-cfg"
    exit 1
fi

# Apply the YAML
echo "📋 Applying Eleventy configuration..."

# Force-recreate BuildConfig to avoid stale Git/Docker strategy in-cluster.
if oc get buildconfig eleventy &>/dev/null; then
    echo "♻️  Recreating BuildConfig/Builds to ensure nginx S2I binary strategy..."
    oc delete buildconfig eleventy --ignore-not-found
    oc delete build -l buildconfig=eleventy --ignore-not-found
fi

export IMAGE_REGISTRY
export OPENSHIFT_NAMESPACE
envsubst < "$MANIFEST_PATH" | oc apply -f -

echo ""
echo "✅ Eleventy configuration applied!"
echo ""

# Check if BuildConfig exists and start a build
if oc get buildconfig eleventy &>/dev/null; then
    echo "🔨 Starting nginx S2I build from local static _site directory..."
    echo "   This uploads only static output and nginx config."
    echo ""

    BUILD_CONTEXT="$(mktemp -d)"
    trap 'rm -rf "$BUILD_CONTEXT"' EXIT
    cp -R "$SITE_DIR"/. "$BUILD_CONTEXT"/
    cp -R "$S2I_CFG_DIR"/nginx-cfg "$BUILD_CONTEXT"/nginx-cfg

    echo "🧾 Verifying nginx config sent to build:"
    shasum -a 256 "$BUILD_CONTEXT/nginx-cfg/default.conf" | awk '{print "  SHA256:", $1}'
    sed -n '1,40p' "$BUILD_CONTEXT/nginx-cfg/default.conf"
    echo ""

    # Start binary build with static site + nginx-cfg
    oc start-build eleventy --from-dir="$BUILD_CONTEXT" --follow
    
    echo ""
    echo "✅ Build completed!"

    echo "🔄 Restarting deployment to pick up latest image..."
    oc rollout restart deployment/eleventy
else
    echo "⚠️  BuildConfig not found. Make sure the manifest was applied correctly."
fi

echo ""
echo "📊 Checking deployment status..."
echo ""

# Wait for deployment to be ready (with timeout)
if timeout 120 oc wait --for=condition=available --timeout=120s deployment/eleventy 2>/dev/null; then
    echo "✅ Eleventy is running!"
    echo ""
    echo "🌐 Accessing Eleventy site:"
    echo ""
    PRIMARY_ROUTE=$(oc get route eleventy -o jsonpath='{.spec.host}' 2>/dev/null || echo "pending...")
    ALT_ROUTE=$(oc get route hawaii2026 -o jsonpath='{.spec.host}' 2>/dev/null || echo "pending...")
    echo "  Primary URL: https://$PRIMARY_ROUTE"
    echo "  Alt URL:     https://$ALT_ROUTE"
    echo ""
else
    echo "⏳ Deployment is starting. Check status with:"
    echo "  oc get pods -l app=eleventy"
    echo "  oc logs -l app=eleventy -f"
fi

echo "📝 Useful commands:"
echo "  # View logs:"
echo "  oc logs -l app=eleventy -f"
echo ""
echo "  # Rebuild after code changes:"
echo "  bash openshift/scripts/deploy_eleventy.sh"
echo ""
echo "  # Check build status:"
echo "  oc get builds"
echo ""
echo "  # Delete everything:"
echo "  oc delete all,configmap,secret,buildconfig,imagestream -l app=eleventy"
echo ""
