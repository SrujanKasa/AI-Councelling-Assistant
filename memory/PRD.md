# PRD - Hynexs Edu Counseller
**Last Updated:** Feb 2026

## Problem Statement
AI-powered college counseling and rank prediction platform for:
- TS EAMCET (Telangana Engineering)
- JoSAA (JEE Main → NITs/IIITs/GFTIs + JEE Advanced → IITs)

**Monetization:** Strict paywall — ₹50 one-time payment. No free tier. Without payment NO access is granted beyond `/auth` and `/upgrade` screens.

## Architecture
- **Frontend:** React + Tailwind + Shadcn + Recharts + React Router
- **Backend:** FastAPI + MongoDB (Motor async)
- **AI:** Gemini Flash (Emergent LLM Key) for AI Insights + Counselor chat
- **Payments:** Razorpay (test keys configured in `/app/backend/.env`)
- **Email:** Resend (post-payment confirmation + WhatsApp join link)
- **Auth:** JWT Bearer (email/password) + Emergent-managed Google OAuth

## Data
- JoSAA cutoffs: 189,407 records (2023–2025)
- TS EAMCET cutoffs: 52,835 records (2023–2025)

## What's Implemented

### Backend
- [x] JWT Auth (register, login, /me, logout)
- [x] Google OAuth via `/api/auth/google-session` (Emergent-managed)
- [x] Predictions: TS EAMCET, JEE Main, JEE Advanced (Safe/Target/Dream classification)
- [x] AI Insights (Gemini Flash, markdown)
- [x] AI Counselor chat (Gemini Flash, conversation history)
- [x] Razorpay create-order + verify (₹50 = 5000 paise)
- [x] Resend confirmation email with WhatsApp join link
- [x] Cutoff Trend endpoint `/api/predictions/trend` — 2023–2025 data + 2026 linear projection
- [x] Admin endpoints (stats, users, payments, predictions)
- [x] CSV auto-seeding on startup

### Frontend
- [x] Landing page (Hero, Features, How It Works, ₹50-only Pricing, FAQ)
- [x] Auth page with email/password + "Continue with Google" button
- [x] Google OAuth callback handler in AuthContext (processes `#session_id=` hash)
- [x] **PREMIUM GATE:** ProtectedRoute with `premiumRequired` — non-premium users auto-redirect to `/upgrade`
- [x] `/upgrade` page: full-screen paywall with feature list, ₹50 CTA, Razorpay checkout, post-pay WhatsApp CTA
- [x] Dashboard: prediction form, College Cards grid, AI Insight panel
- [x] **TrendModal** wired to College Cards: click any card → opens modal with 2023–2025 bar+line chart, 3 year-cards with deltas, 2026 AI projection, trend badge (Easier/Tougher/Stable), "How to Read" explainer
- [x] Sparkline component (unused on cards but available)
- [x] AI Counselor chat page (markdown rendering, starter prompts)
- [x] Admin panel
- [x] **Removed "Made with Emergent" branding** (badge hidden, title = "Hynexs Edu Counseller | AI College Rank Predictor", CSS safety rule)
- [x] Payment success modal with WhatsApp community CTA

## Routing & Access Control
| Route | Access |
|-------|--------|
| `/` | Public |
| `/auth` | Public |
| `/upgrade` | Logged-in users only |
| `/dashboard` | Premium users + admins only |
| `/counselor` | Premium users + admins only |
| `/admin` | Admins only |

## Test Credentials (see `/app/memory/test_credentials.md`)
- Admin: `admin@hynexsedu.com` / `Admin@123` (premium=true)
- Test user: `testuser@hynexsedu.com` / `Test@123` (premium=false → goes to /upgrade)

## Backlog
### P1
- [ ] Apply premium gate to `/saved` and `/reports` sub-views (currently inside dashboard)
- [ ] Saved colleges bookmark feature (frontend list exists, backend pending)
- [ ] PDF report generation & download
- [ ] Better filtering (preferred branch, location)
- [ ] Show more than 10 predictions per category

### P2
- [ ] Admin PDF upload pipeline (OCR + RAG) for unstructured cutoff data
- [ ] Historical placement data
- [ ] CSAB / Special Round predictions
- [ ] Voice AI Counselor
