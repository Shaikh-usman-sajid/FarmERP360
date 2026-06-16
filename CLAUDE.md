# FarmERP360 — Claude Code Guide

## What This Project Is
Full-stack ERP for Pakistani livestock/dairy farms. Manages animals, milk production, health records, inventory, agriculture, HR, investors, and a Pallai (shared livestock subscription) program. Currency: PKR. Local breeds: Beetal, Kamori, Nili-Ravi, Kundi.

## How to Run
```bash
cp .env.example .env
docker compose up --build        # first run (3–5 min)
docker compose up -d             # subsequent runs
docker compose up -d --force-recreate frontend   # after env var changes
docker compose down -v && docker compose up --build  # full reset + reseed
```

Access: http://216.73.188.187:3000 (or http://localhost)

## Tech Stack
| Layer | Tech |
|-------|------|
| Backend | FastAPI 0.111, Python 3.11, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT HS256, Argon2/bcrypt password hashing |
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3.4 (green farming theme) |
| State | Zustand (auth), TanStack React Query v5 (server state) |
| HTTP | Axios with JWT interceptors, auto-refresh on 401 |
| Charts | Recharts 2.12.7 |
| Infra | Docker Compose, Nginx reverse proxy |

## Key File Paths

### Backend
```
backend/app/
  main.py                    # FastAPI app, CORS, router registration
  core/
    config.py                # Settings (env-based, pydantic-settings)
    database.py              # SQLAlchemy engine + session
    security.py              # JWT create/verify, password hash
    deps.py                  # get_current_user, require_roles (Depends)
  models/models.py           # All 39 SQLAlchemy ORM tables + enums
  schemas/                   # Pydantic request/response schemas
  api/v1/endpoints/
    auth.py                  # login, refresh, logout, change-password
    users.py                 # user CRUD
    animals.py               # animal CRUD, photo upload, weight tracking
    health.py                # vaccinations, treatments, breeding
    dairy.py                 # milk production, sales, daily summary
    inventory.py             # products, stock transactions
    agriculture.py           # fields, crop cycles, harvests
    employees.py             # employee CRUD, attendance
    business.py              # investors, pallai, invoices, payments
    dashboard.py             # role dashboards, reports, audit logs
  seed.py                    # idempotent demo data (420 lines)
  init_db.py                 # create tables on startup
```

### Frontend
```
frontend/src/
  app/                       # Next.js App Router pages
    layout.tsx               # Root layout (QueryClientProvider, Toaster)
    page.tsx                 # Root redirect (/ → /dashboard or /login)
    login/page.tsx           # Login page with demo credential buttons
    dashboard/page.tsx       # Owner dashboard with KPIs + charts
    animals/page.tsx
    milk/page.tsx
    vaccination/page.tsx
    treatments/page.tsx
    inventory/page.tsx
    agriculture/page.tsx
    employees/page.tsx
    attendance/page.tsx
    investors/page.tsx
    pallai/page.tsx
    invoices/page.tsx
    payments/page.tsx
    reports/page.tsx
    users/page.tsx
  components/layout/
    DashboardLayout.tsx      # Wraps all protected pages with AuthGuard + Sidebar
    Sidebar.tsx              # Role-based nav, 15 links
    AuthGuard.tsx            # Redirects to /login if not authenticated
  lib/api.ts                 # Axios client (baseURL=/api/v1) + 70+ API functions
  store/authStore.ts         # Zustand auth store with localStorage persistence
```

## API Proxy Setup (Important)
The frontend uses a relative base URL `/api/v1`. Requests are proxied:
- Port 3000: Next.js rewrite → `http://backend:8000/api/:path*`
- Port 80: Nginx → `http://backend:8000`

**Never set `NEXT_PUBLIC_API_URL` to an absolute URL with `localhost`.** It must stay as `/api/v1` so it works from any client IP.

After changing `docker-compose.yml` env vars, always use:
```bash
docker compose up -d --force-recreate frontend
```
`docker compose restart` does NOT re-read docker-compose.yml env vars.

## Database

### Conventions
- UUID primary keys (PostgreSQL native)
- Soft deletes via `is_active` boolean
- All tables have `created_at`, `updated_at` timestamps
- Financial amounts: `Numeric(12, 2)`
- All data scoped to `organization_id` (multi-tenant)

### Key Enums
```python
UserRole: super_admin, owner, farm_manager, vet_manager, accountant,
          employee, data_entry, investor, pallai_customer
AnimalSpecies: goat, buffalo, cow, sheep
AnimalStatus: active, sold, deceased, transferred
MilkSession: morning, evening
InvoiceStatus: draft, sent, paid, overdue, cancelled
InventoryTxType: IN, OUT, ADJUST
CropStatus: planned, growing, harvested, failed
```

### Adding a new table
1. Add model to `backend/app/models/models.py`
2. Add Pydantic schemas to `backend/app/schemas/`
3. Create endpoint file in `backend/app/api/v1/endpoints/`
4. Register router in `backend/app/main.py`
5. Run: `docker compose exec backend alembic revision --autogenerate -m "description"`
6. Run: `docker compose exec backend alembic upgrade head`

## RBAC Pattern
```python
# In any endpoint:
current_user: User = Depends(get_current_user)          # any logged-in user
current_user: User = Depends(require_roles(["owner"]))  # role-restricted
```

## Frontend Patterns

### Adding a new page
1. Create `frontend/src/app/<module>/page.tsx`
2. Add `'use client'` at top
3. Wrap with `<DashboardLayout>` 
4. Add API functions to `frontend/src/lib/api.ts`
5. Add nav link to `frontend/src/components/layout/Sidebar.tsx`

### API call pattern
```typescript
// Query (read)
const { data, isLoading } = useQuery({
  queryKey: ['animals'],
  queryFn: () => animalsAPI.list().then(r => r.data),
})

// Mutation (write)
const mutation = useMutation({
  mutationFn: (data) => animalsAPI.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['animals'] }),
})
```

### Auth store helpers
```typescript
const { user, isAuthenticated } = useAuthStore()
isAdmin(user.role)      // super_admin or owner
isFarmRole(user.role)   // farm-level access roles
canAccess(user.role, ['owner', 'farm_manager'])
```

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@farmerp360.com | Admin123!@# |
| Owner | owner@farmerp360.com | Owner123!@# |
| Accountant | accountant@farmerp360.com | Acc123!@# |
| Farm Manager | manager@farmerp360.com | Mgr123!@# |
| Vet | vet@farmerp360.com | Vet123!@# |
| Employee | employee@farmerp360.com | Emp123!@# |
| Investor | investor1@farmerp360.com | Inv123!@# |
| Customer | customer1@farmerp360.com | Cust123!@# |

## Common Commands
```bash
# Logs
docker compose logs -f backend
docker compose logs -f frontend

# DB shell
docker compose exec postgres psql -U farmerp360_user -d farmerp360

# Alembic migrations
docker compose exec backend alembic revision --autogenerate -m "add_feature"
docker compose exec backend alembic upgrade head

# Run seed manually
docker compose exec backend python seed.py

# Full reset
docker compose down -v && docker compose up --build
```

## Project Scope & Roadmap
See **SCOPE.md** for planned features and current development priorities.
