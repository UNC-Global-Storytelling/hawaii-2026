# Detailed Setup Guide

This guide walks through the setup with explanations. Use this if [QUICKSTART.md](QUICKSTART.md) didn't work or you want to understand what's happening.

## Part 1: Prerequisites - Make Sure You Have Everything

### Check You Have the Right Tools

**OpenShift CLI (`oc`)**

This is how you control your cloud infrastructure. You need it installed and in your PATH.

```bash
oc version
```

If you get `command not found`, download it from:
https://mirror.openshift.com/pub/openshift-v4/clients/ocp/

**envsubst**

This tool substitutes variables into files. On macOS:

```bash
which envsubst
```

If it's missing:

```bash
brew install gettext
```

On Linux:
```bash
sudo apt-get install gettext
```

**You're Logged Into OpenShift**

```bash
oc whoami
```

Should show your username. If it says "error", ask your instructor for login credentials and run:

```bash
oc login <your-cluster-url>
```

### Check You're in the Right Project/Namespace

```bash
oc project
```

Should show your project name. If it's wrong:

```bash
oc project <your-project-name>
```

**IMPORTANT:** Your namespace affects DNS names inside the cluster. If your namespace is `brookenf`, PostgreSQL is accessible at:
```
postgres.brookenf.svc.cluster.local
```

NOT `postgres.default.svc.cluster.local`

The deploy scripts will use your current namespace automatically.

## Part 2: Understanding Your Configuration File (.env)

Your `.env` file stores three types of information:

### Database Configuration (Postgres)

These values define what database is created:

```bash
POSTGRES_DB=directus          # The database name (you choose this)
POSTGRES_USER=directus        # The username (you choose this)
POSTGRES_PASSWORD=secure123   # The password (must be secure!)
```

### Directus Configuration

These values tell Directus how to work:

```bash
DIRECTUS_KEY=abc123...       # Unique ID for the project
DIRECTUS_SECRET=xyz789...    # Secret for signing auth tokens
NODE_ENV=production          # Always "production" for cloud
DB_CLIENT=postgres           # Always "postgres"
DB_HOST=postgres.default.svc.cluster.local  # Kubernetes DNS
DB_PORT=5432                # PostgreSQL port (standard)
```

### Database Access (Directus to Postgres)

These values let Directus connect to the database:

```bash
DB_DATABASE=directus         # ← MUST match POSTGRES_DB
DB_USER=directus             # ← MUST match POSTGRES_USER
DB_PASSWORD=secure123        # ← MUST match POSTGRES_PASSWORD
```

**Critical:** The `DB_*` values MUST exactly match the `POSTGRES_*` values. If they don't match, Directus won't be able to connect to the database.

### Admin Account

When Directus starts, it creates an admin account:

```bash
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=adminpass123
```

You'll use these to log in to the Directus admin panel.

## Part 3: Creating and Validating Your .env File

### Create the File

```bash
cp .env.example .env
```

This copies the template to your actual configuration file.

### Generate Secure Values

For passwords and secrets, don't make them up - generate them:

```bash
openssl rand -base64 32
```

Run this 3 times and copy the output for:
- `POSTGRES_PASSWORD`
- `DIRECTUS_KEY`
- `DIRECTUS_SECRET`
- `ADMIN_PASSWORD`

Each should be different.

### Edit Your Values

```bash
vim .env
```

(or use your editor of choice)

Fill in:
- Postgres section (pick a password)
- Directus section (use generated secrets)
- Admin section (your email, use generated password)

### Validate Your Setup

Check that `.env` is properly formatted and not committed to git:

```bash
# Should show no matches (meaning .env is ignored)
git status | grep ".env"

# Should pass
grep ".env" .gitignore
```

Check that credentials match:

```bash
# These should all output the same value:
grep "POSTGRES_DB=" .env
grep "DB_DATABASE=" .env

# These should all output the same value:
grep "POSTGRES_USER=" .env
grep "DB_USER=" .env

# These should all output the same value:
grep "POSTGRES_PASSWORD=" .env
grep "DB_PASSWORD=" .env
```

## Part 4: Deploying the Database

The database deployment creates:
- A PostgreSQL container
- A persistent volume (storage that survives pod restarts)
- A Kubernetes Service (internal connection point for Directus to connect)
- Secrets (encrypted password storage)

### Deploy

```bash
bash openshift/deploy_postgres.sh
```

**Note:** The deploy script will automatically detect your namespace and configure PostgreSQL accordingly.

This runs through these steps:
1. Loads your `.env` file ← Must exist and have values
2. Validates credentials
3. Applies the YAML manifest to OpenShift
4. Waits for the pod to start
5. Shows you the logs

### Monitor the Deployment

While it's running, in another terminal:

```bash
# Watch the pod status (use --watch instead of watch on macOS)
oc get pods -l app=postgres --watch

# Or just check once
oc get pods -l app=postgres
```

You should see:
```
NAME         READY   STATUS    RESTARTS   AGE
postgres-0   1/1     Running   0          2m
```

