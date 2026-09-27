# Engineering Completion Loop
### A repeatable Definition-of-Done cycle every feature/PR goes through before it counts as "complete"

Given the bar set for this product (p99 latency, real security, real sync, four platforms), "it works on my machine" cannot be the standard. This loop is what every engineer — including a solo founder acting as their own engineer — runs for **every feature**, not just at the end of the project.

---

## The Loop (run per feature/PR)

```
 ┌─────────────┐
 │  1. SPEC    │  What exactly is "done"? Written before code.
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │  2. BUILD   │  Implement against the spec, not around it.
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │  3. TEST    │  Unit + integration + the specific NFR it touches.
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ 4. SECURITY │  RLS/auth/input-validation check for this change.
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ 5. PERF     │  Does this change risk p99? Measure, don't assume.
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ 6. REVIEW   │  Self-review against this checklist, or peer review.
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ 7. DEPLOY   │  Staging → smoke test → production.
 └──────┬──────┘
        ▼
 ┌─────────────┐
 │ 8. MONITOR  │  Watch real metrics for 24-48h post-deploy.
 └──────┬──────┘
        │
        └──────────► back to step 1 for the next feature
```

Nothing is "done" until it has gone all the way around. A feature that's built and tested but never security-checked or perf-checked is not done — it's a liability waiting to surface.

---

## Definition-of-Done Checklist (applies to every PR)

### Correctness
- [ ] Meets the written spec/acceptance criteria exactly — no silent scope drift
- [ ] Handles the past-only date rule correctly if the feature touches dates (checked at UI + API + DB layers where relevant)
- [ ] Unit tests written for new logic; integration test for the end-to-end flow if it crosses frontend/backend

### UI Consistency (shadcn)
- [ ] No raw `<button>`, `<input>`, or ad-hoc styled element outside `components/ui/` shadcn primitives
- [ ] No hardcoded hex colors or one-off `rounded-`/`shadow-` values outside the theme tokens defined in `06-UI-DESIGN-SYSTEM-SHADCN.md`
- [ ] New screens/components checked against the same doc's anti-generic-design table before merging

### Security
- [ ] Every new/changed API endpoint has Zod (or equivalent) input validation
- [ ] Every new DB table/column change has a corresponding RLS policy reviewed (not just "default deny," actually tested with a second test user)
- [ ] No secrets, keys, or credentials introduced into client-bundled code
- [ ] Rate limiting applies to any new mutating endpoint
- [ ] If the change touches auth/session logic: reviewed against token expiry and refresh-rotation behavior

### Performance
- [ ] New/changed API endpoint measured for p50/p95/p99 under a realistic sample load, not just a single manual request
- [ ] No N+1 queries introduced (checked via query logging/explain plan on anything touching the DB)
- [ ] New client-side code doesn't block first paint or interaction (checked via Lighthouse/Web Vitals on the affected page)
- [ ] Caching implications considered: does this change need a cache-invalidation hook? Is it missing one?

### Offline/Sync (if the feature touches data that syncs)
- [ ] Feature works correctly when created offline and synced later (manually tested: airplane mode → action → reconnect)
- [ ] Conflict scenario tested: same record edited on two devices before sync — resolves without silent data loss

### Cross-Platform
- [ ] Verified on at least: one mobile viewport, one desktop viewport, dark mode, light mode
- [ ] If UI-facing: verified inside the Capacitor-wrapped shell at least once per release cycle (not just in a desktop browser pretending to be mobile)
- [ ] Touch targets ≥ 44px on any new interactive mobile element

### Observability
- [ ] New failure modes introduced by this change are visible in Sentry (errors) and the metrics dashboard (latency), not silent
- [ ] Meaningful log statements added at key decision points (not noisy, not silent)

### Review & Deploy
- [ ] Code reviewed (self-review checklist minimum; peer review if a second engineer exists)
- [ ] Deployed to staging first, smoke-tested against the exact acceptance criteria from Step 1
- [ ] Rollback path confirmed before production deploy (can this be reverted in under 5 minutes if it misbehaves?)

### Post-Deploy
- [ ] p99 latency and error rate watched for 24-48h after release
- [ ] If any metric regressed, a decision is made explicitly (revert vs. hotfix vs. accept) — not left ambiguous

---

## Release-Level Gate (before any version is called "launched," not just "merged")

Beyond the per-feature loop, before a Phase (see Phase Plan doc) is marked complete:

1. **Load test report exists** for anything claiming a latency NFR — a claim without a measurement doesn't count.
2. **Cross-user data isolation test suite passes** — an automated test that logs in as User A and attempts to read/write User B's data, and confirms it's rejected at the DB layer.
3. **Full offline → reconnect → sync cycle tested on a real device**, not just in dev tools' network throttling.
4. **All four platform builds (web, Android, iOS, desktop) pass the same core smoke test** on that release.
5. **Backup restore drill performed** at least once before calling the product "launched" — not just confirmed that backups exist, but that a restore actually produces working data.

---

## Why this loop exists

Raw feature velocity without this loop produces a product that *looks* done in a demo and fails under real usage — the exact gap between "the export button works" and "the export button works at p99 under load, cannot leak another user's PDF, and still works when the wifi drops mid-generation." This loop is the mechanism that closes that gap on every single change, not just at the end.