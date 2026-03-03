# ZERO — Sistema de Armado de Pedidos

Sistema de armado de pedidos con escaneo de código de barras.  
Stack: **Next.js 14 · Node/Express · MySQL 8 · Knex · JWT**

---

## Estructura del proyecto

```
zero/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app
│   │   ├── index.js                # Entry point
│   │   ├── controllers/            # (opcional, lógica en services)
│   │   ├── db/
│   │   │   ├── index.js            # Knex instance
│   │   │   ├── knexfile.js         # Config por entorno
│   │   │   ├── migrations/         # Migraciones SQL
│   │   │   └── seeds/              # Datos de desarrollo
│   │   ├── integrations/
│   │   │   ├── index.js            # Feature-flag factory
│   │   │   ├── localProvider.js    # Provider local (default)
│   │   │   └── tiendanube/
│   │   │       ├── client.js       # ⚠️ STUB — ver sección Tiendanube
│   │   │       └── types.js        # JSDoc types / interfaces
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT authenticate + authorize
│   │   │   ├── errorHandler.js     # Error handler centralizado
│   │   │   └── validate.js         # Joi body/query validation
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── orders.js
│   │   │   ├── scans.js
│   │   │   ├── users.js
│   │   │   ├── audit.js
│   │   │   └── health.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── auditService.js
│   │   │   ├── orderService.js
│   │   │   └── scanService.js
│   │   └── utils/
│   │       └── logger.js           # Pino logger
│   ├── tests/
│   │   ├── helpers.js
│   │   ├── auth.test.js
│   │   ├── orders.test.js
│   │   └── scans.test.js
│   ├── .env.example
│   ├── .eslintrc.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.jsx
│   │   │   ├── globals.css
│   │   │   ├── login/page.jsx
│   │   │   ├── orders/page.jsx
│   │   │   └── scan/page.jsx
│   │   ├── components/
│   │   │   └── layout/AppShell.jsx
│   │   └── lib/
│   │       └── api.js              # fetch wrapper con auto-refresh
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Setup local (paso a paso)

### Pre-requisitos
- Node.js 20+
- MySQL 8 corriendo localmente (o usar Docker)
- Git

### 1. Clonar y configurar variables de entorno

```bash
git clone <repo-url>
cd zero

# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales de DB y secrets JWT

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 2. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Crear base de datos

```sql
-- En MySQL:
CREATE DATABASE zero_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zero_user'@'localhost' IDENTIFIED BY 'changeme';
GRANT ALL PRIVILEGES ON zero_db.* TO 'zero_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Correr migraciones

```bash
cd backend
npm run migrate
```

### 5. Cargar datos de desarrollo (opcional)

```bash
npm run seed
# Crea 3 usuarios y pedidos de ejemplo:
# admin@zero.local    / zero1234  (admin)
# operator@zero.local / zero1234  (operator)
# viewer@zero.local   / zero1234  (viewer)
```

### 6. Levantar servicios

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- Backend: http://localhost:4000
- Frontend: http://localhost:3000
- Health check: http://localhost:4000/health

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Default | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | Entorno |
| `PORT` | `4000` | Puerto del servidor |
| `DB_HOST` | `localhost` | Host MySQL |
| `DB_PORT` | `3306` | Puerto MySQL |
| `DB_NAME` | `zero_db` | Nombre de la DB |
| `DB_USER` | `zero_user` | Usuario MySQL |
| `DB_PASSWORD` | — | Contraseña MySQL |
| `JWT_ACCESS_SECRET` | — | Secret para access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | — | Secret para refresh tokens (min 32 chars) |
| `JWT_ACCESS_EXPIRES` | `15m` | TTL access token |
| `JWT_REFRESH_EXPIRES` | `7d` | TTL refresh token |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS origins (comma-separated) |
| `INTEGRATION_PROVIDER` | `local` | `local` o `tiendanube` |
| `LOG_LEVEL` | `info` | `fatal\|error\|warn\|info\|debug` |

### Frontend (`frontend/.env.local`)

| Variable | Default | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | URL del backend |

### Generar secrets JWT seguros

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Migraciones

```bash
cd backend

