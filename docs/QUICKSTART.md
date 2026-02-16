# Quick Start Guide - Get Everything Running in 5 Minutes

Just follow these steps in order. Don't skip anything!

## Step 1: Initial Setup (1 minute)

Open your terminal and run:

```bash
bash openshift/setup_directus.sh
```

This will:
- Create a `.env` file if you don't have one
- Check that you have the required tools (`oc`, `envsubst`)
- Tell you what to do next

## Step 2: Configure Your Environment (2 minutes)

Open the `.env` file:

```bash
vim .env
```

Fill in the values. To generate secure random passwords, run this in another terminal:

```bash
openssl rand -base64 32
```

Your `.env` should look like this:

```bash
# Database (these define what gets created)
POSTGRES_DB=directus
POSTGRES_USER=directus
POSTGRES_PASSWORD=<paste output from openssl command>

# Directus (these make it work)
DIRECTUS_KEY=<paste output from openssl command>
DIRECTUS_SECRET=<paste output from openssl command>

# Database access (must match POSTGRES_* values above!)
DB_DATABASE=directus
DB_USER=directus
DB_PASSWORD=<same as POSTGRES_PASSWORD>

# Admin account
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=<paste output from openssl command>
```

**Important:** The database credentials must match - if you change `POSTGRES_DB`, you must also change `DB_DATABASE` to the same value.

## Step 3: Deploy Database (2 minutes)

```bash
bash openshift/deploy_postgres.sh
```

This will:
- Create a PostgreSQL database on OpenShift
- Set up storage for your data
- Create a service so other apps can talk to it
- Wait for it to start (usually takes 1-2 minutes)

When you see `Postgres apply complete`, the database is ready.

## Step 4: Deploy Directus CMS (2 minutes)

```bash
bash openshift/deploy_directus.sh
```

This will:
- Check that your `.env` file has everything
- Validate that your database credentials match
- Deploy Directus to OpenShift
- Set up a secure HTTPS route
- Wait for it to start

When you see `✅ Directus is running!`, you're ready to go.

## Step 5: Access Directus

At the end of the script output, you'll see something like:

```
🌐 Accessing Directus:
  URL: https://directus-your-project.apps.openshift.example.com/admin
  Email: your-email@example.com
  Password: [use the password from .env]
```

Open that URL in your browser and log in!

## Verify Everything Works

```bash
# Check that all pods are running
oc get pods

# You should see:
#- postgres-0 (1/1 Running)
# - directus-xxx (1/1 Running)
```

If you see something different, check [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Next Steps

Now that everything is running:

1. **Create a content collection** in Directus
   - Log in to admin panel
   - Go to Collections
   - Create a new collection (e.g., "Articles")
   - Add some fields and sample data

2. **Connect your 11ty frontend** to Directus
   - Read [API_INTEGRATION.md](API_INTEGRATION.md)
   - Create a data source in your 11ty config
   - Build your site

3. **Deploy your updated site** to OpenShift
   - (Use your existing deployment process for the 11ty frontend)

## Common Next Commands

```bash
# See what's running
oc get pods

# View logs from any pod
oc logs <pod-name> -f

# Get the Directus URL again
oc get route directus

# Stop and restart everything
oc delete all -l app=directus
oc delete all -l app=postgres
# Then run the deploy scripts again
```

## Troubleshooting Quick Fixes

**"Pod stuck in Pending"**
```bash
oc describe pod <pod-name>
# Shows what's wrong
```

**"Connection refused" when accessing Directus**
- Wait 2-3 minutes, then refresh your browser
- Check logs: `oc logs -l app=directus -f`

**"Missing .env file"**
```bash
cp .env.example .env
vim .env
# Fill in the values
```

**"Directus says 'cannot connect to database'"**
- Make sure postgres pod is running: `oc get pod postgres-0`
- Check that DB_PASSWORD matches POSTGRES_PASSWORD in your .env
- Run `bash openshift/deploy_postgres.sh` again to redeploy the database

That's it! You now have a working backend. 🎉

Read [API_INTEGRATION.md](API_INTEGRATION.md) next to connect your frontend.

---

**Need more help?** → Read [SETUP.md](SETUP.md) for detailed explanations
