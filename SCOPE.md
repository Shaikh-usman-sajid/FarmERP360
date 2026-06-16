# FarmERP360 — Development Roadmap & Project Scope

**Version**: 1.0  
**Status**: In Progress — Phases 1–4, 6 & 7 (partial) complete; Phase 5 (Mobile) not started  
**Last Reviewed**: 2026-06-16  
**Project Type**: Cloud-Native SaaS Platform  
**Source**: myscope.txt  

---

## Project Vision

FarmERP360 is a scalable SaaS-ready platform covering:
- Livestock Farming
- Dairy Operations
- Agriculture Management
- Pallai Services
- Investor Management
- Accounting ERP

**Initial deployment**: Single Farm  
**Future deployment**: Multi-Farm, Multi-City, Multi-Country

---

## Development Strategy

| Item | Detail |
|------|--------|
| Methodology | Agile Scrum |
| Sprint Duration | 2 Weeks |
| Release Cycle | Monthly |
| Major Milestones | Quarterly |

---

## Phase Status Legend
- ✅ Done — fully built
- 🔶 Partial — exists but incomplete
- ❌ Not started

---

## PHASE 1 — MVP Web Platform
**Duration**: 12 Weeks | **Goal**: Operational Farm Management

| Module | Status | Notes |
|--------|--------|-------|
| Authentication & RBAC | ✅ | JWT, 9 roles, refresh tokens |
| User Management | ✅ | CRUD, role filtering |
| Farm Management | ✅ | Organization → Farm structure |
| Animal Management | ✅ | CRUD, ear tag, RFID, species, status |
| Animal Photos | ✅ | Upload, gallery |
| Weight Tracking | ✅ | History per animal |
| Vaccination | ✅ | Schedule, due dates |
| Treatment | ✅ | History, cost tracking |
| Breeding Records | ✅ | Expected/actual delivery dates |
| Milk Production | ✅ | Morning/evening sessions, 180 seed records |
| Inventory Management | ✅ | Products, IN/OUT/ADJUST transactions |
| Feed Management | ✅ | Dedicated module: feed types, stock tracking, daily consumption |
| Agriculture Management | ✅ | Fields, crop cycles, harvests |
| Employee Management | ✅ | CRUD, attendance, salary |
| Basic Reporting | ✅ | Animal + milk reports |
| Dashboard | ✅ | Owner, farm, accounting, investor views |

**Deliverable**: Production-Ready Web ERP — ✅ Complete (all 16 modules built and live)

---

## PHASE 2 — Accounting ERP
**Duration**: 8 Weeks | **Goal**: Financial Digitization

| Module | Status | Notes |
|--------|--------|-------|
| Chart of Accounts | ✅ | 43 auto-seeded accounts, grouped by type |
| Journal Entries | ✅ | Double-entry, post/void, balance validation |
| General Ledger | ✅ | Per-account with running balance |
| Trial Balance | ✅ | As-of-date filter |
| Invoices | ✅ | CRUD, line items, auto-total |
| Payments | ✅ | Recording, auto invoice status update |
| Accounts Receivable | ✅ | AR aging with bucket summary |
| Accounts Payable | ✅ | Vendor bills, pay functionality |
| Payroll | ✅ | Monthly processing from attendance |
| Profit & Loss | ✅ | P&L report with bar chart |
| Balance Sheet | ✅ | Two-column layout with balance verification |
| Cash Flow | ✅ | Indirect method: operating/investing/financing + cash reconciliation |
| Cost Centers | ✅ | CRUD, assign to entries |
| Financial Reports | ✅ | P&L, balance sheet, AR, AP |

**Deliverable**: Complete Accounting ERP — ✅ Complete (all 14 modules built)

---

## PHASE 3 — Pallai Management
**Duration**: 6 Weeks | **Goal**: Customer Service Platform

| Module | Status | Notes |
|--------|--------|-------|
| Customer Management | ✅ | Full CRUD with subscriptions tab |
| Animal Ownership | ✅ | Ownership tracking (farm/investor/shared/pallai) |
| Subscription Packages | ✅ | CRUD with feed/vet inclusion flags |
| Recurring Billing | ✅ | Auto-generate invoices for active subscriptions by month |
| Invoices | ✅ | Pallai invoices linked to subscriptions via subscription_id |
| Payments | ✅ | Recording, auto invoice status update |
| Customer Portal | ✅ | Dedicated /pallai/portal page for pallai_customer role |
| Animal Gallery | ✅ | Customer-facing gallery with photo modal |
| Animal Ledger | ✅ | Per-customer invoice ledger with running balance |
| Customer Reports | ✅ | Summary KPIs + revenue chart + subscription breakdown |

**Deliverable**: Pallai Management System — ✅ Built (Phase 3 complete)

---

## PHASE 4 — Investor Management
**Duration**: 4 Weeks | **Goal**: Investor Transparency