# Aplicar migraciones pendientes
npm run migrate

# Revertir última migración
npm run migrate:rollback

# Crear nueva migración
npm run migrate:make -- nombre_descriptivo
```

---

## Tests

```bash
cd backend

# Correr todos los tests
npm test

# Con coverage
npm run test:coverage

# Lint
npm run lint
```

Los tests usan mocks de DB y servicios — no requieren DB real.

---

## Deploy en Railway

### Opción A: Docker Compose (recomendado para staging)

```bash
# 1. Copiar .env.example → .env y configurar secrets
cp .env.example .env

# 2. Construir y levantar
docker compose up --build -d

# 3. Correr migraciones dentro del container
docker compose exec backend npm run migrate

# 4. (Opcional) cargar seed
docker compose exec backend npm run seed
```

### Opción B: Deploy directo en Railway

1. Crear proyecto en Railway
2. Agregar servicio MySQL desde el marketplace
3. Agregar servicio desde repo (backend):
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
4. Agregar servicio desde repo (frontend):
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Start command: `npm start`
5. Configurar variables de entorno en cada servicio
6. Correr migraciones: `railway run npm run migrate` (desde backend)

### Variables adicionales para Railway

```
DB_SSL=true              # Si Railway expone MySQL con SSL
ALLOWED_ORIGINS=https://tu-frontend.railway.app
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

---

## Endpoints internos

Ver [`docs/openapi.yml`](docs/openapi.yml) para especificación completa.

### Resumen rápido

| Método | Path | Auth | Roles | Descripción |
|---|---|---|---|---|
| `GET` | `/health` | No | — | Health check |
| `POST` | `/api/auth/login` | No | — | Login |
| `POST` | `/api/auth/refresh` | No | — | Refresh token |
| `POST` | `/api/auth/logout` | Sí | any | Logout |
| `GET` | `/api/auth/me` | Sí | any | Usuario actual |
| `GET` | `/api/orders` | Sí | any | Listar pedidos |
| `GET` | `/api/orders/:id` | Sí | any | Ver pedido |
| `PATCH` | `/api/orders/:id/pack` | Sí | admin, operator | Marcar como packed |
| `POST` | `/api/scans` | Sí | admin, operator | Registrar escaneo |
| `GET` | `/api/users` | Sí | admin | Listar usuarios |
| `POST` | `/api/users` | Sí | admin | Crear usuario |
| `PATCH` | `/api/users/:id` | Sí | admin | Editar usuario |
| `GET` | `/api/audit` | Sí | admin | Ver auditoría |

---

## 🔌 Integración Tiendanube (PENDIENTE)

**Estado actual:** El proyecto incluye stubs vacíos. No hay llamadas reales a Tiendanube.

### Cómo integrar (puntos exactos)

**1. Variables de entorno** — agregar a `backend/.env`:
```
INTEGRATION_PROVIDER=tiendanube
TIENDANUBE_STORE_ID=tu_store_id
TIENDANUBE_ACCESS_TOKEN=tu_access_token
```

**2. Implementar el cliente** — `backend/src/integrations/tiendanube/client.js`:
- Implementar `fetchOrders()` con llamada real a `GET /v1/{store_id}/orders`
- Implementar `markPacked(orderId)` con llamada real a `POST /v1/{store_id}/orders/{id}/fulfill`
- Ajustar `mapOrder()` para mapear campos de la API al schema local

**3. Activar en el factory** — `backend/src/integrations/index.js`:
- Descomentar la línea `integrationClient = require('./tiendanube/client');`

**4. Hook en markPacked** — `backend/src/services/orderService.js`, función `markPacked()`:
- Después del `UPDATE orders SET status='packed'`, llamar:
  ```js
  const integration = require('../integrations');
  if (order.external_id) await integration.markPacked(order.external_id);
  ```

**5. Importar pedidos** — crear ruta/servicio que llame `integration.fetchOrders()`,
mapee con `client.mapOrder()` e inserte en DB local.
