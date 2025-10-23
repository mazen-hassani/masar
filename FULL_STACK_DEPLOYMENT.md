# 🚀 Masar - Full Stack Deployment Guide (Vercel + Render)

Complete step-by-step guide to deploy frontend on Vercel and backend on Render with PostgreSQL database.

---

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                         │
├─────────────────────────┬─────────────────────────────────┤
│     Frontend (Vercel)   │      Backend (Render)           │
│  ─ React/Vite App     │  ─ Express API                 │
│  ─ Hosted on CDN      │  ─ Node.js Server              │
│  ─ Auto-deployed      │  ─ PostgreSQL Database (Render)│
│  ─ Live at:           │  ─ Prisma ORM                 │
│    masar-xxx.         │  ─ Authentication              │
│    vercel.app         │  ─ Data Persistence            │
└─────────────────────────┴─────────────────────────────────┘
```

---

# PHASE 1: FRONTEND DEPLOYMENT (Vercel)

## Step 1.1: Push Code to GitHub

**Run on your local machine:**

```bash
cd ~/Desktop/masar
git push origin main
```

**Expected output:**
```
Enumerating objects: 5, done.
Counting objects: 100% (5/5), done.
...
To https://github.com/mazen-hassani/masar.git
   abc1234..def5678  main -> main
```

✅ **Success**: Your code is now on GitHub!

---

## Step 1.2: Verify Vercel Deployment

### Option A: If Already Connected to Vercel

1. Go to https://vercel.com/dashboard
2. Find your "masar" project
3. Click on it
4. You should see a deployment in progress
5. Wait for the green checkmark ✅

**What to look for:**
- Build status: ✅ (green)
- Deployment status: ✅ (green)
- Live URL: `https://masar-xxxxx.vercel.app`

### Option B: If NOT Yet Connected to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New..." → "Project"**
3. Click **"Import Git Repository"**
4. Search for and select **"mazen-hassani/masar"**
5. Click **"Import"**

**Configure:**
- **Framework Preset**: Other
- **Root Directory**: `.` (leave as default)
- **Build Command**: `cd apps/frontend && npm run build`
- **Output Directory**: `apps/frontend/dist`
- **Install Command**: `npm install`

6. Click **"Deploy"** and wait

---

## Step 1.3: Test Frontend Deployment

Once deployment completes (green checkmark):

1. Click the **live URL** or go to `https://masar-xxxxx.vercel.app`
2. You should see the Masar login page
3. Try to login (it will fail because backend isn't deployed yet - that's expected!)

**Success Indicator:**
- ✅ Login page loads
- ✅ Page doesn't have 500 errors
- ✅ Responsive on mobile

---

# PHASE 2: BACKEND & DATABASE DEPLOYMENT (Render)

## Step 2.1: Create Render Account

1. Go to https://render.com
2. Click **"Sign up"**
3. Choose **"Sign up with GitHub"** (easier!)
4. Authorize Render to access your GitHub account
5. Accept all permissions

✅ **Render account created!**

---

## Step 2.2: Create PostgreSQL Database on Render

1. From Render dashboard, click **"New +"** (top right)
2. Select **"PostgreSQL"**

**Configure Database:**

| Field | Value |
|-------|-------|
| Name | `masar-db` |
| Database | `masar` |
| User | `masar_user` |
| Region | Pick closest to you (e.g., `us-east`) |
| Plan | Free (for testing) |

3. Click **"Create Database"**
4. Wait for database to spin up (2-3 minutes)

**When ready, you'll see:**
- Status: `Available` (green)
- External Database URL: `postgresql://masar_user:...@xxx.render.com/masar`

**⚠️ IMPORTANT: Copy and save this URL - you'll need it!**

---

## Step 2.3: Prepare Backend for Deployment

### Check Render.yaml Configuration

Your repo should have a `render.yaml` file. Let me verify it exists:

**If it exists**, skip to Step 2.4.

**If NOT**, create it at the root:

```bash
# On your local machine
touch /path/to/masar/render.yaml
```

Add this content:

```yaml
services:
  - type: web
    name: masar-api
    env: node
    plan: free
    buildCommand: "cd apps/api && npm install && npm run build"
    startCommand: "cd apps/api && npm start"
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: JWT_REFRESH_SECRET
        sync: false
```

Then commit:
```bash
git add render.yaml
git commit -m "Add Render configuration for backend deployment"
git push origin main
```

---

## Step 2.4: Deploy Backend on Render

1. Go to https://render.com/dashboard
2. Click **"New +"** (top right)
3. Select **"Web Service"**
4. Click **"Connect a repository"**
5. Search for and select **"mazen-hassani/masar"**
6. Click **"Connect"**

