# PostgreSQL Setup Guide for OpenShift

**Don't be scared!** This guide will walk you through setting up a database in the cloud. You're basically telling a computer in the cloud to start PostgreSQL (which is like a super-organized Excel spreadsheet) so your website can save and load data.

## What You're Setting Up

**PostgreSQL** is a database—think of it like a giant Excel spreadsheet that lives on a server. Instead of saving data in a file on your computer, your website can save data here and look it up really fast.

**OpenShift** is a cloud platform. It's basically giving you a computer in the cloud to run your website and database.

## Prerequisites (What You Need First)

Before you start, make sure you have:

1. **OpenShift CLI** installed (this is like a remote control for the cloud computer)
   - Open your terminal/command prompt and type: `oc version`
   - If it says "command not found," ask your teacher or [follow this tutorial](https://docs.openshift.com/container-platform/latest/cli_reference/openshift_cli/getting-started-cli.html)

2. **You're logged into OpenShift**
   - Your teacher should give you login instructions
   - In your terminal, type: `oc login <your-cluster-url>` (your teacher will tell you what to put there)

3. **You have a project set up**
   - Type: `oc project <project-name>` (your teacher will tell you the project name)
   - If this works without errors, you're good to go!

## Step 1: Create Your Database Settings File

Think of this like filling out a form with your database information.

1. Open your terminal and go to your project folder:
   ```bash
   cd path/to/your/project
   ```

2. Go into the `openshift` folder and make a copy of the example file:
   ```bash
   cp openshift/.env.example openshift/.env
   ```
   (This creates a new file called `.env` from the template `.env.example`)

3. Open the file `openshift/.env` in your code editor and fill it in with something like this:
   ```
   POSTGRES_DB=directus
   POSTGRES_USER=directus
   POSTGRES_PASSWORD=MySecurePassword123!
   ```

   What does each line mean?
   - **POSTGRES_DB**: What you want to call your database (you can name it anything)
   - **POSTGRES_USER**: Your username to access the database (like a username for a game)
   - **POSTGRES_PASSWORD**: Your password (like a password for a game) - **MAKE IT SOMETHING ONLY YOU KNOW!**

**⚠️ SUPER IMPORTANT**: Don't put your `.env` file on GitHub! GitHub is public, and anyone could see your password. The `.gitignore` file (which is already in your project) automatically hides this file from GitHub, so you're safe. Just don't manually add it!

## Step 2: Run the Setup Script (The Magic Happens Here)

Now you're going to run a script (a small program) that does all the hard work for you. Think of it like a recipe that tells the computer exactly what to do.

1. Open your terminal and make sure you're in the **root folder of your project** (the main folder):
   ```bash
   pwd
   ```
   If you see your project path, you're in the right place.

2. Run the setup script:
   ```bash
   bash openshift/deploy_postgres.sh
   ```

3. **Wait!** The script will:
   - Read your `.env` file (the file you just created)
   - Tell the cloud computer to start PostgreSQL
   - Create a "Secret" (a safe place to keep your password encrypted)
   - Create a "Service" (a way for your website to talk to the database)
   - Wait for everything to start (this takes 1-2 minutes—just be patient!)

4. You should see a message like `deployment successful` when it's done. If something goes wrong, it will tell you!

**What if I get an error?**
- Make sure you created the `.env` file in Step 1
- Make sure you're in the root folder of your project
- Make sure you filled in all three lines in the `.env` file

## Step 3: Check If Everything Started

Let's make sure the database is actually running!

Type this in your terminal:
```bash
oc get pods -l app=postgres
```

**You should see something like this:**
```
NAME         READY   STATUS    RESTARTS   AGE
postgres-0   1/1     Running   0          2m
```

**What am I looking at?**
- **postgres-0**: The name of your database container (cool robot running your database)
- **1/1**: Means 1 container is ready (and you wanted 1) ✅
- **Running**: It's actually running right now! ✅
- **0**: It hasn't crashed and restarted ✅

**If you see `1/1` and `Running`, you're done! 🎉**

If you see something different:
- **PENDING or CREATING**: Wait 30 seconds and try again
- **ERROR or CRASH**: Something went wrong. Jump to the Troubleshooting section below

## Step 4: Connect Your Website to the Database

Now your database is running! But your website doesn't know where to find it yet. You need to tell your website the password and address of the database.

**The database "address" inside the cloud is:**
```
postgres:5432
```

**When you write code to connect to the database, you'll use:**
- **Host**: `postgres` (this is like the IP address for your cloud computer)
- **Port**: `5432` (this is like a mailbox number—5432 is the standard PostgreSQL mailbox)
- **Database**: Whatever you set in `POSTGRES_DB` (from your `.env` file)
- **Username**: Whatever you set in `POSTGRES_USER`
- **Password**: Whatever you set in `POSTGRES_PASSWORD`

**Example:** If your `.env` file says:
```
POSTGRES_DB=directus
POSTGRES_USER=directus
POSTGRES_PASSWORD=MySecurePassword123!
```

Then your connection looks like:
```
postgresql://directus:MySecurePassword123!@postgres:5432/directus
```

**How do I use this in my code?**
Your backend code (JavaScript with Node.js, or whatever you're using) will need a library to talk to the database. Your teacher will show you how to use this connection string with that library. It's different for each language/library, but you'll basically copy-paste this connection string into your code somewhere.

## Troubleshooting (When Things Go Wrong)

**Problem: "Pod is not running" or I see "PENDING"**
- This is normal at first! Just wait 1-2 minutes and run this again:
  ```bash
  oc get pods -l app=postgres
  ```
- If it's still not running after 2 minutes, go to the next problem below

**Problem: "Missing .env file" error**
- You forgot Step 1! Go back and create `openshift/.env`
- Make sure you filled in all three lines (POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD)

**Problem: "Pod keeps crashing" (STATUS shows ERROR or CRASH)**
- Check what went wrong by looking at the logs:
  ```bash
  oc logs postgres-0
  ```
- Look for red errors in the output
- Common issues:
  - `.env` file has typos
  - You're not in the right folder
  - OpenShift ran out of storage space (ask your teacher)

**Problem: I can't connect to the database from my code**
- Make sure the database is running:
  ```bash
  oc get pods -l app=postgres
  ```
- Make sure your connection string is exactly right (copy-paste is your friend!)
- Make sure your `.env` file matches what you put in your code

## What's Happening Behind the Scenes? (Optional Reading)

**Don't need to understand this part!** But if you're curious, here's what the script does:

1. **Reads your `.env` file** - Grabs your database name and password
2. **Puts those secrets in a "Secret"** - OpenShift encrypts your password so hackers can't steal it (the password is hidden)
3. **Tells OpenShift to start PostgreSQL** - Asks the cloud to start a database container
4. **Creates a "Service"** - Makes the database available to your app with the address `postgres:5432`
5. **Waits for it to start** - Makes sure everything is ready before the script finishes

Think of it like ordering food at a restaurant:
- You give them your order (your `.env` file)
- They check you in (creates a Secret)
- The kitchen starts cooking (starts the database)
- They tell you which table you're sitting at (creates the Service)
- They wait for your food to arrive before bringing it to you (waits for startup)

## Need More Help?

**If something goes wrong, don't panic!** Here are some helpful commands:

**See what the database is saying:**
```bash
oc logs postgres-0 --tail=20
```
(This shows you the last 20 lines of messages. Look for anything in RED—that's usually the problem)

**Get details about the database:**
```bash
oc describe pod postgres-0
```
(This tells you everything about the database, like when it started, what resources it's using, etc.)

**Most importantly: Ask your teacher!** Backend development has a lot of moving parts. Your teacher has seen these problems before and can help you debug. That's literally their job!

---

**Congrats on setting up your first database! 🎉** You just did something that lots of junior developers find intimidating. Be proud of yourself!