| Module | Status | Notes |
|--------|--------|-------|
| Investor Profiles | ✅ | CRUD, profit share %, capital tracking |
| Capital Contributions | ✅ | Deposit/withdrawal history per investor |
| Profit Sharing | ✅ | Record distributions (profit/dividend/return), history |
| Animal Ownership | ✅ | Ownership percentage via AnimalOwnership |
| Portfolio Analytics | ✅ | Per-investor portfolio with ROI%, net position, animal list |
| Investor Reports | ✅ | Summary table: capital/distributed/ROI per investor + bar chart |
| Investor Portal | ✅ | Dedicated /investors/portal for investor role |

**Deliverable**: Investor Management Portal — ✅ Built (Phase 4 complete)

---

## PHASE 5 — Mobile Applications
**Duration**: 10 Weeks | **Goal**: Field Workforce Mobility

### Employee App
| Feature | Status |
|---------|--------|
| Milk Entry | ❌ |
| Feed Entry | ❌ |
| Weight Entry | ❌ |
| Attendance | ❌ |
| Tasks | ✅ |
| Photo Upload | ❌ |
| Notifications | ❌ |

### Investor App
| Feature | Status |
|---------|--------|
| Portfolio | ❌ |
| Reports | ❌ |
| ROI | ❌ |
| Notifications | ❌ |

### Pallai Customer App
| Feature | Status |
|---------|--------|
| Animal Photos | ❌ |
| Health Records | ❌ |
| Invoices | ❌ |
| Payments | ❌ |
| Support | ❌ |
| Notifications | ❌ |

**Deliverable**: Android & iOS Apps — ❌ Not started  
**Tech Decision Needed**: React Native vs Flutter vs PWA (will ask before starting)

---

## PHASE 6 — Business Intelligence
**Duration**: 6 Weeks | **Goal**: Management Insights

| Module | Status | Notes |
|--------|--------|-------|
| Forecasting | ✅ | /forecasting page: Feed, Cash Flow, Crop Yield tabs |
| KPIs | ✅ | 8 KPI cards with MoM comparison on Reports overview tab |
| Analytics | ✅ | 8-tab analytics dashboard: Overview, Milk, Cash Flow, Farm Health, Animals, Inventory, Investors, Pallai |
| Animal Profitability | ✅ | Per-animal profit/loss with treatment cost deduction |
| Investor Profitability | ✅ | Per-investor ROI and distribution history |
| Feed Forecasting | ✅ | Historical or rule-based daily consumption, depletion dates, reorder alerts, monthly cost projection |
| Cash Flow Forecasting | ✅ | Linear milk trend, salary + feed expense model, net & cumulative cash flow, adjustable milk price |
| Crop Yield Forecasting | ✅ | Historical accuracy per crop, projected yield for active cycles, seasonal recommendations |

**Deliverable**: BI Dashboard — ✅ Complete (analytics + forecasting all built)

---

## PHASE 7 — Advanced Integrations
**Duration**: 8 Weeks

| Integration | Status | Notes |
|-------------|--------|-------|
| WhatsApp Integration | ✅ | Meta Business Cloud API; test message, daily alerts, overdue alerts |
| Easypaisa | ✅ | Merchant credentials config, signed payment form, webhook auto-marks paid |
| JazzCash | ✅ | Merchant credentials config, HMAC-signed params, webhook auto-marks paid |
| QR Codes | ✅ | Per-animal branded PNG QR code, download from animal list |
| Admin Config Panel | ✅ | /admin/settings — org profile, preferences, integration keys, audit log viewer |
| RFID | ❌ | Animal identification (requires hardware) |
| Digital Weighing Scale | ❌ | Direct scale integration (requires hardware) |
| Milk Meter Integration | ❌ | IoT milk measurement (requires hardware) |
| IoT Sensors | ❌ | Farm sensors (requires hardware) |

**Deliverable**: Smart Farm Ecosystem — 🔶 Partial (software integrations done; IoT/hardware pending)

---

## MVP Priority (Must Have First)

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ | JWT, 9 roles |
| Animal Management | ✅ | |
| Milk Management | ✅ | |
| Feed Management | ✅ | Dedicated module |
| Inventory | ✅ | |
| Agriculture | ✅ | |
| Employees | ✅ | |
| Reports | ✅ | 8-tab analytics dashboard + financial reports |
| Dashboard | ✅ | Owner, farm, accounting, investor views |

**Should Have (next priority)**
- ✅ Full Accounting ERP (Phase 2) — complete (all 14 modules including Cash Flow)
- ✅ Investor Portal (Phase 4) — complete
- ✅ Pallai Portal (Phase 3) — complete

**Could Have (later)**
- ✅ Cash Flow Statement (accounting) — built
- ✅ Forecasting (Feed, Cash Flow, Crop Yield) — built
- ✅ Admin Config Panel — org settings, preferences, integration keys, audit logs
- ✅ WhatsApp Notifications — alert broadcasts via Meta Business Cloud API
- ✅ Easypaisa & JazzCash payment gateways — invoice payment with webhooks
- ✅ QR Codes for animals — branded PNG per animal
- IoT integrations (hardware required)
- RFID animal identification (hardware required)

---

