# FarmERP360 — Enterprise Livestock ERP Platform

Full-stack livestock, dairy, agriculture, and investor management ERP.

## Stack
- **Backend**: FastAPI + PostgreSQL + Redis (Python 3.11)
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Infra**: Docker Compose + Nginx

---

## Prerequisites

```bash
# Install Docker and Docker Compose on Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # log out and back in after this
```

---

## Quick Start (3 commands)

```bash
# 1. Clone / extract the project
cd farmerp360

# 2. Copy environment file
cp .env.example .env

# 3. Start everything
docker compose up --build
```

First boot takes 3–5 minutes (pulls images, installs deps, runs migrations, seeds data).

### Access

| Service  | URL                        |
|----------|----------------------------|
| App (Nginx) | http://localhost          |
| Frontend    | http://localhost:3000     |
| Backend API | http://localhost:8000     |
| API Docs    | http://localhost:8000/docs |

---

## Demo Login Credentials

| Role          | Email                          | Password      |
|---------------|-------------------------------|---------------|
| Super Admin   | admin@farmerp360.com          | Admin123!@#   |
| Owner         | owner@farmerp360.com          | Owner123!@#   |
| Accountant    | accountant@farmerp360.com     | Acc123!@#     |
| Farm Manager  | manager@farmerp360.com        | Mgr123!@#     |
| Vet Manager   | vet@farmerp360.com            | Vet123!@#     |
| Employee      | employee@farmerp360.com       | Emp123!@#     |
| Investor      | investor1@farmerp360.com      | Inv123!@#     |
| Customer      | customer1@farmerp360.com      | Cust123!@#    |

---

## Seeded Demo Data

| Category       | Details                                         |
|----------------|-------------------------------------------------|
| Animals        | 5 Goats (Beetal, Kamori, Teddy) + 4 Buffaloes (Nili-Ravi, Kundi) |
| Milk Records   | 30 days × 3 female buffaloes × 2 sessions = 180 records |
| Employees      | 3 (Farm Worker, Milkman, Driver)               |
| Tasks          | 10 demo tasks (pending, in_progress, completed) assigned to employees |
| Feed Types     | 7 common Pakistani feed types with current stock levels |
| Investors      | 3 (33.33% each, PKR 500,000 capital each)      |
| Pallai Packages| 4 packages (Basic, Premium, Vet, Daily)        |
| Inventory      | 8 feed/medicine items with stock levels         |
| Fields         | 3 agricultural fields (5 acres total)           |
| Crop Cycles    | 3 (2 harvested Berseem/Maize, 1 growing)       |
| Vaccinations   | 4 records with next due dates                  |
| Accounting     | 43 chart of accounts, seeded journal entries, sample payroll |

---

## Development Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild after code changes
docker compose up --build

# Restart single service
docker compose restart backend

# Run migrations manually
docker compose exec backend alembic upgrade head

# Re-seed database (only runs if org not found)
docker compose exec backend python seed.py

# Connect to database
docker compose exec postgres psql -U farmerp360_user -d farmerp360

# Stop everything
docker compose down

# Stop and remove volumes (full reset)
docker compose down -v
```

---

## Project Structure

```
farmerp360/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── scripts/
│   └── init.sql
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth, animals, milk, health, inventory...
│   │   ├── core/               # config, database, security, deps
│   │   ├── models/             # SQLAlchemy models (all 25+ tables)
│   │   └── schemas/            # Pydantic schemas
│   ├── alembic/                # DB migrations
│   ├── seed.py                 # Demo data seed script
│   └── requirements.txt
└── frontend/
    └── src/
        ├── app/                # Next.js pages (all modules)
        ├── components/layout/  # Sidebar, AuthGuard, DashboardLayout
        ├── lib/api.ts          # Axios API client
        └── store/authStore.ts  # Zustand auth state
```

---

## API Modules

| Module             | Endpoints                                           |
|--------------------|-----------------------------------------------------|
| Auth               | login, refresh, logout, /me, change-password        |
| Users              | CRUD + role filtering                               |
| Animals            | CRUD + photos upload + weight tracking              |
| Health             | Vaccinations, Treatments, Breeding Records          |
| Dairy              | Milk Production + Sales + Daily Summary             |
| Inventory          | Products + Stock Transactions (auto stock update)   |
| Feed Management    | Feed Types + Stock IN/OUT + Daily Consumption       |
| Agriculture        | Fields + Crop Cycles + Harvest Recording            |
| Employees          | CRUD + Attendance Marking                           |
| Tasks              | Assign + Track + Start/Complete/Cancel              |
| Investors          | CRUD + Capital Contributions + Portfolio            |
| Pallai             | Customers + Packages + Subscriptions + Billing      |
| Invoices           | CRUD with line items + auto-total                   |
| Payments           | Recording + auto invoice status update              |
| Accounting         | Chart of Accounts, Journal Entries, Ledger, Payroll, P&L, Balance Sheet |
| Dashboard          | Owner, Farm, Accounting, Investor dashboards        |
| Analytics          | 8-tab analytics: Milk, Cash Flow, Farm Health, Profitability, Inventory, Investors, Pallai |

Full Swagger docs at: http://localhost:8000/docs

---

## Troubleshooting

**Backend not starting**: Check DB health with `docker compose ps`. Wait for postgres healthcheck to pass.

**Seed not running**: It's idempotent — only seeds if the org slug `hayo-farm` doesn't exist. To reseed: `docker compose down -v && docker compose up --build`.

**Frontend build error**: Run `docker compose logs frontend` for details.

**Permission errors**: Make sure your user is in the docker group (`sudo usermod -aG docker $USER`) and log out/in.

---

## Production Notes

1. Change `SECRET_KEY` in `.env` to a long random string
2. Change all database passwords
3. Set `ENVIRONMENT=production`
4. Add your domain to `CORS_ORIGINS`
5. Enable HTTPS via Let's Encrypt (update nginx.conf)
