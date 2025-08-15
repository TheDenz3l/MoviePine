# Account & Settings Roadmap (Post Phase 1)

Phase 1 (DONE) delivered: Core auth (magic link), user settings storage, privacy gating for progress, device sessions + heartbeat, secure progress API via bearer token + (optional) RLS, change email/password forms, sign‑in UX & troubleshooting docs.

Below are proposed subsequent phases. Each task lists: (P#) = priority (1 highest), Effort ≈ (S/M/L), and Success Criteria.

---
## Phase 2 – Profile & UX Polish (Focus: identity, consistency, basic data integrity)
Goal: Let users personalize profile, smooth settings performance, enforce progress ownership, and improve session management UX.

1. Profile Editing (P1, M)
   - Add display name edit form (validate length 2–40, strip control chars).
   - Avatar upload (Radix Avatar + Supabase Storage bucket `avatars`).
   - Success: User can upload/replace avatar; immediate UI update; profile row `updated_at` changes.
2. Apply Theme/UI Settings Globally (P1, S)
   - Use `ui_json.theme` to set document class (`dark` / `light` / `system`).
   - Persist reduced motion preference.
   - Success: Refresh preserves theme; toggling updates immediately.
3. Settings Update Debounce (P2, S)
   - Debounce PUT calls (e.g., 500ms) & coalesce rapid changes.
   - Success: Single network call during rapid toggle spam.
4. Progress Tables RLS Enforcement (P1, S)
   - Uncomment & run RLS policies; backfill `user_id` if needed.
   - Add migration script to assert policies active (simple SELECT test).
   - Success: Unauthorized token returns 401/0 rows; authorized sees only own rows.
5. Legacy Anonymous Progress Migration (if applicable) (P2, M)
   - Script to map old anon IDs to new `user_id` post first sign-in (if mapping table exists).
   - Success: User sees previous progress after account creation.
6. Device Session UX Improvements (P3, S)
   - Highlight current session; confirm dialog before revoking current.
   - Handle revocation -> auto sign-out & notify.
   - Success: Revoking current triggers immediate logout + toast.
7. Enhanced Privacy Toggle Feedback (P3, S)
   - Visual indicator when progress tracking disabled (e.g., icon state). 
   - Success: Player UI clearly shows tracking paused.
8. Basic Favorites / Watchlist Schema Stub (P2, S)
   - Create tables (`user_favorites`, `user_watchlist`) with RLS; no UI yet.
   - Success: Insert/select via API test passes.
9. Error & Toast Feedback Layer (P2, S)
   - Minimal reusable hook for toasts (success/error) used in settings & security forms.
   - Success: Users get consistent notifications.

Exit Criteria: All P1 + at least 3 additional tasks (including RLS) shipped; no unauthenticated access to progress data; profile editable.

---
## Phase 3 – Content Personalization & Playback Enhancements
Goal: Increase stickiness via saved lists, better playback defaults, and enhanced subtitle & resume features.

1. Favorites UI Integration (P1, M)
2. Watchlist (queue) UI (P2, M)
3. Continue Watching Surface (P1, S) – derives from progress; show top 10.
4. Advanced Playback Settings (P2, M) – default quality, autoplay next episode, skip intros flag.
5. Subtitle Preferences (P2, S) – default language, font size/style stored in `subtitles_json`.
6. Experiments Flag Harness (P3, S) – read `experiments_json` + simple hook.
7. Recently Watched History (P3, M) – optional separate table with TTL / pruning.

Exit Criteria: Favorites + Continue Watching + at least one advanced playback control working.

---
## Phase 4 – Billing & Subscription Infrastructure
Goal: Introduce subscription gating groundwork (even if monetization later).

1. Stripe Integration Skeleton (P1, M)
   - Tables: `billing_customers`, `billing_subscriptions`.
   - Webhook endpoint verify signature; map customer -> user_id.
2. Pricing Page (P2, S) – placeholder tiers.
3. Client Hook `useSubscription()` (P2, S).
4. Feature Gating (P2, S) – example: HD streams if subscribed.
5. Invoicing / Portal Link (P3, S) – manage subscription via Stripe portal.

Exit Criteria: User can start test subscription in dev mode; gated feature toggleable via plan status.

---
## Phase 5 – Security & Reliability Hardening
Goal: Reduce attack surface, add observability, strengthen account integrity.

1. Rate Limiting Middleware (P1, M) – per IP+route (e.g., settings, auth actions).
2. Audit Log Table (P1, S) – store key events: login, email change, password change, session revoke.
3. Session Anomaly Detection (P2, M) – flag impossible travel (geo based on IP) -> optional email alert.
4. Email Verification Enforcement (P1, S) – block privileged actions if unverified.
5. Optional MFA (TOTP) Research / Spike (P3, L) – table + secret enrollment (defer if scope creep).
6. Automated Integration Tests (P1, M) – Playwright flows: sign-in, settings update, session revoke.
7. Load Test Script (P3, S) – k6 or autocannon for /api/progress & settings throughput.

Exit Criteria: Rate limiting active; audit logs capture core events; integration tests pass in CI.

---
## Phase 6 – Admin, Analytics & Growth
Goal: Provide admin oversight & levers for experimentation & support.

1. Admin Role & RLS Extensions (P1, S) – grant extra policies for selective read.
2. Admin Dashboard (P2, M) – basic metrics: active users, sessions count, top favorites.
3. Feature Flag Console (P2, M) – edit `experiments_json` per user / cohort.
4. Support Impersonation (P3, M) – secure flow (requires explicit audit log + time-bounded). 
5. Analytics Event Stream (P3, L) – possibly export to external warehouse later.

Exit Criteria: Admin can view key metrics & toggle a feature flag.

---
## Cross-Cutting Utilities & Improvements
(Implement opportunistically across phases.)

- Shared Zod Schemas for API Validation.
- Central Error Normalizer (map Supabase errors => user-friendly messages).
- Logging Abstraction (client + server with sampling in production).
- Telemetry: capture latency for settings PUT & progress POST.
- Accessibility Pass: ensure forms & toggles have labels, focus states.
- Internationalization (i18n) groundwork (if multi-locale planned).

---
## Risk & Dependency Notes
- Stripe (Phase 4) depends on stable user identity (Phase 2).
- RLS for progress (Phase 2) must precede favorites/watchlist (Phase 3) to avoid repeating security debt.
- MFA depends on email verification enforcement groundwork.

---
## Suggested Implementation Order (High-Level)
1. Phase 2 P1 items (Profile editing, Theme, RLS enforcement). 
2. Debounce + Device session improvements.
3. Phase 3 personalization basics (Favorites + Continue Watching).
4. Billing skeleton (Stripe) if monetization next quarter; else security hardening first.
5. Security Phase core (Rate limiting, Audit logs, Tests).
6. Admin & Flags.

---
## Quick Command Cheatsheet (Local)
(Assumes Supabase SQL already applied.)

Re-run Phase 1 SQL (idempotent):
psql $SUPABASE_DB_URL -f supabase_schema_phase1.sql

Apply progress RLS (example):
-- Uncomment in SQL file then run; verify with a restricted select test.

List user sessions (psql):
select id, device_label, last_seen_at from public.user_sessions where user_id = '<uuid>';

---
## Tracking Format Example
You can track completion inline (replace [ ] with [x]) as you ship:
- [ ] Phase 2: Profile Editing
- [ ] Phase 2: Theme Application
- ...

---
## Next Immediate Action Recommendation
Start Phase 2 with: (a) profile edit form + avatar storage bucket; (b) theme application; (c) enable RLS on progress tables.

Let me know when you want scaffolding for the profile edit UI or Stripe skeleton and I’ll implement it.
