# Tech Stack Details

This upgrades the original stack (React + Express/Nest + Supabase) to actually meet the new bar: **PWA + Android + iOS + Desktop, real-time sync, p99 latency targets, strong security, proper caching.** Where a choice changes from what was originally discussed, the reasoning is stated explicitly — nothing is swapped silently.

---

## 1. Guiding Principle: One Codebase, Four Surfaces

Rather than building separate native apps, we build **one responsive web app** and wrap it:

| Surface | How it's produced | Extra native code needed |
|---|---|---|
| Web / PWA | React app, installable | None |
| Android | Capacitor wraps the same web build | Minimal (native shell config only) |
| iOS | Capacitor wraps the same web build | Minimal (native shell config only) |
| Desktop (Win/Mac/Linux) | Tauri wraps the same web build | Minimal (Rust shell config only) |

**Why Capacitor over React Native:** React Native means a second, parallel UI codebase (different components, different styling system) — roughly double the ongoing engineering cost. Capacitor takes the exact same React app you already built and gives it native device APIs (camera, filesystem, push, biometrics) plus an App Store/Play Store-installable shell. For a CRUD + export tool like this, native-feel performance from a well-built PWA is indistinguishable to the user, and Capacitor is the industry-standard path (used by companies like Ionic, and widely in production apps).

**Why Tauri over Electron for desktop:** Tauri uses the OS's native webview instead of bundling Chromium, producing an app that is ~10-20x smaller and meaningfully faster to start, with a smaller attack surface (Rust core, stricter default permissions). Electron is only preferable if you need deep Node.js integration on desktop, which this product does not.

---

## 2. Frontend

| Layer | Choice | Why |
|---|---|---|
| Framework | **React 18 + Vite** | Fast dev/build, matches original ask |
| Language | **TypeScript** | Given security + p99 + multi-platform requirements, type safety catches a large class of bugs before they reach production — non-negotiable at this ambition level |
| Styling | **Tailwind CSS** | Fast, consistent, small production CSS footprint |
| State/data | **TanStack Query (React Query)** + local IndexedDB cache | Handles server-state caching, background refetch, optimistic updates — directly supports the "blink fast" and offline requirements |
| Offline storage | **IndexedDB via Dexie.js** | Structured, queryable local database in the browser; source of truth for instant UI, reconciled with server |
| PWA tooling | **Vite PWA plugin (Workbox)** | Generates the service worker, handles caching strategies and offline asset availability |
| Forms/validation | **Zod + React Hook Form** | Shared validation schema reused on both client and server (single source of truth for "is this a valid past date") |
| Native shell (mobile) | **Capacitor** | See above |
| Native shell (desktop) | **Tauri** | See above |

---

## 3. Backend

| Layer | Choice | Why |
|---|---|---|
| Runtime/framework | **Fastify** (Node.js + TypeScript) | You asked for "Nest or Express, whichever is fast and easy." Given the explicit **p99 latency requirement**, Fastify is the better call: it consistently benchmarks 2-3x higher throughput than Express with lower overhead, while staying just as easy to write as Express (similar route/middleware model). Nest is excellent for large multi-team codebases but adds architectural overhead (DI, decorators, modules) this project doesn't need yet. If the team later needs Nest's structure, migrating from Fastify is straightforward. |
| Validation | **Zod** (shared with frontend) | One schema, enforced identically client and server side |
| API style | **REST** (OpenAPI-documented) | Simple, cacheable, debuggable; GraphQL adds complexity this app's shape doesn't need |
| Realtime sync | **Supabase Realtime** (Postgres logical replication → WebSocket) | Pushes DB changes to all connected clients instantly — the mechanism behind "super sync" |
| Background jobs (export generation for large batches) | **BullMQ + Redis** | Keeps large exports off the request/response critical path, protecting p99 |

---

## 4. Database, Auth & Realtime (revised — Supabase removed)

**Why the change:** Supabase's free tier pauses inactive projects and its paid tier adds real monthly cost before you have revenue — not worth it for this stage. The fix is not "drop security," it's "replace each piece Supabase gave us for free with an equivalent free/self-hosted piece, explicitly."

