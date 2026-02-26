#!/bin/bash

# Eleventy Deployment Script for OpenShift
# This script helps deploy the Eleventy static site with environment variable substitution

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

MANIFEST_PATH="openshift/manifests/eleventy.yaml"

echo "🚀 Deploying Eleventy site to OpenShift..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your values:"
    echo "  cp .env.example .env"
    echo "  vim .env"
    exit 1
fi

# Check if required variables are set
required_vars=(
    "DIRECTUS_API_URL"
)

echo "✓ Checking required environment variables..."
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env; then
        echo "❌ Missing variable: $var in .env"
        echo "   This is required for Eleventy to fetch data from Directus during build."
        exit 1
    fi
done

echo "✓ All required variables found"

# Load all environment variables from .env file
set -o allexport
. .env
set +o allexport

# Export specific variables for envsubst
export DIRECTUS_API_URL
export DIRECTUS_API_TOKEN="${DIRECTUS_API_TOKEN:-}"

# Scale down deployment if it exists (to prevent image pull errors during build)
if oc get deployment eleventy &>/dev/null; then
    echo "⏸️  Scaling down deployment to prevent image pull errors..."
    oc scale deployment eleventy --replicas=0 --timeout=30s 2>/dev/null || true
fi

# Apply the YAML with variable substitution
echo "📋 Applying Eleventy configuration..."
envsubst < "$MANIFEST_PATH" | oc apply -f -

echo ""
echo "✅ Eleventy configuration applied!"
echo ""

# Check if BuildConfig exists and start a build
if oc get buildconfig eleventy &>/dev/null; then
    echo "🔨 Starting build from local source..."
    echo "   This will package the current directory and build the Docker image."
    echo ""
    
    # Start binary build - this will stream the current directory to OpenShift
    oc start-build eleventy --from-dir=. --follow
    
    echo ""
    echo "✅ Build completed!"
    
    # Wait for ImageStreamTag to be available
    echo "⏳ Waiting for image to be available in ImageStream..."
    for i in {1..30}; do
        if oc get imagestreamtag eleventy:latest &>/dev/null; then
            echo "✓ Image is available!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "⚠️  Warning: ImageStreamTag not found after 30 seconds. The build may have failed."
            echo "   Check build status: oc get builds -l buildconfig=eleventy"
            exit 1
        fi
        sleep 1
    done
    
    # Scale deployment back up
    echo "▶️  Scaling deployment back up..."
    oc scale deployment eleventy --replicas=1 --timeout=30s 2>/dev/null || true
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
    ROUTE=$(oc get route eleventy -o jsonpath='{.spec.host}' 2>/dev/null || echo "pending...")
    echo "  URL: https://$ROUTE"
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
echo "  oc start-build eleventy --from-dir=. --follow"
echo ""
echo "  # Check build status:"
echo "  oc get builds"
echo ""
echo "  # Delete everything:"
echo "  oc delete all,configmap,secret,buildconfig,imagestream -l app=eleventy"
echo ""
