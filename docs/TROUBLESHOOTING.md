# Troubleshooting - When Things Go Wrong

Everything broke? Don't panic. This guide covers the most common issues and how to fix them.

## Quick Diagnosis

When something's wrong, **always check the logs first**. They tell you exactly what went wrong:

```bash
# Check Directus logs
oc logs -l app=directus -f

# Check Postgres logs
oc logs postgres-0 -f

# Check a specific error
oc events
```

## Common Issues

### Pod Won't Start

**Symptom:** `oc get pods` shows status `Pending`, `CrashLoopBackOff`, or `ImagePullBackOff`

**Check 1: Do you have enough resources?**
```bash
oc describe pod <pod-name>
```

Look for messages like:
- "insufficient memory"
- "insufficient cpu"
- "no nodes available"

**Solution:** Contact your OpenShift admin about cluster resources, or reduce resource requests in the YAML files.

**Check 2: Is there a configuration error?**
```bash
oc logs <pod-name>
```

Look for error messages in the logs. Common ones:
- "Cannot connect to database" → Check DB_PASSWORD and DB_HOST
- "Permission denied" → Check file permissions and user settings
- "Port already in use" → Try deleting and redeploying

**Check 3: Delete and redeploy**
```bash
oc delete pod <pod-name>
# OpenShift will automatically restart it
```

---

### "Cannot Connect to Database"

**Symptom:** Directus logs say `error: connect ECONNREFUSED` or similar

**This means:** Directus can't reach PostgreSQL.

**Check 1: Is Postgres running?**
```bash
oc get pod postgres-0
```

Should show `Running` and `Ready 1/1`. If not, deploy it:
```bash
bash openshift/deploy_postgres.sh
```

**Check 2: Are the credentials right?**
```bash
# Check what you set in .env
grep DB_PASSWORD .env
grep DB_USER .env
grep DB_DATABASE .env

# Check what Postgres was created with
grep POSTGRES_PASSWORD .env
grep POSTGRES_USER .env
grep POSTGRES_DB .env
```

They **must match exactly**. If they don't:
1. Edit `.env` to make them match
2. Redeploy both services:
   ```bash
   bash openshift/deploy_postgres.sh
   bash openshift/deploy_directus.sh
   ```

**Check 3: Is the hostname correct?**

In the YAML files, Directus tries to connect to:
```
postgres.default.svc.cluster.local:5432
```

This is the Kubernetes internal DNS name. It should work as-is, but if not:
```bash
# From within the cluster, test connectivity
oc run -i --rm test --image=bitnami/postgresql --restart=Never -- \
  bash -c "PGPASSWORD=xyz psql -h postgres.default.svc.cluster.local -U directus -d directus -c 'SELECT 1'"
```

Replace `xyz` with your actual `POSTGRES_PASSWORD`.

---

### Can't Access Directus in Browser

**Symptom:** "Connection refused" or "Cannot reach server"

**Check 1: Is Directus running?**
```bash
oc get pod -l app=directus
```

Should show `Running`. If not, check the logs:
```bash
oc logs -l app=directus -f
```

**Check 2: Wait for it to start**

