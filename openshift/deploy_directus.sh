#!/bin/bash

# Directus Deployment Script for OpenShift
# This script helps deploy Directus CMS with environment variable substitution

set -e

echo "🚀 Deploying Directus CMS to OpenShift..."

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
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "DIRECTUS_KEY"
    "DIRECTUS_SECRET"
    "DB_DATABASE"
    "DB_USER"
    "DB_PASSWORD"
    "ADMIN_EMAIL"
    "ADMIN_PASSWORD"
)

echo "✓ Checking required environment variables..."
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env; then
        echo "❌ Missing variable: $var in .env"
        exit 1
    fi
done

echo "✓ All required variables found"

# Validate that Postgres and Directus DB credentials match
echo "✓ Validating Postgres ↔ Directus credential synchronization..."
POSTGRES_DB=$(grep "^POSTGRES_DB=" .env | cut -d'=' -f2)
POSTGRES_USER=$(grep "^POSTGRES_USER=" .env | cut -d'=' -f2)
POSTGRES_PASSWORD=$(grep "^POSTGRES_PASSWORD=" .env | cut -d'=' -f2)
DB_DATABASE=$(grep "^DB_DATABASE=" .env | cut -d'=' -f2)
DB_USER=$(grep "^DB_USER=" .env | cut -d'=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)

if [ "$POSTGRES_DB" != "$DB_DATABASE" ]; then
    echo "❌ ERROR: POSTGRES_DB ('$POSTGRES_DB') does not match DB_DATABASE ('$DB_DATABASE')"
    echo "   These MUST be the same. Edit .env and sync these values."
    exit 1
fi

if [ "$POSTGRES_USER" != "$DB_USER" ]; then
    echo "❌ ERROR: POSTGRES_USER ('$POSTGRES_USER') does not match DB_USER ('$DB_USER')"
    echo "   These MUST be the same. Edit .env and sync these values."
    exit 1
fi

if [ "$POSTGRES_PASSWORD" != "$DB_PASSWORD" ]; then
    echo "❌ ERROR: POSTGRES_PASSWORD does not match DB_PASSWORD"
    echo "   These MUST be the same. Edit .env and sync these values."
    exit 1
fi

echo "✓ Postgres and Directus database credentials are synchronized ✓"

# Load all environment variables from .env file
set -o allexport
. .env
set +o allexport

# Export specific variables for envsubst
export DIRECTUS_KEY
export DIRECTUS_SECRET
export DB_HOST
export DB_DATABASE
export DB_USER
export DB_PASSWORD
export ADMIN_EMAIL
export ADMIN_PASSWORD

# Apply the YAML with variable substitution
echo "📋 Applying Directus configuration..."
envsubst < openshift/directus.yaml | oc apply -f -

echo ""
echo "✅ Directus deployment submitted!"
echo ""
echo "📊 Checking deployment status..."
echo ""

# Wait for deployment to be ready (with timeout)
if timeout 120 oc wait --for=condition=available --timeout=120s deployment/directus 2>/dev/null; then
    echo "✅ Directus is running!"
    echo ""
    echo "🌐 Accessing Directus:"
    echo ""
    ROUTE=$(oc get route directus -o jsonpath='{.spec.host}' 2>/dev/null || echo "pending...")
    echo "  URL: https://$ROUTE/admin"
    echo "  Email: $ADMIN_EMAIL"
    echo "  Password: [use the password from .env]"
    echo ""
else
    echo "⏳ Deployment is starting. Check status with:"
    echo "  oc get pods -l app=directus"
    echo "  oc logs -l app=directus -f"
fi

echo "📝 Logs:"
echo "  oc logs -l app=directus -f"
echo ""
echo "Delete with:"
echo "  oc delete deployment,service,route,secret,configmap -l app=directus"
