# OpenShift Deployment Files

This folder contains the Kubernetes manifests and deployment scripts for your Directus CMS and PostgreSQL database.

## What's Here

- `postgres.yaml` - Defines the PostgreSQL database
- `directus.yaml` - Defines the Directus CMS container
- `deploy_postgres.sh` - Script to deploy the database
- `deploy_directus.sh` - Script to deploy Directus
- `setup_directus.sh` - Initial setup helper script

## Quick Deploy

From the project root:

```bash
bash openshift/setup_directus.sh       # Initial setup
bash openshift/deploy_postgres.sh      # Deploy database
bash openshift/deploy_directus.sh      # Deploy CMS
```

## More Info

All documentation is in the root directory:

- **[README.md](../README.md)** - Project overview
- **[QUICKSTART.md](../QUICKSTART.md)** - Get running in 5 minutes
- **[SETUP.md](../SETUP.md)** - Detailed setup walkthrough
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** - How the system works
- **[API_INTEGRATION.md](../API_INTEGRATION.md)** - Connect your frontend
- **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** - Fix problems

## Understanding the YAML Files

### postgres.yaml

Creates:
- StatefulSet (database container)
- Service (internal networking)
- Secret (encrypted credentials)
- PersistentVolumeClaim (data storage)

### directus.yaml

Creates:
- Deployment (application container)
- Service (internal networking)
- Route (public HTTPS access)
- ConfigMap (non-sensitive config)
- Secret (encrypted credentials)

Both files use `envsubst` to inject variables from your `.env` file.

## Common Commands

```bash
# Check status
oc get pods
oc get routes

# View logs  
oc logs -l app=directus -f
oc logs postgres-0 -f

# Redeploy everything
bash deploy_postgres.sh
bash deploy_directus.sh

# Delete everything
oc delete all -l app=directus
oc delete all -l app=postgres
```

For detailed help, see [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
