# PRD - Hynexs Edu Counseller
**Last Updated:** May 2025

## Problem Statement
Build a production-ready AI-powered college counseling and rank prediction platform for:
- TS EAMCET (Telangana Engineering)
- JoSAA (JEE Main + JEE Advanced)

## Architecture
- **Frontend:** React + Tailwind CSS + React Router
- **Backend:** FastAPI + MongoDB (Motor async)
- **AI:** Gemini 3 Flash (Emergent LLM Key) for AI counseling + predictions
- **Payments:** Razorpay (₹50 one-time)
- **Email:** Resend (transactional)
- **Auth:** JWT Bearer tokens via localStorage

## Data
- JoSAA cutoffs: 189,407 records (2023-2025) — IITs, NITs, IIITs, GFTIs
- TS EAMCET cutoffs: 52,835 records (2023-2025) — 341 Telangana colleges

## What's Implemented (MVP)

### Backend
- [x] Auth: Email/Password JWT (register, login, me, logout) — Bearer token only
- [x] Predictions: TS EAMCET, JEE Main (NITs/IIITs), JEE Advanced (IITs)
- [x] Prediction engine: Safe/Target/Dream classification + probability scoring
- [x] AI Insight: Gemini Flash generates personalized counseling advice per prediction
- [x] AI Counselor: Chat endpoint with conversation history (Gemini Flash) + markdown
- [x] Razorpay: Create order + verify payment (₹50 one-time)
- [x] Resend email: Auto-send after payment
- [x] Admin: Stats, users, payments, predictions
- [x] Data seeding: CSV auto-loaded on startup

### Frontend
- [x] Landing page: Hero, Trust, How It Works, Features, Live Demo (card-style), Pricing (single ₹50), Testimonials, FAQ, Footer
- [x] Pricing: Single ₹50 "Full Access Plan" card — no free tier
- [x] College cards: Beautiful card grid (3 cols) with Safe/Target/Dream sections
- [x] Card design: Badge, % chance, college name, branch, probability bar, cutoff rank, type, year, fees
- [x] Paywall: Blurred card preview for non-premium with ₹50 CTA
- [x] Auth: Login/Register with form validation
- [x] Dashboard: Prediction form with 3 exam types, CRL rank labels
- [x] AI Insight panel: Gemini AI badge, proper markdown rendering
- [x] AI Counselor: Chat interface with markdown rendering, starter prompts
- [x] Admin panel: Overview stats, users table, payments table, predictions table

## Prioritized Backlog

### P0 - Critical (Done)
- ✅ Auth flow (login/register)
- ✅ Prediction engine for all 3 exam types
- ✅ AI counseling insight
- ✅ Payment integration

### P1 - Important
- [ ] Google OAuth integration
- [ ] Better filtering (preferred branches, location)
- [ ] More prediction results (currently limited to 10 per type)
- [ ] Saved colleges (bookmark feature)
- [ ] PDF report generation and download
- [ ] WhatsApp Business API integration (currently just shows link)

### P2 - Nice to Have
- [ ] TS EAMCET Phase 2 / Phase 3 cutoff data
- [ ] Historical rank vs cutoff charts (visualization)
- [ ] College ranking and placement data
- [ ] Voice AI counselor (Vapi integration)
- [ ] CSAB/Special Round predictions
- [ ] Branch-wise comparison tool

## Next Tasks
1. Add Google OAuth (Emergent-managed)
2. Implement saved colleges feature
3. Add PDF report generation
4. Add more filtering options (preferred location, branches)
5. Improve prediction count (show more colleges per type)
