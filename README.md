# Hawaii 2026 - Full-Stack Web Application
npx http-server "_site" -p 8081 -c-1
HOSTING SERVER ON LOCAL COMPUTER
http://127.0.0.1:8081




A complete web platform combining a static site (11ty), a headless CMS (Directus), and a database (PostgreSQL), all deployed to Red Hat OpenShift.

## ✅ Deployment Status

**PostgreSQL:** ✅ Running and tested  
**Directus CMS:** ✅ Running and accessible  
**Admin Panel:** ✅ Available at `https://directus-brookenf.apps.cloudapps.unc.edu/admin`

Both services are fully operational and ready for production use.

## 📚 Start Here: [docs/README.md](docs/README.md)

All documentation has been organized in the `docs/` folder for easy navigation:

- **[Quick Start](docs/QUICKSTART.md)** - Get everything running (5 minutes)
- **[Detailed Setup](docs/SETUP.md)** - Step-by-step walkthrough with explanations
- **[Architecture](docs/ARCHITECTURE.md)** - How the system works
- **[API Integration](docs/API_INTEGRATION.md)** - Connect your frontend to Directus
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Problem-solving guide

## What You Need

- OpenShift CLI (`oc`) installed
- `envsubst` installed (for macOS: `brew install gettext`)
- Logged into your OpenShift cluster
- A basic understanding of how REST APIs work

## Key Concepts (If You're New)

**Environment Variables (.env)**
- Stores your database passwords and API keys
- Never commit to GitHub (it's in `.gitignore`)
- One file for everything: `/.env`

**OpenShift Namespaces**
- Your cluster admin creates a namespace (project) for you
- PostgreSQL DNS names depend on your namespace
- Example: if your namespace is `brookenf`, use `postgres.brookenf.svc.cluster.local`
- Our deploy scripts automatically detect your namespace

**Resource Quotas**
- Your namespace has limits on CPU and memory
- Default deployments use conservative resources: 256Mi request / 512Mi limit
- If you hit quota limits, you may need to reduce requests
- See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md#resource-quota-issues) for help

**Kubernetes / OpenShift**
- A system for running applications in the cloud
- We give it YAML files describing what we want to run
- It handles scaling, networking, and security

**11ty**
- A static site generator (like Next.js but for static sites)
- Builds your HTML at deploy time, not at request time
- Can fetch data from Directus during the build

**Directus**
- A headless CMS (content is separated from how it's displayed)
- You manage content through a web admin panel
- Exposes an API that your frontend can call

**PostgreSQL**
- A database that stores your content
- Only accessible from within the OpenShift cluster
- Uses the credentials in your `.env` file

## Common Tasks

```bash
# View logs from Directus
oc logs -l app=directus -f

# View logs from Postgres
oc logs postgres-0 -f

# See what's running
oc get pods

# Get the URL to access Directus
oc get route directus

# Update deployment after changing .env
bash openshift/scripts/deploy_directus.sh
bash openshift/scripts/deploy_postgres.sh

# Delete everything and start over
oc delete all -l app=directus
oc delete all -l app=postgres
```

## File Structure

```
hawaii-2026/
├── docs/                  ← All documentation
│   ├── README.md          ← Overview and key concepts
│   ├── QUICKSTART.md      ← Start with this (5 min)
│   ├── SETUP.md           ← Detailed walkthrough
│   ├── ARCHITECTURE.md    ← How it works
│   ├── API_INTEGRATION.md ← Connect your frontend
│   └── TROUBLESHOOTING.md ← Problem-solving
├── .env.example           ← Copy to .env and fill in
├── .env                   ← Your secrets (never commit!)
│
├── src/                   ← Your 11ty frontend
└── openshift/             ← Dockerfiles, manifests, and automation for OpenShift
    ├── README.md
    ├── docker/
    │   ├── eleventy/      ← 11ty build image (Dockerfile with embedded nginx config)
    │   └── directus/      ← Optional Directus image customization
    ├── manifests/
    │   ├── postgres.yaml  ← Database definition
    │   └── directus.yaml  ← CMS definition
    └── scripts/
        ├── deploy_postgres.sh ← Run to deploy database
        ├── deploy_directus.sh ← Run to deploy CMS
        └── setup_directus.sh  ← Run first for setup
```

## Getting Help

1. **Something broke?** → [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. **Don't understand the setup?** → [docs/QUICKSTART.md](docs/QUICKSTART.md)
3. **Need to connect your frontend?** → [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md)
4. **Want to understand the architecture?** → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Security Notes

✅ **Good practices we use:**
- Credentials stored in `.env`, not in code
- Passwords encrypted in OpenShift
- HTTPS enforced on all routes
- Non-root user in containers

⚠️ **Things you need to do:**
- Rotate your ADMIN_PASSWORD after first login
- Use strong passwords (use `openssl rand -base64 32` to generate them)
- Never share your `.env` file
- Keep OpenShift credentials secure

## Next Steps

1. Read [docs/QUICKSTART.md](docs/QUICKSTART.md) to get everything running
2. Find your Directus URL and log in
3. Create a content collection
4. Read [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md) to display it on your site
5. Deploy your updated 11ty build

---

**Happy coding!** 🚀
