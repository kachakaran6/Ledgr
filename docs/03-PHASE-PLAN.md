# Phase Plan

Each phase has a clear exit criterion — you don't move on until it's genuinely done, not just "mostly working." Phases 0-3 produce a usable web product. Phases 4-6 add the platform/performance/security ambitions. Phase 7 is launch.

---

## Phase 0 — Foundation & Setup
**Goal:** Empty-but-correct skeleton, so every later phase builds on solid ground.

- Monorepo setup (e.g., pnpm workspaces): `/apps/web`, `/apps/api`, `/packages/shared` (shared Zod schemas/types)
- Supabase project created; Postgres schema drafted: `titles`, `subtasks`, `users` (managed by Supabase Auth)
- RLS policies written and tested from day one (not bolted on later)
- CI pipeline: lint, type-check, test — running on every PR before any feature work begins
- Base Fastify server with health-check endpoint, deployed to staging
- Base React + Vite app, deployed to staging, talking to the health-check endpoint

**Exit criteria:** A deployed "hello world" full-stack app, with CI green, and RLS proven to block cross-user reads in a test.

---

## Phase 1 — Core MVP: Titles, Sub-tasks, Past-Only Rule
**Goal:** The actual core loop works end to end for one user, on web.

- Auth: sign up / log in / log out (Supabase Auth)
- CRUD for Titles
- CRUD for Sub-tasks, with the past-only date rule enforced at UI + API + DB (all three, tested)
- Today/Yesterday quick-entry buttons
- Basic list view: Titles expandable to show Sub-tasks

**Exit criteria:** A real user can sign up, create "Garage," log "Repaired brake — today" and "Repaired tyre — yesterday," and see them listed. Attempting a future date fails at every layer (three separate automated tests prove this).

---

## Phase 2 — Search, Filter, and URL State
**Goal:** Finding past work is as easy as logging it.

- Full-text search (title + description)
- Date range filters (presets + custom range)
- Title filter, combinable with search and date range
- Filters reflected in URL query params (shareable/bookmarkable)
- Live result count

**Exit criteria:** Combined filter ("Garage" + "last 7 days" + "tyre") returns correct results in under 150ms on a seeded dataset of 5,000+ Sub-tasks.

---

## Phase 3 — Export Engine
**Goal:** Selected data becomes a real, professional document.

- Checkbox selection (single, multiple, "select all filtered")
- PDF export (grouped by Title, clean header, generated timestamp)
- Excel (.xlsx) export
- CSV export
- Export respects current filter + selection exactly
- Large-export handling via background job (BullMQ) so nothing blocks the UI thread or the API's p99

**Exit criteria:** Exporting 5,000 filtered rows to PDF and XLSX completes and downloads in under 3 seconds (p99), verified under load testing, not just on a dev machine.

> **At the end of Phase 3, you have a complete, usable web product.** Phases 4+ are about reach (other platforms) and rigor (performance/security at scale).

---

## Phase 4 — PWA & Offline-First Sync
**Goal:** Installable, works with no connection, syncs seamlessly across devices.

- Service worker via Workbox (Vite PWA plugin): app shell cached, offline fallback page
- IndexedDB (Dexie) as local source of truth; UI reads/writes here first (optimistic UI)
- Background sync queue: offline writes queued and flushed to server on reconnect
- Supabase Realtime subscription: server-side changes pushed to all open clients live
- Conflict resolution strategy implemented and tested (last-write-wins keyed on `updated_at`, with a visible "this was updated elsewhere" notice on true conflicts)
- Web App Manifest (icons, splash screens, install prompts) for Add-to-Home-Screen / desktop install

**Exit criteria:** Turn off Wi-Fi, log three Sub-tasks, turn Wi-Fi back on — all three appear on a second device within 3 seconds with zero data loss. App is installable on Android Chrome, iOS Safari, and desktop Chrome/Edge.

---

## Phase 5 — Native Wrapping: Android, iOS, Desktop
**Goal:** Store-installable apps from the existing codebase, not a rewrite.

- Capacitor integration: wrap the PWA build for Android and iOS
- Native permissions/config (app icons, splash screens, status bar theming per platform)
- Android: signed build, Play Store listing draft, internal testing track
- iOS: signed build via Xcode/Fastlane, TestFlight distribution
- Tauri integration: wrap the same web build for Windows/Mac/Linux desktop
- Auto-update mechanism for desktop builds (Tauri updater)

**Exit criteria:** Installable Android APK/AAB, iOS TestFlight build, and desktop installers for all three OSes, all pointing at the same backend, all passing the same core-flow smoke test.

---

## Phase 6 — Performance, Caching & Security Hardening
**Goal:** Move from "works" to "provably meets the stated NFRs at scale."

- Load testing (k6 or similar) simulating realistic concurrent users; tune until API p99 < 500ms (reads) / 800ms (writes) under load
- Redis caching layer implemented for hot read paths; cache-hit ratio monitored
- Cloudflare CDN configured for static assets + safe cacheable API responses
- Full security pass: rate limiting verified, Zod validation audited on every endpoint, dependency scan clean, RLS policies re-audited by attempting cross-user access in an automated test suite
- Observability wired up: Sentry catching real errors, Axiom/Better Stack dashboards showing live p50/p95/p99
- Penetration-style self-test: attempt to read another test user's data via direct API calls, confirm it's impossible

**Exit criteria:** A public load-test report showing p99 targets met under realistic concurrent load, and a security checklist (see Engineering Completion doc) fully signed off.

---

## Phase 7 — Launch Readiness
**Goal:** Ship it, and be able to see what happens after.

- Final cross-device sync test across all four surfaces simultaneously (web, Android, iOS, desktop) editing the same account
- Backup/restore drill on the database (prove a restore actually works, not just that backups exist)
- Rollback plan documented and tested for the deploy pipeline
- Store listings finalized (Play Store, App Store) with review guidelines compliance checked
- Post-launch monitoring dashboard reviewed daily for the first two weeks

**Exit criteria:** Product live on web, Play Store (or internal track), TestFlight/App Store, and as downloadable desktop installers, with monitoring actively watched.

---

## Suggested Sequencing Note

Phases 0-3 are the fastest path to something real and demoable — if timeline pressure hits, that's the cut line for a "v1 web-only" launch, with Phases 4-6 following as a v1.1/v2. This keeps the past-only work-log core value shipping fast, while the cross-platform/performance ambitions are layered in deliberately rather than attempted all at once.
