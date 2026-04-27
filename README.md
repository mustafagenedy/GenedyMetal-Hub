# Genedy Metal Hub

Marketing site, reservation system, and admin panel for **Genedy Metal**, a premium aluminum solutions company in Egypt. Bilingual EN / AR. Static frontend, Node/Express + MongoDB backend.

> Production target: **Vercel** (frontend) + **Render** (backend) + **MongoDB Atlas** (database). Step-by-step launch instructions live in [LAUNCH.md](LAUNCH.md).

---

## Architecture

```
Browser  ──>  https://genedymetal.com           (Vercel — static HTML/CSS/JS)
              │
              │  Vercel rewrite: /api/*  ──>    https://genedy-metal-api.onrender.com/*
              │                                  (Render — Node/Express)
              ▼                                          │
                                                         ▼
                                            MongoDB Atlas (managed)
```

The browser only ever talks to the Vercel origin, so cookies stay `SameSite=Lax` and CORS is a non-issue.

---

## Local development

### Prerequisites

- Node.js 20+
- A local MongoDB instance, **or** a free MongoDB Atlas cluster

### One-time setup

```bash
git clone https://github.com/mustafagenedy/GenedyMetal-Hub.git
cd GenedyMetal-Hub/Backend
npm install
cp .env.example .env
# edit .env — set MONGODB_URI and a real JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Run

```bash
# in one terminal — backend
cd Backend
npm run dev          # http://localhost:3000

# in another — serve the frontend (any static server works)
cd Frontend
npx serve            # or VS Code Live Server, python3 -m http.server, etc.
```

Open `http://localhost:3000/health` to confirm the backend is alive, and `http://localhost:5173/HTML/main.html` (or whatever port your static server picks) for the site.

---

## Environment variables

All secrets live in `Backend/.env` locally and in the **Render dashboard** in production. Never commit them.

| Variable          | Required        | Example / default                     | Notes |
|-------------------|-----------------|---------------------------------------|-------|
| `NODE_ENV`        | yes             | `development` / `production`          | Production refuses to boot without `JWT_SECRET`. |
| `PORT`            | no              | `3000`                                | Render injects its own. |
| `MONGODB_URI`     | **yes (prod)**  | `mongodb+srv://USER:PASS@.../db`      | Local fallback exists. |
| `JWT_SECRET`      | **yes**         | 96-char hex string                    | Must be ≥32 chars in prod. |
| `JWT_EXPIRES_IN`  | no              | `7d`                                  | Cookie max-age also 7d. |
| `BCRYPT_COST`     | no              | `12`                                  | Min 10 (clamped). |
| `CORS_ORIGINS`    | yes (prod)      | `https://genedymetal.com,https://www.genedymetal.com` | Comma-separated. `*` allowed in dev only. |

---

## Project layout

```
.
├── Backend/                       Node/Express + Mongoose
│   ├── index.js                   server entry — boots DB, then HTTP
│   ├── SRC/
│   │   ├── DB/                    db connection + Mongoose models
│   │   ├── Middleware/            auth, csrf, rate-limit, validation, error handler
│   │   └── Modules/{User,Reservation,Messages}/
│   │                              router + controller + Joi validation per resource
│   ├── package.json
│   └── .env.example               copy to .env locally
├── Frontend/                      static — served by Vercel
│   ├── HTML/                      English pages
│   ├── HTML-AR/                   Arabic mirrors (RTL)
│   ├── CSS/
│   ├── JS/                        api.js, ui.js, theme.js, plus per-page scripts
│   └── Assets/
├── .github/workflows/ci.yml       install, syntax check, npm audit
├── render.yaml                    Render Blueprint (backend service)
├── vercel.json                    Vercel rewrites + headers (frontend)
└── LAUNCH.md                      step-by-step deploy runbook
```

---

## API surface

| Method | Path                          | Auth         | Notes |
|--------|-------------------------------|--------------|-------|
| POST   | `/users/signup`               | rate-limited | Public |
| POST   | `/users/signin`               | rate-limited | Sets `gm-token` (HttpOnly) + `gm-csrf` cookies |
| POST   | `/users/logout`               | cookie       | Clears both cookies |
| GET    | `/users/csrf`                 | none         | Mints a fresh CSRF cookie |
| GET    | `/users/profile`              | user         | |
| GET    | `/users/all`                  | admin        | `?page=&limit=&search=` |
| GET    | `/users/stats`                | admin        | |
| GET    | `/users/analytics`            | admin        | |
| POST   | `/reservations/create`        | rate-limited | Public |
| GET    | `/reservations/mine`          | user         | Replaces old `/user` IDOR-prone route |
| GET    | `/reservations/all`           | admin        | |
| GET / PUT / DELETE | `/reservations/:id` | admin       | |
| POST   | `/messages`                   | rate-limited | Public contact form |
| GET    | `/messages/mine`              | user         | |
| GET / PUT / DELETE | `/messages` and `/messages/:id` | admin | |
| GET    | `/health`                     | none         | Render uses this for health checks |

State-changing routes (POST/PUT/DELETE) require an `X-CSRF-Token` header that matches the `gm-csrf` cookie when the request carries an auth cookie. The shared `gmApi.apiFetch` wrapper handles this automatically.

---

## License

ISC.