## Sprint Plan (Web Platform)

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 1 | Auth, RBAC, Infrastructure | ✅ Done |
| Sprint 2 | Animal Management | ✅ Done |
| Sprint 3 | Animal Health, Vaccination | ✅ Done |
| Sprint 4 | Milk Management | ✅ Done |
| Sprint 5 | Inventory, Feed | ✅ Done |
| Sprint 6 | Agriculture | ✅ Done |
| Sprint 7 | Employees, Tasks, Attendance | ✅ Done |
| Sprint 8 | Dashboards, Reporting, Analytics | ✅ Done |
| Sprint 9 | Testing, Bug Fixing | ❌ Pending |
| Sprint 10 | Production Release | ❌ Pending |

---

## Next Development Priorities

Based on the roadmap, the recommended build order for what remains:

1. ✅ **Feed Management module** — dedicated module separate from general inventory
2. ✅ **Employee Tasks** — task assignment and tracking
3. ✅ **Payroll Processing** — monthly payroll from attendance, with payroll runs
4. ✅ **Chart of Accounts + Journal Entries** — double-entry, post/void
5. ✅ **Accounts Receivable / Payable** — AR aging, vendor bills
6. ✅ **Profit & Loss + Balance Sheet** — financial statements with charts
7. ✅ **Pallai Customer Portal** — /pallai/portal for pallai_customer role
8. ✅ **Investor Portal** — /investors/portal for investor role
9. ✅ **Profit Sharing** — distributions (profit/dividend/return)
10. ✅ **Cash Flow Statement** — indirect method, three sections + opening/closing cash reconciliation
11. ✅ **Forecasting Engine** — Feed, Cash Flow, and Crop Yield forecasting with charts
12. ✅ **Admin Settings Panel** — org config, preferences, integration key management, audit log viewer
13. ✅ **WhatsApp Notifications** — Meta Business Cloud API; daily alerts, test message, bulk send
14. ✅ **Easypaisa & JazzCash** — payment gateway config, signed payment forms, webhooks
15. ✅ **QR Codes** — per-animal branded QR code generation and download
16. **Sprint 9 — Testing & Bug Fixes** — unit tests, integration tests, UAT
17. **Sprint 10 — Production Release** — staging env, SSL, monitoring, data migration
18. **Mobile App** — tech stack decision needed before starting (React Native vs Flutter vs PWA)

---

## Testing Strategy

| Type | Target |
|------|--------|
| Unit Testing | 80% coverage |
| Integration Testing | API, Database, Workflow |
| UAT | Owner, Accountant, Farm Manager, Employees |

## Security Review Checklist
- [ ] Authentication Testing
- [ ] Authorization Testing
- [ ] Permission Testing
- [ ] Data Isolation Testing
- [ ] Audit Testing
- [ ] Backup Testing

---

## Deployment Environments

| Environment | Status |
|-------------|--------|
| Development | ✅ Running (Docker Compose) |
| Staging | ❌ Not set up |
| Production | ❌ Not set up |

**Deployment Process**: Code Review → Automated Tests → Staging → Approval → Production

---

## Data Migration Plan

| Phase | Task | Status |
|-------|------|--------|
| 1 | Import Existing Animals | ❌ |
| 2 | Import Investors | ❌ |
| 3 | Import Employees | ❌ |
| 4 | Import Accounting Data | ❌ |

---

## Go Live Checklist
- [ ] Infrastructure Ready
- [ ] Database Ready
- [ ] Backups Enabled
- [ ] SSL Enabled
- [ ] Monitoring Enabled
- [ ] Users Created
- [ ] Permissions Verified
- [ ] Training Completed
- [ ] Data Imported
- [ ] UAT Approved

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| Phase 0 — Planning & Design | 1 month | 1 month |
| Phase 1 — MVP Web Platform | 3 months | 4 months |
| Phase 2 — Accounting ERP | 2 months | 6 months |
| Phase 3 — Pallai Management | 1.5 months | 7.5 months |
| Phase 4 — Investor Management | 1 month | 8.5 months |
| Phase 5 — Mobile Apps | 2.5 months | 11 months |
| Phase 6 — Business Intelligence | 1.5 months | 12.5 months |
| Phase 7 — Advanced Integrations | 2 months | 14.5 months |
| **Total** | **~12–14 months** | |

---

## Project Risks

| Risk | Mitigation |
|------|-----------|
| Poor Requirements | Approve documents before coding |
| Scope Creep | Formal change requests |
| Data Loss | Automated backups |
| Security Issues | RBAC + Audit Logs |

---

## Success Metrics
- 100% Animal Tracking
- 100% Milk Tracking
- 100% Feed Tracking
- 100% Financial Tracking
- 100% Investor Visibility
- 100% Pallai Visibility
- Automated Reporting
- Reduced Manual Work

---

## Notes for Claude

- Always ask before adding any feature not listed above
- Currency: PKR (Pakistani Rupee)
- Local breeds: Beetal, Kamori, Teddy (goats); Nili-Ravi, Kundi (buffaloes)
- Milk sessions: morning and evening only
- Pallai = shared livestock ownership/subscription model
- Platform must remain SaaS-ready (all data scoped to organization_id)
- Follow Agile sprints — complete one sprint before starting next
