# ZERO — Order Packing System

Single-service warehouse packing app with Tiendanube integration.  
**One Railway service. One Postgres DB. One URL.**

---

## Quick Connect a New Store (10–15 min)

```
1. Create Tiendanube App → get CLIENT_ID + CLIENT_SECRET
2. Deploy ZERO to Railway → set env vars (see below)
3. Open https://YOUR-APP.railway.app/admin/integrations/tiendanube
4. Click "Conectar con Tiendanube" → authorize
5. Click "Sync ahora" → orders import
6. Click "Armar pedido" → scan label → scan items → done
```

---

## Local Setup

```bash
git clone <repo> && cd zero

# Install deps
npm install
cd frontend && npm install && cd ..

# Configure
cp .env.example .env
# Edit .env — at minimum: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, TOKEN_ENCRYPTION_KEY

# Generate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # TOKEN_ENCRYPTION_KEY

# Database setup (needs Postgres running)
npm run migrate
npm run seed      # Creates admin@zero.local / zero1234 + sample orders

# Dev mode (two terminals)
npm run dev:server    # Express on :4000
npm run dev:frontend  # Next.js on :3000
```

---

## Railway Deployment

### 1. Create project

```
railway new
railway link
```

Or connect your GitHub repo in the Railway dashboard.

### 2. Add Postgres

Dashboard → New → Database → PostgreSQL  
Railway auto-sets `DATABASE_URL` in your service.

### 3. Set environment variables

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_ACCESS_SECRET` | 64-char hex (generate above) |
| `JWT_REFRESH_SECRET` | different 64-char hex |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex (64 hex chars) |
| `INTEGRATION_PROVIDER` | `tiendanube` (or `local` for demo) |
| `TIENDANUBE_CLIENT_ID` | From TN Partners |
| `TIENDANUBE_CLIENT_SECRET` | From TN Partners |
| `TIENDANUBE_REDIRECT_URI` | `https://YOUR-APP.railway.app/api/integrations/tiendanube/auth/callback` |
| `TIENDANUBE_WEBHOOK_SECRET` | Random string — set same in TN app |

Railway injects `PORT` and `DATABASE_URL` automatically.

### 4. Deploy

```bash
railway up
# or push to GitHub if connected
```

The `railway.json` runs `npm run migrate` before starting — migrations are automatic.

### 5. Create admin user

First visit to `/api/auth/register` creates an admin without token (bootstrap).  
Or use the seed: `railway run npm run seed`

---

## Tiendanube App Configuration

### Create the app
1. Go to [Tiendanube Partners](https://www.tiendanube.com/partners/apps)
2. Create a new app
3. Set scopes: `read_orders write_orders`
4. Set Redirect URI: `https://YOUR-APP.railway.app/api/integrations/tiendanube/auth/callback`
5. Copy Client ID and Client Secret → Railway env vars

### Configure webhooks
In your TN app settings, add a webhook for:
- URL: `https://YOUR-APP.railway.app/api/integrations/tiendanube/webhook`
- Events: `order/created`, `order/updated`, `order/paid`, `order/packed`, `order/cancelled`
- Set the same secret you put in `TIENDANUBE_WEBHOOK_SECRET`

---

## Architecture

```
PORT (Railway)
 ├─ /health                                 → DB ping
 ├─ /api/auth/*                             → JWT login/register/refresh
 ├─ /api/orders/*                           → Order CRUD + scan-item
 ├─ /api/integrations/tiendanube/*          → OAuth + sync + webhook
 ├─ /api/users/*                            → Admin user management
 ├─ /_next/static/*                         → Next.js hashed assets (1yr cache)
 └─ *                                       → Next.js SSR pages
```

## File structure

```
zero/
├── server/
│   ├── index.js              ← Entry (API + Next.js frontend)
│   ├── app.js                ← Express wiring
│   ├── db/
│   │   ├── knexfile.js       ← Postgres config
│   │   ├── migrations/       ← 4 migrations
│   │   └── seeds/            ← Dev seed (admin + sample orders)
│   ├── middleware/           ← auth, validate, errorHandler
│   ├── routes/               ← auth, orders, integrations, users, health
│   ├── services/
│   │   ├── authService.js
│   │   ├── orderService.js   ← scan-item logic, auto-pack
│   │   └── syncService.js    ← TN sync + webhook handler
│   ├── integrations/
│   │   └── tiendanube/
│   │       └── client.js     ← OAuth, token encrypt/decrypt, API calls
│   └── utils/
│       ├── crypto.js         ← AES-256-GCM for token storage
│       ├── logger.js         ← Pino
│       └── startup.js        ← Env var validation
├── frontend/
│   ├── next.config.js        ← output: 'standalone'
│   ├── src/app/
│   │   ├── login/            ← /login
│   │   ├── orders/           ← /orders (list) + /orders/[id] (packing)
│   │   ├── pack/             ← /pack (label or order number entry)
│   │   └── admin/
│   │       ├── integrations/tiendanube/  ← connect + sync
│   │       └── users/                   ← user management
│   ├── src/components/
│   │   ├── Shell.jsx         ← Nav shell
│   │   └── Guard.jsx         ← Auth redirect
│   └── src/lib/
│       ├── api.js            ← fetch wrapper with auto-refresh
│       └── auth.js           ← AuthContext
├── scripts/
│   └── copy-build.js         ← Copies Next.js standalone → frontend-build/
├── package.json              ← Root: build + start + migrate
├── railway.json              ← Build + deploy config
└── .env.example
```

## Packing workflow

```
Operator receives parcel with Andreani label
         ↓
Scan label code → /pack → finds order by label code
         ↓
Packing screen: list of required items (name / variant / qty)
         ↓
Scan each product barcode or SKU:
   match → item turns green, qty counter increments
   not found → red alert + error beep + recorded as unexpected
   duplicate → warning + recorded
         ↓
All items scanned → order auto-marked as PACKED
   packed_at + packed_by saved
   ORDER_PACKED event recorded
         ↓
Back to orders list
```

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/register` | first-run or admin | Register |
| POST | `/api/auth/refresh` | — | Refresh tokens |
| POST | `/api/auth/logout` | ✓ | Logout |
| GET | `/api/auth/me` | ✓ | Current user |
| GET | `/api/orders` | ✓ | List orders |
| GET | `/api/orders/:id` | ✓ | Order detail + items |
| GET | `/api/orders/by-number/:n` | ✓ | Find by TN order number |
| GET | `/api/orders/by-label/:code` | ✓ | Find by Andreani label code |
| POST | `/api/orders/:id/scan-item` | ✓ | Scan product barcode |
| POST | `/api/orders/:id/pack` | ✓ admin | Force pack |
| GET | `/api/integrations/tiendanube/status` | ✓ | Connection status |
| GET | `/api/integrations/tiendanube/auth/start` | ✓ admin | Start OAuth |
| GET | `/api/integrations/tiendanube/auth/callback` | — | OAuth callback |
| POST | `/api/integrations/tiendanube/sync` | ✓ admin | Sync orders |
| POST | `/api/integrations/tiendanube/webhook` | — | TN webhook |
| GET | `/api/users` | ✓ admin | List users |
| POST | `/api/users` | ✓ admin | Create user |
| PATCH | `/api/users/:id` | ✓ admin | Update user |
