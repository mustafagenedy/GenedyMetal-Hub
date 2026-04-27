# Launch runbook

Follow this top-to-bottom the first time. Each step ends with a verifiable check.

---

## Prerequisite: rotate the leaked JWT secret

The original commit `9c134e6` contains `JWT_SECRET = "MostafaGenidyMohamed"` hardcoded in source. The current code reads from env, but the old secret is permanently in git history. **Treat it as compromised.** Generate a fresh secret before deploying:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Save the output for step 4 (Render). If the GitHub repo has ever been public, you should also rewrite history with `git filter-repo` to remove the old secret — but practically, any token signed with it is invalidated by the new secret anyway, and the old string is meaningless without your DB access.

---

## Step 1 — Repo hygiene (~5 min)

`git status` currently shows ~2,000 modified files inside `Backend/node_modules/` because that directory was accidentally committed in the initial commit. Untrack it:

```bash
cd "GenedyMetal Hub"
git rm -r --cached Backend/node_modules            # removes from git, keeps on disk
git add .gitignore Backend/.gitignore
git add .                                          # picks up Phases 1–3.5 changes
git status                                         # sanity check — should NOT show node_modules now
git commit -m "Phase 1–3.5: design polish, security hardening, cookie auth, UX polish"
git push origin main
```

**Check:** `git ls-files | wc -l` drops from ~2,100 to ~80. CI runs on the push (Actions tab on GitHub).

---

## Step 2 — Branch protection on `main` (~3 min)

GitHub → repo → **Settings → Branches → Add branch protection rule**:

- Branch name pattern: `main`
- ☑ Require a pull request before merging
  - ☑ Require approvals: **1**
- ☑ Require status checks to pass before merging
  - Required: `Backend — install, syntax check, audit`, `Frontend — syntax check`
- ☑ Require conversation resolution before merging
- ☑ Do not allow bypassing the above settings

**Check:** push directly to `main` → rejected.

---