Directus takes 30-60 seconds to start the first time (it's initializing the database). Just wait and refresh.

**Check 3: Get the correct URL**
```bash
oc get route directus
```

Look for the `HOST/PORT` column. Your URL is:
```
https://<HOST>/admin
```

Make sure you're using `https://` (not `http://`).

**Check 4: Check the Route is created**
```bash
oc get routes
```

Should show a route called `directus`. If it's missing, redeploy:
```bash
bash openshift/deploy_directus.sh
```

---

### Login Page But Can't Log In

**Symptom:** You see the Directus login page, but logging in fails

**Check 1: Did you use the right credentials?**
```bash
grep ADMIN_EMAIL .env
grep ADMIN_PASSWORD .env
```

Use those exact values. Remember it's case-sensitive.

**Check 2: Is the database initialized?**

Check the logs:
```bash
oc logs -l app=directus -f
```

Look for:
```
Database migrations up to date
Server started at http://0.0.0.0:8055
```

If you don't see this, the database isn't ready. Wait a few more seconds.

**Check 3: Try resetting**

Delete the secret and redeploy:
```bash
oc delete secret directus-secret
bash openshift/deploy_directus.sh
```

---

### Directus Says "Database Error"

**Symptom:** You're logged in but see error messages about the database

**Check 1: Are both pods running?**
```bash
oc get pods
```

You need:
- `postgres-0` (Running)
- `directus-xxxx` (Running)

**Check 2: Check the Directus logs**
```bash
oc logs -l app=directus -f
```

Look for specific error messages. Common ones:
- "authentication failed" → Check DB_PASSWORD
- "database does not exist" → Check DB_DATABASE name
- "permission denied" → Check DB_USER and POSTGRES_USER match

**Check 3: Restart Directus**
```bash
oc rollout restart deployment/directus
```

---

### 11ty Build Can't Connect to Directus API

**Symptom:** Build fails with errors like:
```
Failed to fetch from https://directus.com/api/items/articles
```

**Check 1: Is Directus running?**
```bash
oc get route directus
# Should show a route URL
```

Test from your local machine:
```bash
curl https://directus-xxxxx.apps.openshift.com/health
```

Should return `200 OK`.

**Check 2: Check your API credentials**
```bash
# In your .env, make sure:
grep DIRECTUS_API_URL .env
grep DIRECTUS_API_TOKEN .env
```

Both must be set and correct.

**Check 3: Is the API token valid?**

Go to Directus admin and check:
1. Settings → Access Control → Tokens
2. Find your token
3. Check if it's expired
4. Check if it has permission to read your collection

**Check 4: Test the API manually**
```bash
curl "https://directus-xxxxx.apps.openshift.com/api/items/articles?access_token=YOUR_TOKEN"
```

Should return JSON data. If not:
- Token is wrong (copy it again from Directus)
- Collection name is wrong (check spelling)
- Token doesn't have permission (create a new public token)

---

### Git Says ".env is Ignored"

**Symptom:** You're trying to commit `.env` but git ignores it

This is **correct behavior**. Never commit `.env` to git.

If you need to save it locally for reference:
```bash
# Store it securely (not in git)
cp .env .env.local
```

Your teammates can copy `.env.example` and fill in their own values.

---

### Build Errors in 11ty

**Symptom:** 11ty build fails during data fetching

**Check 1: Is Directus accessible?**
```bash
# From your computer, test the API
curl "https://directus-xxxxx.apps.openshift.com/health"
```

Must return `200 OK`.

**Check 2: Check your _data/directus.js file**

Make sure:
- Variable names match (case-sensitive)
- URL is correct
- Token is correct
- Collection name exists (check in Directus admin)

**Check 3: Add debugging**
```javascript
// In src/_data/directus.js
async function fetchCollection(collection) {
  console.log(`Fetching collection: ${collection}`);
  console.log(`From URL: ${apiUrl}/items/${collection}`);
  // ... rest of function
}
```

Run build and check console output:
```bash
npm run build 2>&1 | grep "Fetching"
```

---

## Performance Issues

### Build Takes Too Long

**Check:** How long does the fetch take?

```javascript
// Add timing to src/_data/directus.js
const start = Date.now();
const response = await fetch(...);
const duration = Date.now() - start;
console.log(`Fetch took ${duration}ms`);
```

**If API is slow:**
- Check Directus logs: `oc logs directus-xxxx -f`
- Check if database is slow: `oc logs postgres-0 -f`
- Try filtering by fewer items

**If you have lots of content:**
- Use pagination: `limit=100&page=1`
- Only fetch fields you need: `fields=title,slug`
- Cache the results (see [API_INTEGRATION.md](API_INTEGRATION.md))

### Directus Is Slow

```bash
# Check CPU/memory usage
oc top pod directus-xxxx

# If resources are maxed out, increase them in directus.yaml
```

---

## I'm Still Stuck

### If you've checked the above:

1. **Collect information**
   ```bash
   # Save all this info
   oc get pods > pods.txt
   oc logs -l app=directus --tail=50 > directus-logs.txt
   oc logs postgres-0 --tail=50 > postgres-logs.txt
   oc get secrets > secrets.txt
   cat .env > env.txt
   ```

2. **Ask for help**
   - Show the error message
   - Show the logs
   - Describe what you did before the error appeared
   - Describe what you expected to happen

3. **Check the docs**
   - [SETUP.md](SETUP.md) - Detailed walkthrough
   - [ARCHITECTURE.md](ARCHITECTURE.md) - How everything works
   - [API_INTEGRATION.md](API_INTEGRATION.md) - Frontend integration

---

## Nuclear Option - Start Over

If everything is broken and you want to start fresh:

```bash
# Delete everything
oc delete all -l app=directus
oc delete all -l app=postgres
oc delete secret directus-secret
oc delete secret postgres-secret
oc delete configmap directus-config
oc delete pvc data-postgres-0

# Wait for everything to delete
sleep 30

# Start fresh
bash openshift/deploy_postgres.sh
bash openshift/deploy_directus.sh
```

This completely removes your deployment and starts over. You will lose any unsaved data in Directus.

---

Still need help? Check [SETUP.md](SETUP.md) again or ask your instructor.