| Layer | Choice | Why |
|---|---|---|
| Database | **Postgres via Neon** (serverless Postgres, generous free tier, no pause-on-idle surprise like Supabase's) | Same Postgres you'd get from Supabase, just the DB alone — no bundled/forced services, no lock-in |
| ORM | **Drizzle ORM** (TypeScript-native, lightweight, fast) | Type-safe queries shared between API and migrations; alternative: Prisma if the team prefers its DX, but Drizzle has less runtime overhead — relevant to the p99 target |
| Auth | **better-auth** (open-source, self-hosted, Postgres-native) | Free, no vendor dependency. Handles session/JWT issuance, password hashing, OAuth (Google, etc.), and refresh-token rotation — the same job Supabase Auth did, just not owned by Supabase |
| **Authorization (replaces RLS)** | **Mandatory `user_id` scoping enforced at the query layer, in one shared data-access module** | This is the important trade-off to be explicit about: plain Postgres has no automatic Row-Level Security. Every single query that touches `titles` or `subtasks` **must** go through one shared repository function that injects `WHERE user_id = :currentUser` — never a raw query written ad hoc in a route handler. This is enforced by code review + an automated test suite (see Engineering Completion Loop) that logs in as User A and tries to read/write User B's data via the API, confirming it's rejected every time. Postgres Row-Level Security is *also* still available as a defense-in-depth option even without Supabase (RLS is a native Postgres feature) — recommended as a belt-and-suspenders addition once Phase 1 is stable, not a replacement for the query-layer discipline above. |
| Realtime sync (replaces Supabase Realtime) | **WebSockets via Fastify's `@fastify/websocket`**, or Postgres `LISTEN/NOTIFY` bridged to connected clients | Same effect (push DB changes to open clients instantly) without Supabase's managed realtime service |
| File storage (future) | **Cloudflare R2** (S3-compatible, free egress, cheap storage) | Free-tier friendly, no vendor lock to Supabase Storage |
| Connection pooling | **Neon's built-in pooler** (or PgBouncer if self-hosting Postgres elsewhere) | Prevents connection exhaustion under load, protects p99 under concurrent traffic |

**Net effect:** same capabilities (auth, real-time sync, secure per-user data), zero forced vendor billing, and the security model is arguably *stronger* now because it's explicit and tested rather than "trust the platform's RLS toggle."

---

## 5. Caching & Performance Layer

| Layer | Choice | Why |
|---|---|---|
| Edge/CDN | **Cloudflare** (in front of frontend + API) | Serves static assets from edge locations near the user; can cache safe GET API responses at the edge with short TTL + stale-while-revalidate |
| Server-side cache | **Redis (Upstash, serverless-friendly)** | Caches hot, low-churn reads (e.g., list of Titles) with sub-millisecond reads; invalidated explicitly on writes |
| Client cache | **TanStack Query + IndexedDB** (see Frontend) | Removes network round-trips from the perceived-latency path entirely for repeat views |
| Asset caching | **Immutable, content-hashed filenames** with far-future cache headers | Browser never re-downloads unchanged assets |

**Caching rule of thumb enforced across the stack:** cache aggressively for reads, invalidate precisely on writes, never cache anything containing another user's data at a shared layer (CDN cache keys always include the authenticated user scope or are limited to genuinely public assets).

---

## 6. Observability & Reliability (required to *prove* p99, not just hope for it)

| Concern | Choice |
|---|---|
| Error tracking | **Sentry** (frontend + backend) |
| Latency/metrics (p50/p95/p99 dashboards) | **Axiom** or **Better Stack** (lightweight, fast to set up) — alternative: self-hosted Grafana + Prometheus if the team wants full control later |
| Uptime monitoring | **Better Stack Uptime** or **UptimeRobot** |
| Structured logging | **Pino** (pairs natively with Fastify, extremely low overhead — won't itself become a latency source) |

---

## 7. Security Stack (concrete tools, not just principles)

| Concern | Tool/Approach |
|---|---|
| Transport security | TLS everywhere (Cloudflare-terminated), HSTS |
| AuthN | **better-auth** (JWT/session, password hashing, OAuth) |
| AuthZ | Mandatory `user_id`-scoped queries in the shared data-access layer (see Section 4), optionally backed by native Postgres RLS as defense-in-depth |
| Rate limiting | `@fastify/rate-limit` backed by Redis |
| Input validation | Zod schemas on every endpoint, reject-by-default |
| Security headers | `@fastify/helmet` |
| Dependency scanning | GitHub Dependabot + `npm audit` gated in CI |
| Secrets management | Environment variables via hosting provider's secret store; never committed, never in client bundles |
| Audit logging | Dedicated `audit_log` table for destructive actions, written via DB trigger (cannot be bypassed by application code) |

---

## 8. Hosting & Deployment

| Layer | Choice | Why |
|---|---|---|
| Frontend (PWA) | **Cloudflare Pages** or **Vercel** | Global edge distribution, near-instant deploys, built-in CDN |
| Backend API | **Fly.io** or **Railway** | Deploys close to users, supports multi-region for latency-sensitive p99 targets, simple scaling |
| Database | **Neon (serverless Postgres)** | Automatic backups, point-in-time recovery, generous free tier without the pause/spin-down behavior that's been causing issues on Supabase |
| CI/CD | **GitHub Actions** | Lint → type-check → test → security scan → build → deploy, gated pipeline |
| Mobile builds | **Capacitor + EAS-style CI (Fastlane or Capacitor CLI in GitHub Actions)** | Automated App Store/Play Store build pipeline |
| Desktop builds | **Tauri's GitHub Actions bundler action** | Automated Win/Mac/Linux installers on each release tag |

---

## 9. Summary Table: What Changed from the Original Ask, and Why

| Original | Upgraded to | Reason |
|---|---|---|
| Express or Nest | Fastify | Explicit p99 requirement; Fastify is faster than Express, simpler than Nest |
| (no offline mention) | IndexedDB + Workbox service worker | Required for PWA + offline sync |
| (no mobile/desktop mention) | Capacitor (mobile) + Tauri (desktop) | Required for Android/iOS/Desktop from one codebase |
| (no caching mention) | Cloudflare CDN + Redis + TanStack Query | Required for "blink fast" + proper caching |
| (no observability mention) | Sentry + Axiom/Better Stack + Pino | Required to actually measure and enforce p99, not just claim it |
| Supabase (DB+Auth+Realtime bundled) | **Neon Postgres + better-auth + Fastify WebSockets**, each standalone | Supabase's free tier pausing/costs were actively causing problems; unbundling gives the same capabilities with no forced vendor billing and no single point of platform risk |
| (app shipped with no login) | **better-auth wired in from Phase 1**, not deferred | The current build opening with no authentication is a Phase 0/1 gap, not a later nice-to-have — every user's data must be scoped from day one |