## Step 3 — MongoDB Atlas (~10 min)

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) (free M0 tier is fine for launch).
2. Create a cluster, then a database called `genedy_metal`.
3. **Database Access** → add user `genedy_app` with a strong password. Role: **Read and write to any database**.
4. **Network Access** → add `0.0.0.0/0` (Render's IPs aren't fixed; lock this down later via [Render Static Outbound IPs](https://render.com/docs/static-outbound-ip-addresses) on a paid plan).
5. **Connect → Drivers → Node.js** → copy the connection string. Looks like:
   ```
   mongodb+srv://genedy_app:PASSWORD@cluster0.xxxxx.mongodb.net/genedy_metal?retryWrites=true&w=majority
   ```

**Check:** locally, drop that URI into `Backend/.env` as `MONGODB_URI`, run `npm run dev`. Server logs `[db] connected`.

---

## Step 4 — Render backend (~10 min)

1. Sign in at [dashboard.render.com](https://dashboard.render.com) with GitHub.
2. **New → Blueprint** → connect the `GenedyMetal-Hub` repo.
3. Render reads `render.yaml` and proposes one service (`genedy-metal-api`). Confirm.
4. Fill the three secret env vars Render flagged (they're `sync: false` in the blueprint):
   - `MONGODB_URI` — from step 3
   - `JWT_SECRET` — fresh value from the prerequisite
   - `CORS_ORIGINS` — leave as `https://your-vercel-url.vercel.app` for now (you'll update after step 5; comma-separated if multiple domains)
5. Click **Create**. Render builds (`npm ci`) and boots (`npm start`). First boot takes ~2 minutes.
6. Copy the deployed URL from the Render dashboard. Looks like `https://genedy-metal-api.onrender.com`.

**Check:** `curl https://genedy-metal-api.onrender.com/health` returns `{"success":true,"status":"OK",...}`.

---

## Step 5 — Vercel frontend (~5 min)

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project** → import `GenedyMetal-Hub`.
3. Framework preset: **Other**. Output directory: `Frontend`. Build command: leave blank (the `vercel.json` overrides it).
4. Before deploying, **edit `vercel.json` in the repo** — replace `REPLACE-WITH-RENDER-URL.onrender.com` with the URL from step 4. Push:
   ```bash
   git commit -am "vercel: point /api rewrite at Render"
   git push
   ```
5. Vercel auto-deploys on the push. First build takes ~30 seconds.

**Check:** open the Vercel URL → main page loads. Open dev tools → Network → submit the contact form on `main.html#contact` → request goes to `/api/messages`, returns 201, no CORS errors in console.

---

## Step 6 — Wire CORS to your real Vercel domain

Back in Render → **Environment** → set `CORS_ORIGINS` to the Vercel domain you'll actually use:

```
CORS_ORIGINS=https://genedymetal-hub.vercel.app,https://genedymetal.com,https://www.genedymetal.com
```

(List every origin that should be allowed. Trigger **Manual Deploy** to apply.)

**Check:** sign up a test user from the deployed Vercel site. `Set-Cookie` for `gm-token` and `gm-csrf` is visible in dev tools. Sign-in works on the next page load with no console errors.

---

## Step 7 — Custom domain + TLS (when ready)

### DNS (at your registrar)

If you own `genedymetal.com`:

| Type  | Host | Value                         | Notes                       |
|-------|------|-------------------------------|-----------------------------|
| A     | `@`  | `76.76.21.21`                 | Vercel (apex)               |
| CNAME | `www`| `cname.vercel-dns.com.`       | Vercel (www)                |

Vercel issues a Let's Encrypt cert automatically; renewal is automatic.

### Tighten things only after HTTPS is stable

- **HSTS** — once you've confirmed every page works on `https://`, add a `Strict-Transport-Security` header to `vercel.json` and submit to [hstspreload.org](https://hstspreload.org/). Don't do this on day 1 — if anything is broken on HTTPS, HSTS makes the bug irreversible for the cache window.
- **Render custom domain** — only needed if you'd rather expose the API directly at `api.genedymetal.com` than route everything through Vercel's `/api` rewrite. The rewrite pattern works fine without it.

---

## Step 8 — Observability (~10 min, optional but strongly recommended)

| Layer            | Tool (free tier)                                            | What it gives you |
|------------------|-------------------------------------------------------------|--------------------|
| Uptime           | [UptimeRobot](https://uptimerobot.com) — pings `/health` every 5 min | SMS/email if Render dyno sleeps or crashes |
| Backend errors   | [Sentry](https://sentry.io) — `@sentry/node`                 | Stack traces with request context |
| Frontend errors  | Sentry browser SDK                                          | Catches XHR / JS exceptions |
| Privacy analytics| [Plausible](https://plausible.io) or [Umami](https://umami.is)        | Page views without cookies — no GDPR banner needed |

If you skip Sentry on day 1, at minimum set up UptimeRobot — it's the cheapest insurance against silent backend outages.

---

## Step 9 — Database backups

Atlas free tier includes hourly continuous backups for 2 days. Verify in Atlas → **Backup** → **Snapshots**.

**Restore drill** (do this once before launch — you don't want to discover the restore is broken during a real incident):
1. In Atlas, **Snapshots → Restore** the most recent snapshot to a *new* test cluster.
2. Update `MONGODB_URI` locally to the test cluster, run `npm run dev`, sign in as your admin user.
3. Confirm reservations + messages are present. Tear the test cluster down.

---

## Post-launch checklist (tick the day you go live)

- [ ] Backend `/health` responds 200 from at least one external monitoring service for 24 hours.
- [ ] Sign up + sign in works end-to-end from a fresh browser session.
- [ ] Reservation submission writes to Atlas (visible in Atlas → Collections → reservations).
- [ ] Contact form submission writes to Atlas (`messages` collection).
- [ ] Admin login → `/admin.html` → Customers tab loads at least one user.
- [ ] Admin can mark a message as read; the change persists across reload.
- [ ] Logout clears `gm-token` cookie (verifiable in dev tools → Application → Cookies).
- [ ] CSP doesn't break any page (check console — no "Refused to load" warnings).
- [ ] Both EN and AR pages render with `dir="rtl"` correctly applied to AR.
- [ ] Mobile (real iPhone or Android, not just dev tools): tap targets feel right, forms don't zoom on focus.
- [ ] `npm audit --audit-level=high` is clean on both backend and after any future dependency updates.
- [ ] At least one test reservation has been deleted via the admin panel and confirmed to disappear from `/users/all` view of customers (sanity that admin actions persist).
- [ ] DNS A and CNAME records resolve from a third-party DNS checker (e.g. dnschecker.org).
- [ ] HSTS NOT yet enabled — keep it off until you've operated on HTTPS for 1+ week.

---

## Things that are tracked but deferred

These were called out in earlier phases and are documented as non-blockers for launch:

- **Phase 3.5 backlog**: U-05 (undo for destructive admin actions — needs a `restoreById` endpoint), U-20 (dynamic stat numbers on home page).
- **i18n refactor**: bilingual pages currently mirror as `HTML/` and `HTML-AR/`. The "right" way is a single source of truth + JSON dictionary. Not blocking launch.
- **Bootstrap removal**: ~230 KB savings if you replace ~10% of Bootstrap usage with custom CSS. Tracked from Phase 1.
- **Strict CSP**: helmet's CSP is enabled but allows `'unsafe-inline'` for the remaining inline `onclick` handlers. Removing those (~47 occurrences) lets us drop `'unsafe-inline'` from `script-src`. Not blocking launch.

---

## In case of incident

| Symptom                                       | First check                                                                                |
|-----------------------------------------------|--------------------------------------------------------------------------------------------|
| Site is down (5xx everywhere)                 | Render dashboard → service status. If "deploy failed," check **Logs** tab.                 |
| Site loads but API calls 502                  | Render free tier sleeping. Upgrade to Starter plan, or accept the 30s cold start.          |
| Sign-in works locally but not in prod         | Browser console — likely CORS. Confirm `CORS_ORIGINS` on Render includes the Vercel URL.   |
| Cookies set but next request is 401           | Vercel rewrite missing or pointed at wrong Render URL — check `vercel.json`.               |
| `npm audit` flags new high vuln               | Run `npm audit fix` in `Backend/`; commit if successful; deploy.                           |
| Compromise suspected                          | Rotate `JWT_SECRET` on Render → all sessions invalidated. Force users to sign in again.    |
