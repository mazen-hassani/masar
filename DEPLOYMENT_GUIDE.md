# 🚀 Masar Project - Complete Deployment Guide

## Phase 1: Push to GitHub (Your Local Machine)

### Step 1.1: Verify Git Status
```bash
cd ~/Desktop/masar
git status
git log --oneline | head -10
```

### Step 1.2: Rename Branch to Main
```bash
git branch -m master main
```

### Step 1.3: Push to GitHub
```bash
git push -u origin main
```

If prompted for credentials, use:
- **Username**: Your GitHub username
- **Password**: Your GitHub Personal Access Token (not your password)
  - Create one at: https://github.com/settings/tokens (select `repo` scope)

### Step 1.4: Verify Push
```bash
git branch -a
git log --oneline origin/main | head -5
```

Expected output: All commits visible on `origin/main`

---

## Phase 2: Set Up Vercel Deployment

### Step 2.1: Create Vercel Account
1. Go to https://vercel.com/signup
2. Sign up with GitHub (recommended for auto-deployment)
3. Authorize Vercel to access your GitHub repositories
4. Accept all permissions

### Step 2.2: Import Project to Vercel
1. Go to https://vercel.com/dashboard
2. Click **"Add New..." → "Project"**
3. Select **"Import Git Repository"**
4. Find and select **"mazen-hassani/masar"**
5. Click **"Import"**

### Step 2.3: Configure Project Settings

#### Root Directory
- **Framework Preset**: Other
- **Root Directory**: `.` (default)
- Click **"Edit"** if different

#### Build Settings
- **Build Command**:
  ```
  npm run build
  ```
- **Output Directory**:
  ```
  apps/frontend/dist
  ```
- **Install Command**:
  ```
  npm install
  ```

#### Environment Variables
None needed for frontend deployment (API URL can be set to your backend)

### Step 2.4: Deploy
1. Click **"Deploy"**
2. Wait for build to complete (3-5 minutes)
3. You'll see a "Congratulations!" message with your live URL

Expected URL format: `https://masar-xxxxx.vercel.app`

---

## Phase 3: Configure for Production

### Step 3.1: Set Up Custom Domain (Optional)
1. In Vercel Dashboard → Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration steps

### Step 3.2: Set Environment Variables (If Needed)
1. Project Settings → Environment Variables
2. Add any backend API URLs:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-api.com`
3. Redeploy after adding variables

### Step 3.3: Configure Auto-Deployment
This is automatic when using GitHub import:
- Every push to `main` branch → Auto-deploys to production
- Every pull request → Preview deployment created

### Step 3.4: Set Up Rollbacks (Optional)
- Deployments tab → Select previous deployment → Click "Promote to Production"

---

## Phase 4: Backend Deployment (When Ready)

### For Node.js API (apps/api):
1. Deploy to **Heroku**, **Railway**, **Render**, or **AWS**
2. Set up environment variables for database
3. Get deployment URL
4. Update frontend `VITE_API_URL` in Vercel environment variables

Example for Railway:
```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

---

## Phase 5: Post-Deployment Checklist

### Testing
- [ ] Visit your live URL
- [ ] Test login flow
- [ ] Create a project
- [ ] Add activities and tasks
- [ ] Test Gantt chart loading
- [ ] Test Kanban board drag-and-drop
- [ ] Check dashboard metrics

### Performance
- [ ] Check Vercel Analytics: Dashboard → Analytics
- [ ] View Performance metrics
- [ ] Check Web Vitals

### Monitoring
- [ ] Set up error tracking (Sentry optional)
- [ ] Check Vercel logs: Dashboard → Deployments → Logs
- [ ] Monitor API calls

---

## Common Issues & Solutions

### Issue 1: Build Fails with "turbo_json_parse_error"
**Solution**:
- Ensure turbo.json is valid JSON
- Remove any trailing commas
- Run `npm run build` locally first to test

### Issue 2: Frontend Loads but Can't Connect to API
**Solution**:
- Check `VITE_API_URL` environment variable
- Ensure backend is running and accessible
- Check CORS configuration on backend
- Verify API URL in `apps/frontend/src/services/api.ts`

### Issue 3: 404 Errors on Page Refresh
**Solution** (for React Router):
- In Vercel Dashboard → Project Settings → Rewrites
- Add rewrite rule:
  - **Source**: `/(.*)`
  - **Destination**: `/index.html`

### Issue 4: Environment Variables Not Working
**Solution**:
- Ensure prefix is correct: `VITE_` for Vite projects
- Redeploy after adding variables (important!)
- Check Vercel logs for variable values

---

## Development Workflow After Deployment

### Making Changes
```bash
# On your local machine
git checkout main
git pull origin main

# Make your changes
git add .
git commit -m "Your message"
git push origin main

# Vercel auto-deploys! 🚀
# Check deployment status at https://vercel.com/dashboard
```

### Preview Deployments
- Create a PR on GitHub
- Vercel automatically creates a preview URL
- Share preview URL for testing
- Merge PR to deploy to production

---

## Monitoring & Maintenance

### Weekly Checks
- [ ] Review Vercel Analytics
- [ ] Check error logs
- [ ] Monitor build times
- [ ] Test critical user flows

### Monthly Checks
- [ ] Review performance metrics
- [ ] Update dependencies: `npm update`
- [ ] Check for security vulnerabilities: `npm audit`
- [ ] Review and optimize database queries

---

## Scaling for Production

### When You're Ready to Add Backend

1. **Deploy Backend API**
   - Use Vercel for Node.js or Railway/Render for flexibility
   - Set up database (PostgreSQL recommended)
   - Configure environment variables

2. **Update Frontend API URL**
   - In Vercel: Project Settings → Environment Variables
   - Add: `VITE_API_URL=https://your-api.com`
   - Redeploy frontend

3. **Enable Real-Time Updates**
   - Implement WebSocket connection for notifications
   - Update auth tokens handling for longer sessions

4. **Set Up Analytics**
   - Vercel Analytics (built-in)
   - Sentry for error tracking (optional)
   - Google Analytics (optional)

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js/React Deployment**: https://vercel.com/docs/frameworks
- **Environment Variables**: https://vercel.com/docs/projects/environment-variables
- **Troubleshooting**: https://vercel.com/docs/platform/troubleshoot
- **Pricing**: https://vercel.com/pricing (Free tier includes 1 deployment per day)

---

## Success Criteria ✅

Your deployment is successful when:
1. ✅ GitHub repository is public and has all commits
2. ✅ Vercel project is created and linked to GitHub
3. ✅ Frontend builds successfully on Vercel
4. ✅ Live URL is accessible and loads the application
5. ✅ All pages work (login, dashboard, projects, etc.)
6. ✅ Responsive design works on mobile/tablet
7. ✅ Navigation between pages works
8. ✅ Auto-deployment triggers on push to main

---

## Next Steps After Frontend Deployment

1. **Deploy Backend API** (Node.js + PostgreSQL)
2. **Connect Frontend to Backend**
3. **Set Up Database Backups**
4. **Configure Email Service** (for password resets)
5. **Set Up Monitoring** (error tracking, performance)
6. **Implement CI/CD** (automated testing)
7. **Add User Analytics**
8. **Plan Scaling** (CDN, database optimization)

---

Good luck with deployment! 🚀
