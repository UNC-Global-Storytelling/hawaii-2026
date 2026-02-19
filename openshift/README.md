# OpenShift Deployment Files

This folder contains everything required to run the Directus + PostgreSQL stack on OpenShift, including Dockerfiles, Kubernetes manifests, and helper scripts.

## What's Here

- `docker/`
	- `eleventy/` → Dockerfile (with embedded NGINX config) for the 11ty build image
	- `directus/` → Dockerfile + package.json for custom Directus image work
- `manifests/`
	- `postgres.yaml` → PostgreSQL StatefulSet, Service, and Secret
	- `directus.yaml` → Directus Deployment, Service, Route, ConfigMap, Secret
	- `eleventy.yaml` → Eleventy BuildConfig, Deployment, Service, Route, ConfigMap, Secret
- `scripts/`
	- `setup_directus.sh` → Pre-flight checks and .env scaffolding
	- `deploy_postgres.sh` → Applies Postgres manifest with envsubst
	- `deploy_directus.sh` → Applies Directus manifest with envsubst
	- `deploy_eleventy.sh` → Applies Eleventy manifest and triggers build

## Quick Deploy

From the project root:

```bash
bash openshift/scripts/setup_directus.sh       # Initial setup
bash openshift/scripts/deploy_postgres.sh      # Deploy database
bash openshift/scripts/deploy_directus.sh      # Deploy CMS
bash openshift/scripts/deploy_eleventy.sh      # Deploy static site
```

## More Info

All documentation is in the docs folder:

- **[../docs/README.md](../docs/README.md)** - Project overview
- **[../docs/QUICKSTART.md](../docs/QUICKSTART.md)** - Get running in 5 minutes
- **[../docs/SETUP.md](../docs/SETUP.md)** - Detailed setup walkthrough
- **[../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - How the system works
- **[../docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)** - Problem-solving

## Important Notes

### Namespace-Specific DNS

Your PostgreSQL hostname depends on your OpenShift namespace. Run:

```bash
oc project
```

If your namespace is `brookenf`, PostgreSQL is at:
```
postgres.brookenf.svc.cluster.local
```

NOT `postgres.default.svc.cluster.local`

The deploy scripts automatically detect and use your current namespace.

### Memory Resources

The default memory requests (`256Mi` request / `512Mi` limit) are conservative. If you have more quota available in your namespace, you can increase them in the YAML files for better performance. Check [TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for more details.
- **[API_INTEGRATION.md](../API_INTEGRATION.md)** - Connect your frontend
- **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** - Fix problems

## Understanding the YAML Files

### manifests/postgres.yaml

Creates:
- StatefulSet (database container)
- Service (internal networking)
- Secret (encrypted credentials)
- PersistentVolumeClaim (data storage)

### manifests/directus.yaml

Creates:
- Deployment (application container)
- emptyDir volume (writable `/. pm2` directory for PM2 process manager)
- Service (internal networking on port 8055)
- Route (public HTTPS access with edge termination)
- ConfigMap (non-sensitive configuration)
- Secret (encrypted credentials)
- Readiness probe (TCP socket check with 30s startup grace period)

Key features:
- **emptyDir volume at `/.pm2`**: Allows non-root user to write PM2 config files without permission issues
- **TCP readiness probe**: More reliable than HTTP health checks for startup detection
- **30s initialDelaySeconds**: Gives Directus time to initialize database and run migrations
- **Edge TLS termination**: HTTPS encryption is handled by OpenShift router (pod runs on HTTP internally)

Both manifests use `envsubst` to inject variables from your `.env` file.

### manifests/eleventy.yaml

Creates:
- BuildConfig (Docker build from local source using `openshift/docker/eleventy/Dockerfile`)
- ImageStream (stores the built container image)
- Deployment (nginx container serving the static site)
- Service (internal networking on port 8080)
- Route (public HTTPS access with edge termination)
- ConfigMap (non-sensitive configuration like `DIRECTUS_API_URL`)
- Secret (optional `DIRECTUS_API_TOKEN` for authenticated API access)

Key features:
- **Binary build source**: Builds from local directory, triggered by `oc start-build`
- **Multi-stage Docker build**: Builds Eleventy site with Node.js, serves with nginx
- **Build-time environment variables**: `DIRECTUS_API_URL` and `DIRECTUS_API_TOKEN` are available during the Eleventy build process
- **Low resource requirements**: Static site serving requires minimal resources (64Mi request / 128Mi limit)
- **Edge TLS termination**: HTTPS encryption is handled by OpenShift router

The manifest uses `envsubst` to inject variables from your `.env` file.

## Common Commands

```bash
# Check status
oc get pods
oc get routes

# View logs  
oc logs -l app=directus -f
oc logs postgres-0 -f
oc logs -l app=eleventy -f

# Redeploy everything
bash openshift/scripts/deploy_postgres.sh
bash openshift/scripts/deploy_directus.sh
bash openshift/scripts/deploy_eleventy.sh

# Rebuild Eleventy after code changes
oc start-build eleventy --from-dir=. --follow

# Delete everything
oc delete all -l app=directus
oc delete all -l app=postgres
oc delete all,configmap,secret,buildconfig,imagestream -l app=eleventy
```

For detailed help, see [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