**Also verify the Service was created:**
```bash
oc get svc postgres
```

You should see a service with a CLUSTER-IP like `10.x.x.x`

### Test the Connection

Once running, test that it's accessible from within the cluster. First, get your namespace:

```bash
NAMESPACE=$(oc project -q)
```

Now test the connection using your namespace:

```bash
oc run -i --rm pg-test --image=bitnami/postgresql --restart=Never -- \
  bash -c "PGPASSWORD=YOUR_PASSWORD psql -h postgres.$NAMESPACE.svc.cluster.local -U directus -d directus -c 'SELECT 1'"
```

Replace `YOUR_PASSWORD` with your actual `POSTGRES_PASSWORD`.

If successful, you'll see output like:
```
 ?column?
----------
        1
```

**If you get "Name or service not known" error:**
- Check that the Service was created: `oc get svc postgres`
- Check that the pod is running: `oc get pods postgres-0`
- Make sure you're using the correct namespace in the hostname

## Part 5: Deploying Directus

The Directus deployment creates:
- A Directus container running Node.js
- An emptyDir volume at `/.pm2` (writable directory for PM2 process manager)
- A Service (internal Kubernetes networking on port 8055)
- A Route (public HTTPS access with edge TLS termination)
- ConfigMap (non-sensitive configuration)
- Secrets (your passwords and keys)
- Readiness probes (TCP socket health check with 30s startup grace period)

### Deploy

```bash
bash openshift/deploy_directus.sh
```

This script:
1. Loads your `.env` file
2. **Validates that your .env is complete** ← This is important!
3. **Validates that DB_* values match POSTGRES_* values** ← This catches mismatch errors early
4. Applies the YAML manifest
5. Waits for the pod to start
6. Shows you the Directus admin URL

### Monitor the Deployment

```bash
# Check pod status
oc get pods -l app=directus

# View logs
oc logs -l app=directus -f

# Wait for it to be ready
oc wait --for=condition=ready pod -l app=directus --timeout=300s
```

The first startup takes 30-60 seconds (database initialization, migrations, PM2 startup). You'll see logs like:
```
[MM:MM:SS.SSS] INFO: Extensions loaded
[MM:MM:SS.SSS] INFO: Initializing bootstrap...
[MM:MM:SS.SSS] INFO: Running migrations...
[MM:MM:SS.SSS] INFO: Done
YYYY-MM-DDTHH:MM:SS: PM2 log: App [directus:0] online
[MM:MM:SS.SSS] INFO: Server started at http://0.0.0.0:8055
```

Pod status should show `1/1 Ready` when Directus is fully initialized.

### Get Your Admin URL

```bash
oc get route directus -o jsonpath='{.spec.host}{"\n"}'
```

Your URL is:
```
https://<output-from-above>/admin
```

Example: `https://directus-brookenf.apps.cloudapps.unc.edu/admin`

## Part 6: First Login and Initial Setup

Open the URL from above in your browser. You should see the Directus login page.

Log in with:
- Email: Value of `ADMIN_EMAIL` from `.env`
- Password: Value of `ADMIN_PASSWORD` from `.env`

### Verify Everything Worked

Once logged in:
1. Go to Content - should be empty initially
2. Try creating a test collection (e.g., "articles") with a field
3. Save it

If this all works without errors, your entire stack is functioning correctly! 🎉

## Part 7: Post-Deployment Best Practices

### Change Your Admin Password

Right after your first login:
1. Click your profile icon
2. Go to Settings
3. Change your password to something new
4. Update it in your `.env` file and save (for future reference)

### Create Your First Collection

Don't skip this - it verifies the database connection is working:

1. In Directus, click Content
2. Create a new content called "articles"
3. Add fields like "title", "content", "author"
4. Create one sample item
5. Save it

If this works without errors, your entire stack is functioning correctly!

### Set Up API Tokens for Frontend Access

1. Go to Settings → Access Control → Tokens
2. Create a token called "frontend-public"
3. Assign it read-only permissions
4. Copy the token
5. Add to `.env`:
   ```bash
   DIRECTUS_API_TOKEN=<token-here>
   DIRECTUS_API_URL=https://<your-directus-route>
   ```

Read [API_INTEGRATION.md](API_INTEGRATION.md) to use this in your 11ty frontend.

## Part 8: Validation Checklist

Before considering yourself "done", verify:

- [ ] `oc get pods` shows both postgres-0 and directus-* running
- [ ] `oc logs postgres-0` shows no errors
- [ ] `oc logs -l app=directus -f` shows "Server started"
- [ ] Can access Directus admin panel at the route URL
- [ ] Can log in with your admin email/password
- [ ] Can create a collection and add an item
- [ ] Database connection in Directus settings shows as "Connected"
- [ ] `.env` is in `.gitignore` and not committed

If all of these pass, you're good to move on to [API_INTEGRATION.md](API_INTEGRATION.md).

## Troubleshooting in This Guide

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed help with common issues.

---

Next: Read [API_INTEGRATION.md](API_INTEGRATION.md) to connect your frontend.
