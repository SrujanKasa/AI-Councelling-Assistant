# Deployment Guide — Free Hosting (Vercel + Render)

## Architecture
- **Frontend** → Vercel (free, permanent)
- **Backend** → Render.com free tier (free, permanent)
- **Database** → MongoDB Atlas free tier (512MB, free forever)

---

## Step 1: MongoDB Atlas (Database)
1. Go to https://cloud.mongodb.com → Create free account
2. Create a free cluster (M0 Sandbox)
3. Create a database user (username + password)
4. Allow all IPs: Network Access → Add IP → 0.0.0.0/0
5. Get connection string: Connect → Drivers → copy the URI
   - Looks like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/`

---

## Step 2: Backend on Render.com
1. Go to https://render.com → Sign up with GitHub
2. New → Web Service → Connect your GitHub repo
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
4. Add Environment Variables:
   - `MONGO_URL` → your MongoDB Atlas URI
   - `DB_NAME` → `ai_counselling`
   - `JWT_SECRET` → any random long string (e.g. generate at https://generate-secret.vercel.app/32)
   - `RAZORPAY_KEY_ID` → your Razorpay key ID
   - `RAZORPAY_KEY_SECRET` → your Razorpay secret
   - `ANTHROPIC_API_KEY` → your Anthropic API key (for AI counselor)
5. Deploy → copy your Render URL (e.g. `https://ai-counselling-backend.onrender.com`)

> Note: Google OAuth (google-session route) uses Emergent's auth service and will not work outside Emergent. 
> The email/password login and all other features will work fine.

---

## Step 3: Frontend on Vercel
1. Go to https://vercel.com → Sign up with GitHub
2. New Project → Import your GitHub repo
3. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Create React App
   - **Build Command:** `npm run build` (auto-detected)
4. Add Environment Variables:
   - `REACT_APP_BACKEND_URL` → your Render backend URL (no trailing slash)
   - `REACT_APP_RAZORPAY_KEY_ID` → your Razorpay key ID
5. Deploy → your site is live!

---

## Notes
- Render free tier spins down after 15 min of inactivity (cold start ~30s). Upgrade to $7/mo to avoid this.
- MongoDB Atlas free tier is 512MB — more than enough for this app.
- Google Sign-In will not work (was tied to Emergent's OAuth). Email/password auth works fine.
- AI counselor now uses Claude (Anthropic) instead of Gemini.
