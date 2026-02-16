# How It All Works - Architecture Guide

This explains the system at a high level so you understand what's happening when you deploy.

## The Three Pieces

### 1. Your Frontend (11ty)

11ty is a static site generator. Unlike React or Next.js where the server generates HTML for every request:

**11ty**
- Runs once during deployment
- Reads data from Directus API
- Generates HTML files
- Uploads static files to the web server
- Every visitor gets a pre-generated HTML file (fast!)

Think of it like printing a newspaper:
- Print job = 11ty build
- Printed newspapers = HTML files
- Newsstands = web server
- Readers = your visitors

### 2. Directus CMS

Directus is where you manage your content. It has two parts:

**Admin Panel** (https://directus-yoursite.com/admin)
- You use this to create/edit content
- User-friendly interface
- Permissions and roles
- Upload media

**API** (https://directus-yoursite.com/api/...)
- Your 11ty build calls this to fetch content
- Returns JSON data
- Secured with API tokens
- Used during your build process

### 3. PostgreSQL Database

The actual database where everything is stored:
- Content collections
- Media metadata
- User accounts
- User permissions

Only Directus can talk to it (it's on the internal Kubernetes network).

## How They Talk to Each Other

```
Your Computer / Build Server
    │
    │ (During 11ty build)
    │
    ├─→ Calls Directus API
    │   https://directus.yoursite.com/items/articles
    │
    │   Directus queries PostgreSQL
    │   ↓
    │   PostgreSQL returns data
    │   ↓
    │   Directus returns JSON
    │
    └─ 11ty generates HTML with that data
       │
       └─→ Uploads HTML to web server
           │
           └─→ Visitors see your static site
```

## The Data Flow Example

Let's say you have an "Articles" collection in Directus with 3 articles.

**Step 1: You log into Directus**
```
Browser → Directus Admin → Your Browser
```

**Step 2: You create a new article**
```
Directus Admin → PostgreSQL
("INSERT INTO articles ...")
```

**Step 3: You rebuild your 11ty site**
```
11ty build script calls:
  → https://directus.com/api/items/articles
  → Directus queries PostgreSQL
  → PostgreSQL returns 4 articles (3 old + 1 new)
  → Directus returns JSON to 11ty
  → 11ty generates HTML files showing all 4 articles
  → HTML uploaded to web server
```

**Step 4: Visitor views your site**
```
Visitor → Static HTML on web server
```

## What Happens in the Cloud (OpenShift)

When you run the deploy scripts, OpenShift creates:

### For PostgreSQL

1. **Pod** - The Docker container running PostgreSQL
2. **Service** - Internal Kubernetes networking (so Directus can find it at `postgres.default.svc.cluster.local:5432`)
3. **PersistentVolume** - Actual disk storage (so data survives pod restarts)
4. **Secret** - Encrypted storage for the password

### For Directus

1. **Pod** - The Docker container running Directus
2. **Service** - Internal Kubernetes networking (for OpenShift internal DNS)
3. **Route** - Public HTTPS access (so your browser and 11ty can reach it)
4. **ConfigMap** - Non-secret configuration (like `NODE_ENV=production`)
5. **Secret** - Encrypted passwords and keys

### For 11ty (You Deploy Separately)

Usually just a Docker container with static files, or a simple web server serving the pre-built HTML.

## Environment Variables and Secrets

Your `.env` file contains:

```bash
# Postgres section - tells OpenShift what database to create
POSTGRES_DB=directus
POSTGRES_USER=directus
POSTGRES_PASSWORD=xxx

# Directus section - tells Directus how to connect
DIRECTUS_KEY=yyy
DIRECTUS_SECRET=zzz
DB_DATABASE=directus      # Must match POSTGRES_DB
DB_USER=directus          # Must match POSTGRES_USER
DB_PASSWORD=xxx          # Must match POSTGRES_PASSWORD
```

The deploy script (`openshift/scripts/deploy_directus.sh`) uses `envsubst` to inject these into the YAML files:

```bash
export POSTGRES_PASSWORD="xxx"
envsubst < postgres.yaml | oc apply -f -
```

This replaces `${POSTGRES_PASSWORD}` in the YAML with `xxx`.

OpenShift then stores the passwords in **Secrets** (encrypted), not in the YAML files.

## Security - How It's Protected

### Passwords Are Encrypted

When you pass credentials to OpenShift:
1. You specify them in `.env`
2. The deploy script reads `.env`
3. Variables are injected into YAML
4. OpenShift stores them encrypted

The `.env` file is only on your computer and your CI/CD system (never committed to git).

### Network Security

- **Postgres**: Only accessible from within the OpenShift cluster (Directus's internal network)
- **Directus Admin**: HTTPS only, behind a login page
- **Directus API**: HTTPS only, requires an API token
- **Frontend**: Served via HTTPS, static files so no server-side secrets

### Container Security

- **Non-root user**: Containers don't run as `root`, limiting damage if compromised
- **Resource limits**: CPU and memory limits prevent resource exhaustion attacks
- **Health checks**: OpenShift automatically restarts failed containers

## What You Deploy vs. What's Pre-Built

**You Create:**
- `.env` file with configuration
- YAML manifests describing what to deploy
- Deployment scripts that orchestrate everything
- Your 11ty frontend code

**OpenShift Manages:**
- Actually running the containers
- Networking between services
- Storage/volumes
- HTTPS certificates
- Health monitoring and restarts
- Scaling (if configured)

## Typical Workflow

1. **Development**: You create features in 11ty locally
2. **Content Creation**: Someone edits content in Directus
3. **Build & Deploy**: You run a build command that:
   - Calls Directus API to fetch latest content
   - 11ty generates static HTML
   - Deploys to web server
4. **Visitors**: They see your static site (very fast!)

## Under the Hood: What Happens at Build Time

```
npm run build (in 11ty)
    │
    ├─ Load .env (DIRECTUS_API_URL, DIRECTUS_API_TOKEN)
    │
    ├─ src/_data/directus.js runs
    │   └─ fetch("https://directus.com/api/items/articles")
    │      └─ Returns: { data: [...articles] }
    │
    ├─ 11ty processes templates
    │   └─ {% for article in data.articles %}
    │      └─ <h2>{{ article.title }}</h2>
    │
    ├─ Generates HTML files
    │   ├─ index.html
    │   ├─ about.html
    │   ├─ article-1/index.html
    │   ├─ article-2/index.html
    │   └─ ...
    │
    └─ Done! All HTML, CSS, JS static files ready
```

These static files are served by nginx or similar web server.

## Comparison: Traditional vs. This Architecture

**Traditional Server**
```
User Request → Web Server → Code execution → Query DB → Generate HTML → Send to User
(Slow, happens on every request)
```

**This Architecture**
```
Build Time: 11ty → Directus → Generate HTML → Upload
Visit Time: User → Static HTML (instant!)
```

Static sites are much faster because the HTML is already generated.

## Common Questions

**Q: Can I update content without rebuilding?**
A: No, the content is baked into the HTML at build time. To show new content, you rebuild.

**Q: How often should I rebuild?**
A: After each content change. You can automate this with webhooks or CI/CD.

**Q: What if the database goes down?**
A: Your site still works! The static HTML doesn't depend on the database at view time. New builds would fail until it's back up.

**Q: Can I have multiple instances of Directus?**
A: Yes, but they'd need to share the same database. Usually not necessary.

**Q: How private is my content API?**
A: As private as you make it. By default, we use API tokens with limited permissions. You can make endpoints public if you want.

---

Next: Read [API_INTEGRATION.md](API_INTEGRATION.md) to actually implement this in your code.
