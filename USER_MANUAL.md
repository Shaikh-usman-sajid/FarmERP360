# FarmERP360 — User Manual

**Version**: 1.0 | **Last Updated**: 2026-06-16  
**Platform**: Web (http://216.73.188.187:3000 or http://localhost)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Animal Management](#3-animal-management)
4. [Milk Production](#4-milk-production)
5. [Vaccination & Treatments](#5-vaccination--treatments)
6. [Feed Management](#6-feed-management)
7. [Inventory Management](#7-inventory-management)
8. [Agriculture Management](#8-agriculture-management)
9. [Employee Management](#9-employee-management)
10. [Tasks](#10-tasks)
11. [Attendance](#11-attendance)
12. [Investors Module](#12-investors-module)
13. [Pallai Management](#13-pallai-management)
14. [Invoices & Payments](#14-invoices--payments)
15. [Accounting ERP](#15-accounting-erp)
16. [Reports & Analytics](#16-reports--analytics)
17. [Forecasting](#17-forecasting)
18. [User Management](#18-user-management)
19. [Admin Settings](#19-admin-settings)
20. [Role-Based Access Reference](#20-role-based-access-reference)

---

## 1. Getting Started

### Logging In

1. Open the application URL in your browser
2. Enter your email and password
3. Click **Login**

The system automatically redirects you to the appropriate dashboard based on your role.

### Demo Credentials (for testing)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@farmerp360.com | Admin123!@# |
| Owner | owner@farmerp360.com | Owner123!@# |
| Accountant | accountant@farmerp360.com | Acc123!@# |
| Farm Manager | manager@farmerp360.com | Mgr123!@# |
| Vet Manager | vet@farmerp360.com | Vet123!@# |
| Employee | employee@farmerp360.com | Emp123!@# |
| Investor | investor1@farmerp360.com | Inv123!@# |
| Pallai Customer | customer1@farmerp360.com | Cust123!@# |

### Navigation

- **Sidebar** (left): Access all modules. Links shown depend on your role.
- **Sign Out**: Click your name at the bottom of the sidebar → "→ Sign out"
- **Active page**: Highlighted in gold in the sidebar.

---

## 2. Dashboard

The dashboard shows a summary of key performance indicators (KPIs) for your role.

### Owner Dashboard
- Total animals, milk production (today), revenue (this month), active employees
- Milk production trend chart (last 30 days)
- Quick links to critical alerts (low stock, overdue vaccinations)

### Farm Manager Dashboard
- Animal health summary, today's milk sessions, pending tasks
- Feed stock levels

### Accounting Dashboard
- Receivables vs Payables summary, monthly cash position
- Overdue invoices count

### Investor Dashboard
- Your total capital, distributed profit, current ROI
- Portfolio breakdown

---

## 3. Animal Management

**Access**: Owner, Farm Manager, Vet, Employee, Data Entry, Investor (view), Pallai Customer (view)

### Adding an Animal

1. Go to **Animals** in the sidebar
2. Click **Add Animal**
3. Fill in:
   - **Ear Tag** (unique identifier, e.g. EAR-001)
   - **Species**: Buffalo, Goat, Cattle, Other
   - **Breed**: e.g. Nili-Ravi, Beetal, Kamori
   - **Gender**, **Date of Birth** (or Age)
   - **Status**: Active, Sold, Deceased, Transferred
   - **Purchase Price** (PKR)
4. Click **Save**

### Uploading Animal Photos

1. Open an animal record (click its row)
2. Go to the **Photos** tab
3. Click **Upload Photo** → select an image file
4. Photos are displayed in a gallery view

### Weight Tracking

1. Open an animal record
2. Go to the **Weight** tab
3. Click **Add Weight Entry** → enter weight (kg) and date
4. View weight history chart

### Editing / Deactivating an Animal

- Click the **Edit** icon on any animal row
- To mark as sold or deceased, change the **Status** field

---

## 4. Milk Production

**Access**: Owner, Farm Manager, Employee

### Recording Milk

1. Go to **Milk Production**
2. Click **Record Milk**
3. Select:
   - **Animal** (from active female buffaloes/cows)
   - **Session**: Morning or Evening
   - **Date**
   - **Quantity** (liters)
   - **Quality notes** (optional)
4. Click **Save**

### Daily Summary

- The page header shows **today's total** (morning + evening combined)
- Use the date filter to view any past day
- Export or print the summary for records

### Milk Sales

1. Click **Record Sale**
2. Enter buyer name, quantity (liters), rate per liter (PKR), date
3. The system calculates total automatically

---

## 5. Vaccination & Treatments

### Vaccinations

**Access**: Owner, Farm Manager, Vet, Employee

1. Go to **Vaccination**
2. Click **Add Vaccination**
3. Select animal, vaccine name, date administered, next due date
4. Records show as overdue (highlighted) when the next due date passes

### Treatments

**Access**: Owner, Farm Manager, Vet

1. Go to **Treatments**
2. Click **Add Treatment**
3. Select animal, diagnosis, treatment given, cost (PKR), vet name, date
4. Treatment costs are factored into animal profitability reports

### Breeding Records

- Accessible from the **Health** section
- Record sire details, mating date, expected delivery date
- System tracks actual delivery vs expected

---

## 6. Feed Management

**Access**: Owner, Farm Manager, Employee, Data Entry

### Feed Types

1. Go to **Feed Management**
2. The **Feed Types** tab shows all registered feed types (e.g. Berseem, Tori Khal, Corn Silage)
3. Click **Add Feed Type** to register a new one (name, category, unit, reorder level, cost per unit)

### Recording Stock (Feed IN)

1. Click **Add Stock**
2. Select feed type, enter quantity received, cost per unit, date, supplier
3. Current stock level updates automatically

### Recording Daily Consumption (Feed OUT)

1. Go to the **Record Consumption** tab
2. Choose a recording mode:
   - **Herd / Species** — record total consumption for a whole herd (select species: Goat, Buffalo, Cattle, or Other)
   - **Individual Animal** — record consumption for a single animal (select from active animals list)
3. Select **Feed Type**, enter **Quantity**, choose **Session** (Morning / Evening / Both), and set the **Date**
4. Click **Record Consumption** — stock level decreases automatically
5. View all past records on the **Consumption Log** tab; individual records can be deleted (stock is restored on delete)

> **Note**: Consumption entries do not appear as manual stock transactions in Stock History. Use **Add / Adjust Feed Stock** on the same tab to record purchases or manual adjustments.

### Feed Summary

- The **Overview** tab shows all feed types with current stock, 30-day consumption, and a 6-month trend chart
- A **LOW** badge appears only on feed types that have a minimum stock level configured **and** have dropped to or below that threshold

---

## 7. Inventory Management

**Access**: Owner, Farm Manager, Data Entry

### Products

1. Go to **Inventory**
2. Click **Add Product** to register medicines, equipment, supplies
3. Set minimum stock level for low-stock alerts

### Stock Transactions

- **IN**: Record purchases (increase stock)
- **OUT**: Record usage (decrease stock)
- **ADJUST**: Correct stock count (physical count reconciliation)

Each transaction records quantity, unit price, date, and reference.

---

## 8. Agriculture Management

**Access**: Owner, Farm Manager

### Fields

1. Go to **Agriculture**
2. The **Fields** tab lists all registered fields with area (acres) and location
3. Click **Add Field** to register a new field

### Crop Cycles

1. Click **Add Crop Cycle**
2. Select field, crop name (e.g. Berseem, Maize, Wheat), variety
3. Enter sowing date, expected harvest date, seed cost
4. Status: Planned → Growing → Harvested / Failed

### Recording a Harvest

1. Find the active crop cycle
2. Click **Record Harvest**
3. Enter actual yield (kg), harvest date, sale price per kg

---

## 9. Employee Management

**Access**: Owner, Farm Manager

### Adding an Employee

1. Go to **Employees**
2. Click **Add Employee**
3. Fill in: name, CNIC (national ID), phone, designation, salary (PKR/month), join date
4. Link to a user account (optional, for system access)

### Viewing Employee Details

- Click any employee row to see full profile, attendance history, salary records

---

## 10. Tasks

**Access**: Owner, Farm Manager (create/assign), Employee (view own tasks)

### Creating a Task

1. Go to **Tasks**
2. Click **Add Task**
3. Enter title, description, assign to employee, set due date and priority (Low / Medium / High)

### Task Lifecycle

| Status | Who can change |
|--------|---------------|
| Pending → In Progress | Assigned employee (click Start) |
| In Progress → Completed | Assigned employee (click Complete) |
| Any → Cancelled | Farm Manager / Owner |

---

## 11. Attendance

**Access**: Owner, Farm Manager (mark), Employee (view own)

### Marking Attendance

1. Go to **Attendance**
2. Click **Mark Attendance**
3. Select employee, date, status (Present / Absent / Half Day / Leave)
4. Add remarks if needed

Attendance data feeds into monthly payroll calculations.

---

## 12. Investors Module

**Access**: Owner, Accountant (full management) | Investor role (portal only)

### Adding an Investor

1. Go to **Investor Management**
2. Click **Add Investor**
3. Enter name, CNIC, phone, profit share % (must total ≤ 100% across all investors)

### Recording Capital Contributions

1. Open an investor record
2. Go to **Capital** tab → **Add Contribution**
3. Enter amount (PKR), type (Deposit / Withdrawal), date, notes

### Recording Profit Distributions

1. Go to **Investor Management** → **Distributions** tab
2. Click **Record Distribution**
3. Select investor, type (Profit / Dividend / Return of Capital), amount, date

### Investor Portal (Investor role)

Investors log in and see **My Investment** in the sidebar:
- Current capital balance
- Total distributed profit
- ROI percentage
- Owned animals list
- Distribution history

---

## 13. Pallai Management

Pallai is a shared livestock subscription service — customers subscribe to receive daily milk or share in animal ownership.

### Pallai Packages

1. Go to **Pallai Overview** → **Packages** tab
2. Click **Add Package**: name, monthly price (PKR), includes feed/vet flags

### Pallai Customers

1. Go to **Pallai Overview** → **Customers** tab
2. Click **Add Customer**: name, CNIC, phone, address

### Subscriptions

1. Open a customer record
2. Go to **Subscriptions** tab → **Add Subscription**
3. Select package, animal, start date, duration (months)

### Generating Monthly Billing

1. Go to **Pallai Overview** → **Billing** tab
2. Select month and year
3. Click **Generate Invoices** — system auto-creates invoices for all active subscriptions

### Pallai Customer Portal

Customers log in and see **My Portal** in the sidebar:
- Active subscriptions
- Animal photos and health records
- Invoice history and balance

### Other Pallai Pages

| Page | Purpose |
|------|---------|
| Animal Gallery | Browse photos of subscribed animals |
| Customer Ledger | Running balance per customer |
| Pallai Reports | Revenue summary, subscription breakdown |

---

## 14. Invoices & Payments

**Access**: Owner, Accountant, Data Entry (invoices) | Owner, Accountant (payments)

### Creating an Invoice

1. Go to **Invoices**
2. Click **New Invoice**
3. Select customer, due date, invoice date
4. Add line items: description, quantity, unit price
5. Total is calculated automatically
6. Save as **Draft** or **Send** immediately

### Invoice Statuses

| Status | Meaning |
|--------|---------|
| Draft | Not yet sent to customer |
| Sent | Sent, awaiting payment |
| Paid | Fully paid |
| Overdue | Past due date, unpaid |
| Cancelled | Voided |

### Recording a Payment

1. Go to **Payments**
2. Click **Record Payment**
3. Select invoice, enter amount paid, payment method, date
4. Invoice status updates automatically (Sent → Paid if fully settled)

---

## 15. Accounting ERP

**Access**: Owner, Accountant (full access)

### Chart of Accounts

Predefined 43-account structure (auto-seeded). Organized by:
- **1000s**: Assets (Current: Cash, AR, Inventory; Fixed: Livestock, Land, Equipment)
- **2000s**: Liabilities (AP, Salaries Payable, Loans)
- **3000s**: Equity
- **4000s**: Revenue (Milk Sales, Animal Sales, Pallai, Investor Income)
- **5000s**: Cost of Goods Sold
- **6000s**: Operating Expenses (Salaries, Feed, Vet, Utilities)

To add an account: **Chart of Accounts** → **Add Account** → enter code, name, type, normal balance.

### Journal Entries

1. Go to **Journal Entries** → **New Entry**
2. Add description and entry date
3. Add debit and credit lines (must balance to zero)
4. **Save as Draft** or **Post** immediately
5. Posted entries update the General Ledger. Use **Void** to reverse a posted entry.

### General Ledger

1. Go to **General Ledger**
2. Select an account from the dropdown
3. View all transactions with running balance
4. Filter by date range

### Trial Balance

- Go to **Trial Balance**
- Select "as of" date
- Shows all accounts with debit/credit totals — must balance

### Vendors & Bills (Accounts Payable)

1. **Vendors**: Register suppliers (name, contact, payment terms)
2. **Bills (AP)**: Create vendor bills, record amounts owed
3. Click **Pay** on a bill to record payment and reduce the balance

### Payroll

1. Go to **Payroll**
2. Click **Process Payroll**
3. Select month and year
4. System calculates salaries based on attendance (absent days are deducted)
5. Review the payroll run and confirm

### Financial Statements

| Statement | Location | Key Feature |
|-----------|----------|-------------|
| Profit & Loss | Accounting → P&L | Date range filter, revenue vs expense breakdown, bar chart |
| Balance Sheet | Accounting → Balance Sheet | As-of-date filter, assets = liabilities + equity verification |
| Cash Flow | Accounting → Cash Flow | Indirect method: Operating / Investing / Financing + opening/closing reconciliation |
| AR Aging | Accounting → Receivables | Outstanding invoices bucketed by age (0-30, 31-60, 61-90, 90+ days) |

---

## 16. Reports & Analytics

**Access**: Owner, Accountant, Farm Manager

Go to **Reports** in the sidebar. Eight tabs:

| Tab | Contents |
|-----|---------|
| Overview | KPI cards (animals, milk, revenue, expenses) with month-over-month comparison |
| Milk | Daily/monthly milk production charts, top producing animals |
| Cash Flow | Monthly inflow vs outflow bar chart |
| Farm Health | Vaccination compliance, treatment costs, breeding success rate |
| Animals | Species breakdown, status distribution, profitability per animal |
| Inventory | Stock levels, low-stock alerts, transaction history |
| Investors | Capital vs distributed profit, ROI per investor |
| Pallai | Active subscriptions, revenue per package, customer payment status |

---

## 17. Forecasting

**Access**: Owner, Farm Manager, Accountant

Go to **Forecasting** in the sidebar. Three tabs:

### Feed Forecast
- Shows projected daily feed consumption per feed type
- **Depletion Date**: when current stock runs out at current consumption rate
- **Reorder Alert**: items expected to run out within 30 days are highlighted
- **Monthly Cost Projection**: estimated feed spend for next N months

### Cash Flow Forecast
- Projects monthly revenue (milk trend × adjustable price per liter)
- Projects monthly expenses (salary + feed costs)
- Shows net cash flow and cumulative position
- Adjust **Milk Price (PKR/L)** and **Months Ahead** using the controls

### Crop Yield Forecast
- Shows historical yield accuracy per crop (actual vs estimated)
- Active crop cycles: projected yield based on historical performance
- Seasonal recommendations for crop planning

---

## 18. User Management

**Access**: Super Admin, Owner only

### Adding a User

1. Go to **Users**
2. Click **Add User**
3. Enter full name, email, role, and temporary password
4. The user can log in immediately

### Roles Overview

| Role | Access Level |
|------|-------------|
| super_admin | Full system access, all organizations |
| owner | Full access to own organization |
| farm_manager | Farm operations (animals, milk, feed, employees, tasks) |
| vet_manager | Animal health records |
| accountant | Full accounting + reports |
| employee | Record milk, feed consumption, view own tasks/attendance |
| data_entry | Add animals, inventory, feed data |
| investor | View own investment portfolio only |
| pallai_customer | View own subscriptions and animal gallery only |

### Deactivating a User

- Edit the user record and toggle **Active** to off
- Deactivated users cannot log in but their records are preserved

---

## 19. Admin Settings

**Access**: Super Admin, Owner only  
Navigate to **Admin Settings** in the sidebar (under the Admin section).

### Organization Tab
Set your farm's display name, address, phone, email, NTN (tax number), and registration number. This information appears on printed invoices and reports.

### Preferences Tab
| Setting | Description |
|---------|-------------|
| Default Milk Price | Pre-fills the milk price field on sales forms (PKR/liter) |
| Currency | Display label for all financial figures |
| Fiscal Year Start Month | Used for annual P&L period calculations |
| Low Stock Alert Days | Feed types with fewer days remaining than this threshold are flagged |
| Low Inventory Threshold | Inventory items below this unit count trigger low-stock badges |
| Date Format | DD/MM/YYYY (Pakistan standard), MM/DD/YYYY, or YYYY-MM-DD |

### Integrations Tab

#### WhatsApp Business API
1. Create a Meta Business account at business.facebook.com
2. Set up a WhatsApp Business app → get Phone Number ID and Access Token
3. Enter credentials in the Integrations tab → enable the toggle
4. Use **Test** button to verify the connection (enter your number in international format: `923001234567`)
5. Use **Send Alerts** to broadcast a daily summary to farm staff numbers

Alerts include: overdue vaccinations, overdue invoices, feed types below minimum stock.

#### Easypaisa
1. Register as a merchant at easypaisa.com.pk/business
2. Obtain Store ID, Hash Key, and Easypaisa Account Number
3. Enter in the Integrations tab → enable the toggle
4. A **Pay** button appears on unpaid invoices → customers can pay via Easypaisa

#### JazzCash
1. Register as a merchant at jazzcash.com.pk
2. Obtain Merchant ID, Password, and Integrity Salt
3. Enter in the Integrations tab → enable the toggle
4. A **Pay** button appears on unpaid invoices → customers can pay via JazzCash

Both gateways automatically mark invoices as **Paid** when payment is confirmed via webhook.

### Audit Logs Tab
Full history of all actions taken in the system:
- Filter by **Module** (animals, accounting, pallai, etc.) or **Action** keyword
- Columns: Timestamp, User, Role, Module, Action, Record ID
- Paginated — 50 entries per page
- Read-only — cannot be edited or deleted

### Animal QR Codes
On the Animals list page, each row has a **QR** button. Clicking it downloads a branded PNG QR code for that animal. The QR encodes the animal's profile URL — scan it with any phone camera to open the animal record directly.

---

## 20. Role-Based Access Reference

| Module | super_admin | owner | farm_manager | vet_manager | accountant | employee | data_entry | investor | pallai_customer |
|--------|:-----------:|:-----:|:------------:|:-----------:|:----------:|:--------:|:----------:|:--------:|:---------------:|
| Dashboard | ✅ | ✅ | ✅ | — | ✅ | — | — | ✅ | — |
| Animals | ✅ | ✅ | ✅ | ✅ | — | view | ✅ | view | view |
| Milk | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — |
| Vaccination | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — | — |
| Treatments | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — |
| Feed Management | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | — |
| Inventory | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — |
| Agriculture | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Employees | ✅ | ✅ | ✅ | — | — | — | — | — | — |
| Tasks | ✅ | ✅ | ✅ | — | — | own | — | — | — |
| Attendance | ✅ | ✅ | ✅ | — | — | own | — | — | — |
| Investors | ✅ | ✅ | — | — | ✅ | — | — | portal | — |
| Pallai | ✅ | ✅ | ✅ | — | ✅ | — | — | — | portal |
| Invoices | ✅ | ✅ | — | — | ✅ | — | ✅ | — | — |
| Payments | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| Accounting | ✅ | ✅ | — | — | ✅ | — | — | — | — |
| Reports | ✅ | ✅ | ✅ | — | ✅ | — | — | — | — |
| Forecasting | ✅ | ✅ | ✅ | — | ✅ | — | — | — | — |
| Admin Settings | ✅ | ✅ | — | — | — | — | — | — | — |
| Users | ✅ | ✅ | — | — | — | — | — | — | — |

---

## Common Questions

**Q: Why can't I see a module in the sidebar?**  
A: Each module is role-restricted. Ask your admin to check your assigned role.

**Q: How do I change my password?**  
A: Currently handled by an admin via User Management. Self-service password change is available via the API.

**Q: Can I delete data?**  
A: Most records use soft-delete (deactivated, not erased) to preserve audit trails. Only admins can perform hard deletes.

**Q: What currency does the system use?**  
A: All financial amounts are in PKR (Pakistani Rupee).

**Q: How do I reset all data to demo state?**  
A: (Admin only) Run: `docker compose down -v && docker compose up --build`