**Configure Web Service:**

| Field | Value |
|-------|-------|
| Name | `masar-api` |
| Environment | `Node` |
| Region | Same as database (e.g., `us-east`) |
| Build Command | `cd apps/api && npm install && npm run build` |
| Start Command | `cd apps/api && npm start` |
| Plan | Free |

7. **Scroll down to "Environment Variables"**

---

## Step 2.5: Set Environment Variables for Backend

Add these environment variables in Render:

### Required Variables:

```
NODE_ENV = production

DATABASE_URL = (paste the PostgreSQL URL from Step 2.2)
Example: postgresql://masar_user:password@xxx.render.com/masar

JWT_SECRET = (create a random string, e.g., use this: $(openssl rand -base64 32))

JWT_REFRESH_SECRET = (create another random string: $(openssl rand -base64 32))

PORT = 3001
```

**How to generate JWT secrets:**

On your terminal, run:
```bash
openssl rand -base64 32
```

This gives you a secure random string. Use different ones for JWT_SECRET and JWT_REFRESH_SECRET.

**Example output:**
```
aBc123XyZ+/==
```

8. After adding all env vars, click **"Create Web Service"**
9. **Wait for deployment** (5-10 minutes)

**What to expect:**
- Build logs appear on screen
- You'll see: `npm install`, `npm run build`, etc.
- Finally: `"running successfully"` (green)

---

## Step 2.6: Get Your Backend URL

Once deployment completes:

1. You'll see a live URL like: `https://masar-api-xxxxx.render.com`
2. **Copy this URL** - you'll need it for the frontend!

**Test it:**
```bash
curl https://masar-api-xxxxx.render.com/health
```

You should get a JSON response (or 404 - both mean the server is running).

---

## Step 2.7: Run Database Migrations

Your backend is running, but the database tables need to be created!

**Option A: Run migrations from Render (Easier)**

1. On Render dashboard, go to your `masar-api` service
2. Click **"Shell"** tab
3. Paste this command:
```bash
cd apps/api && npx prisma migrate deploy
```
4. Press Enter and wait

**Expected output:**
```
✓ Database already exists
✓ Migrations have been applied
```

**Option B: Run migrations locally (Alternative)**

```bash
# On your machine
export DATABASE_URL="postgresql://masar_user:password@xxx.render.com/masar"
cd apps/api
npx prisma migrate deploy
```

✅ **Database tables are now created!**

---

# PHASE 3: CONNECT FRONTEND TO BACKEND

## Step 3.1: Set Frontend API URL in Vercel

1. Go to https://vercel.com/dashboard
2. Select your **"masar"** project
3. Click **"Settings"** (top menu)
4. Click **"Environment Variables"** (left sidebar)
5. Click **"Add New"** button

**Add this variable:**

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://masar-api-xxxxx.render.com` |

(Use YOUR actual Render backend URL from Step 2.6)

6. Click **"Save"**
7. Go to **"Deployments"** tab
8. Click **"Redeploy"** on the latest deployment
9. Wait for deployment to complete (green ✅)

✅ **Frontend now knows where to find the backend!**

---

# PHASE 4: FULL STACK TESTING

## Step 4.1: Test the Full Application

1. Visit your frontend URL: `https://masar-xxxxx.vercel.app`
2. You should see the **Login page**

**Test 1: Create an Account**
- Click "Create Account" (if available) or skip if only login
- Fill in: Email, Password
- Click "Sign Up"
- You should be redirected to dashboard

**Test 2: Create a Project**
- On dashboard, click "Create Project"
- Enter project name: "Test Project"
- Click "Create"
- You should see the project in the list

**Test 3: Create Activity**
- Click into the project
- Click "Create Activity"
- Fill in name and dates
- Click "Create"

**If all these work, you have full stack integration! 🎉**

---

## Step 4.2: Check Logs for Errors

**If something fails:**

**Frontend logs (Vercel):**
1. Go to https://vercel.com/dashboard
2. Select "masar" project
3. Click "Deployments" → Latest deployment
4. Click "View Build Logs"
5. Look for red error messages

**Backend logs (Render):**
1. Go to https://render.com/dashboard
2. Select "masar-api" service
3. Logs appear automatically on the page
4. Look for errors

**Common issues:**
- `Cannot connect to database` → DATABASE_URL is wrong
- `JWT_SECRET not found` → Missing env var in Render
- `CORS error` → Add frontend URL to backend CORS config
- `404 on endpoint` → Backend didn't start properly

---

# PHASE 5: AUTOMATED DEPLOYMENT WORKFLOW

## How Deployments Work (After Initial Setup)

### Scenario: You Add a New Feature

