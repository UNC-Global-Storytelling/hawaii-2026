#!/bin/bash

# Setup script for Directus + Postgres project
# Prepares environment files and checks prerequisites

set -e

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

echo "📦 Setting up Directus CMS + PostgreSQL environment..."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists (skipping creation)"
else
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✓ Created .env - please edit with your values"
fi

# Check for OpenShift CLI
if ! command -v oc &> /dev/null; then
    echo "⚠️  Warning: 'oc' (OpenShift CLI) not found in PATH"
    echo "   Install it from: https://mirror.openshift.com/pub/openshift-v4/clients/ocp/"
    echo ""
fi

# Check for envsubst
if ! command -v envsubst &> /dev/null; then
    echo "⚠️  Warning: 'envsubst' not found in PATH"
    echo "   On macOS: brew install gettext"
    echo "   On Linux: apt-get install gettext"
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env with your configuration"
echo "   2. **IMPORTANT**: Sync POSTGRES_* and DB_* variables - they must match!"
echo "   3. Deploy PostgreSQL first: bash openshift/scripts/deploy_postgres.sh"
echo "   4. Deploy Directus with: bash openshift/scripts/deploy_directus.sh"
echo ""
echo "📚 For detailed instructions, see:"
echo "   - docs/QUICKSTART.md (5-minute quick start)"
echo "   - docs/SETUP.md (detailed walkthrough)"
echo "   - .env.example (all configuration variables)"
echo "   - docs/ARCHITECTURE.md (system overview)"
