# Hawaii 2026 - Full-Stack Web Application

A complete web platform combining a static site (11ty), a headless CMS (Directus), and a database (PostgreSQL), all deployed to Red Hat OpenShift.

## What You're Building

This project has three parts that work together:

- **Frontend** (11ty): A fast, static website
- **CMS** (Directus): A place to manage your content
- **Database** (PostgreSQL): Where your content is stored

Your frontend fetches content from the CMS, which reads from the database. Changes in Directus automatically appear on your site.

```
Your Website ← Directus CMS ← PostgreSQL Database
```

## Quick Start (5 Minutes)

```bash
# 1. Set up your configuration
bash openshift/setup_directus.sh

# 2. Edit your environment variables
vim .env

# 3. Deploy everything
bash openshift/deploy_postgres.sh
bash openshift/deploy_directus.sh

# 4. You're done! Access Directus at the URL shown in the terminal
```

## Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get everything running (just follow along)
- **[SETUP.md](SETUP.md)** - Detailed setup with validation steps
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - How it all works under the hood
- **[API_INTEGRATION.md](API_INTEGRATION.md)** - Connect your 11ty frontend to Directus
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Something broke? Check here first

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
bash openshift/deploy_directus.sh
bash openshift/deploy_postgres.sh

# Delete everything and start over
oc delete all -l app=directus
oc delete all -l app=postgres
```

## File Structure

```
hawaii-2026/
├── docs/                  ← Start here
│   ├── README.md
│   ├── QUICKSTART.md
│   ├── SETUP.md
│   ├── ARCHITECTURE.md
│   ├── API_INTEGRATION.md
│   └── TROUBLESHOOTING.md
├── .env.example           ← Copy to .env and fill in
├── .env                   ← Your secrets (never commit!)
├── src/                   ← Your 11ty frontend
├── directus/              ← Directus configuration
└── openshift/             ← Kubernetes manifests & scripts
    ├── README.md
    ├── postgres.yaml
    ├── directus.yaml
    ├── deploy_postgres.sh
    ├── deploy_directus.sh
    └── setup_directus.sh
```

## Getting Help

1. **Something broke?** → [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. **Don't understand the setup?** → [QUICKSTART.md](docs/QUICKSTART.md)
3. **Need to connect your frontend?** → [API_INTEGRATION.md](docs/API_INTEGRATION.md)
4. **Want to understand the architecture?** → [ARCHITECTURE.md](docs/ARCHITECTURE.md)

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