```
1. Local Development
   └─ git checkout -b feature/new-widget
   └─ Make changes to apps/frontend/src/**
   └─ Test locally with: npm run dev

2. Commit & Push
   └─ git add .
   └─ git commit -m "Add new widget"
   └─ git push origin feature/new-widget

3. Create Pull Request
   └─ Go to GitHub
   └─ Create PR from feature/new-widget → main
   └─ Vercel automatically creates preview URL
   └─ Test on preview URL
   └─ Get code review

4. Merge to Main
   └─ Approve PR
   └─ Click "Merge Pull Request"

5. Auto-Deploy (Automatic!)
   ├─ Vercel sees push to main in apps/frontend/**
   │  └─ Automatically builds frontend
   │  └─ Deploys to masar-xxxxx.vercel.app
   │  └─ Done in 1-2 minutes ✅
   │
   └─ Render skips (no backend changes)
```

### Another Scenario: You Update the Backend API

```
1. Local Development
   └─ git checkout -b feature/new-endpoint
   └─ Make changes to apps/api/src/**
   └─ Maybe update Prisma schema in apps/api/prisma/schema.prisma
   └─ Test locally

2. Commit & Push
   └─ git add .
   └─ git commit -m "Add user export endpoint"
   └─ git push origin feature/new-endpoint

3. Create & Merge PR
   └─ Same process

4. Auto-Deploy (Automatic!)
   ├─ Render sees push to main in apps/api/**
   │  └─ Automatically rebuilds backend
   │  └─ Runs migrations: npx prisma migrate deploy
   │  └─ Restarts service on masar-api-xxxxx.render.com
   │  └─ Done in 3-5 minutes ✅
   │
   └─ Vercel skips (no frontend changes)
```

### Full Stack Feature (Both Frontend + Backend)

```
1. Create single feature branch
   └─ git checkout -b feature/csv-export

2. Make changes to BOTH
   └─ apps/frontend/src/pages/ExportPage.tsx
   └─ apps/api/src/routes/export.routes.ts
   └─ apps/api/prisma/schema.prisma (if needed)

3. Single commit for both
   └─ git add .
   └─ git commit -m "feat: Add CSV export for projects

   - New ExportPage component
   - New /api/export endpoint
   - Update Prisma schema"

4. Push & Merge

5. BOTH auto-deploy! 🚀
   ├─ Vercel: Frontend updated in 1-2 min
   └─ Render: Backend updated in 3-5 min
```

---

# PHASE 6: MONITORING & MAINTENANCE

## Daily Checks

**Monitor Frontend (Vercel):**
1. Go to https://vercel.com/dashboard
2. Select "masar" project
3. Check "Deployments" for any red ❌ errors
4. If deployment failed, click it and check build logs

**Monitor Backend (Render):**
1. Go to https://render.com/dashboard
2. Select "masar-api" service
3. Check if status is "Live" (green)
4. Scroll down to see recent logs

---

## Useful Commands

### Check if backend is running:
```bash
curl https://masar-api-xxxxx.render.com/health
```

### View database:
```bash
# On your local machine
psql postgresql://masar_user:password@xxx.render.com/masar
```

### View recent database changes:
```bash
cd apps/api
npx prisma studio --url $DATABASE_URL
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Frontend shows blank page | Check browser console (F12), look for API errors |
| Can't login | Backend may not have started, check Render logs |
| 502 Bad Gateway from backend | Database connection failed, check DATABASE_URL |
| Migrations failed | Run `npx prisma migrate reset` (⚠️ deletes data!) |
| Frontend can't reach backend | Check VITE_API_URL is correct in Vercel env vars |

---

# Summary Checklist ✅

- [ ] Code pushed to GitHub `main` branch
- [ ] Frontend deployed on Vercel (green ✅)
- [ ] Render account created
- [ ] PostgreSQL database created on Render
- [ ] Backend deployed on Render (green ✅)
- [ ] Database migrations ran successfully
- [ ] VITE_API_URL set in Vercel
- [ ] Frontend redeployed with API URL
- [ ] Test: Can login to application
- [ ] Test: Can create project
- [ ] Test: Can create activity
- [ ] Monitor: Vercel logs clean (no errors)
- [ ] Monitor: Render logs clean (no errors)

---

## You're Live! 🎉

Your application is now:
- ✅ Hosted on **Vercel** (frontend)
- ✅ Hosted on **Render** (backend)
- ✅ Database on **Render PostgreSQL**
- ✅ Auto-deploying on every GitHub push
- ✅ Ready for production use!

Next steps: Deploy more features, monitor performance, scale as needed.

---

**Need help?**
- Vercel docs: https://vercel.com/docs
- Render docs: https://render.com/docs
- Prisma docs: https://www.prisma.io/docs
