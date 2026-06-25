# FarmERP360 — Business Workflows

**Version**: 1.1 | **Last Updated**: 2026-06-25

This document describes the standard operating workflows for each business process in FarmERP360.

---

## Table of Contents

1. [Daily Farm Operations](#1-daily-farm-operations)
2. [Animal Lifecycle](#2-animal-lifecycle)
3. [Milk Production & Sales](#3-milk-production--sales)
4. [Animal Health Management](#4-animal-health-management)
5. [Feed Management](#5-feed-management)
6. [Pallai Subscription Workflow](#6-pallai-subscription-workflow)
7. [Investor Management Workflow](#7-investor-management-workflow)
8. [Invoicing & Payment Workflow](#8-invoicing--payment-workflow)
9. [Monthly Payroll Workflow](#9-monthly-payroll-workflow)
10. [Accounting Close Workflow](#10-accounting-close-workflow)
11. [New Employee Onboarding](#11-new-employee-onboarding)
12. [Crop Cycle Workflow](#12-crop-cycle-workflow)
13. [Month-End Reporting](#13-month-end-reporting)
14. [Admin Setup & Configuration](#14-admin-setup--configuration)
15. [WhatsApp Notification Workflow](#15-whatsapp-notification-workflow)
16. [Online Payment Collection Workflow](#16-online-payment-collection-workflow)
17. [Animal QR Code Workflow](#17-animal-qr-code-workflow)

---

## 1. Daily Farm Operations

### Morning Routine (Employee / Farm Manager)

```
06:00  Mark attendance for all employees
         → Attendance module → Mark Attendance → Present/Absent

07:00  Record morning milk session
         → Milk Production → Record Milk → Session: Morning
         → Enter quantity per animal

08:00  Record feed consumption
         → Feed Management → Record Consumption
         → Enter kg consumed per feed type

       Check task list
         → Tasks → My Tasks → Start any pending tasks
```

### Evening Routine

```
17:00  Record evening milk session
         → Milk Production → Record Milk → Session: Evening

18:00  Review low-stock alerts on Feed Summary
         → Feed Management → Summary tab
         → Reorder any feed type with < 7 days remaining

       Complete or update task progress
         → Tasks → Mark tasks complete
```

### Weekly Check (Farm Manager)

```
Every Monday:
  1. Review Dashboard KPIs for the previous week
  2. Check overdue vaccinations → Vaccination module
  3. Review feed stock levels → Feed Management → Summary
  4. Review pending tasks → Tasks → all employees
  5. Check animal health alerts
```

---

## 2. Animal Lifecycle

### Purchasing / Registering a New Animal

```
1. Animal arrives at farm
2. Farm Manager → Animals → Add Animal
   - Enter ear tag, species, breed, gender, DOB, purchase price
   - Status: Active
3. Upload initial photo
   - Animals → open record → Photos → Upload Photo
4. Record initial weight
   - Animals → open record → Weight → Add Weight Entry
5. Schedule first vaccination
   - Vaccination → Add Vaccination → set next due date
6. Record purchase as accounting entry (optional)
   - Accounting → Journal Entries → New Entry
   - DR: Livestock Asset account (1300)
   - CR: Cash or AP account
```

### Animal Sale

```
1. Owner/Farm Manager agrees sale terms
2. Update animal status
   - Animals → Edit → Status: Sold
3. Issue invoice to buyer
   - Invoices → New Invoice → add line item for animal
4. Record payment received
   - Payments → Record Payment → link to invoice
5. Record accounting entry
   - DR: Cash/AR (1100)
   - CR: Livestock Asset (1300)
   - CR/DR: Gain or Loss on Sale
```

### Animal Death / Transfer

```
1. Animals → Edit → Status: Deceased or Transferred
2. Add notes with cause of death or transfer details
3. If deceased: record journal entry to remove from assets
   - DR: Loss on Animal (expense)
   - CR: Livestock Asset (1300)
```

---

## 3. Milk Production & Sales

### Daily Milk Recording Workflow

```
Morning session (employee):
  Milk Production → Record Milk
  → Select each milking animal
  → Enter liters for Morning session
  → Save

Evening session (employee):
  Repeat for Evening session

Farm Manager review (daily):
  Milk Production → Daily Summary
  → Verify totals match physical records
  → Check for unusually low output (possible health issue)
```

### Milk Sale Workflow

```
1. Agree price with buyer (PKR per liter)
2. Dairy → Record Sale
   → Enter buyer name, quantity, rate, date
3. Issue formal invoice if required
   → Invoices → New Invoice
4. Collect payment
   → Payments → Record Payment
5. Monthly: review Milk tab in Reports for production trends
```

---

## 4. Animal Health Management

### Vaccination Schedule Workflow

```
1. Vet/Farm Manager sets schedule
   → Vaccination → Add Vaccination
   → Set next due date

2. System shows overdue vaccinations highlighted on the list

3. Weekly: Farm Manager checks for upcoming vaccinations
   → Vaccination → filter by upcoming due dates

4. After administering:
   → Edit vaccination record → update date administered
   → Set new next due date
```

### Treatment Workflow

```
Animal shows illness symptoms:
  1. Vet Manager → Treatments → Add Treatment
     → Record diagnosis, treatment given, cost, vet name
  2. Monitor recovery — add follow-up treatment record if needed
  3. Treatment costs automatically appear in animal profitability report
  4. If contagious: isolate animal (update notes on animal record)
```

### Breeding Workflow

```
1. Record mating
   → Health → Breeding Records → Add Record
   → Enter sire details, mating date
   → System calculates expected delivery (based on species gestation period)

2. At delivery:
   → Edit breeding record → enter actual delivery date, offspring count

3. Register offspring as new animals
   → Animals → Add Animal (species matching parent)
```

---

## 5. Feed Management

### Feed Purchase Workflow

```
1. Identify need (low stock alert or planned purchase)
2. Contact supplier, agree price
3. Receive feed delivery
4. Record stock IN:
   → Feed Management → Add Stock
   → Select feed type, quantity, cost per unit, supplier, date
5. Stock level updates automatically
6. (Optional) Record as vendor bill:
   → Accounting → Bills → Create Bill
```

### Daily Consumption Recording

```
Employee (morning or evening):
  → Feed Management → Record Consumption tab
  → Choose mode:
      Herd / Species  — for whole-herd feeding (Goat, Buffalo, Cattle, Other)
      Individual Animal — for per-animal feeding
  → Select feed type, quantity, session (Morning / Evening / Both), date
  → Click Record Consumption → stock decreases automatically
  → View / delete past entries on Consumption Log tab

Farm Manager review:
  → Feed Management → Overview tab
  → Check current stock and 30-day usage per feed type
  → LOW badge appears only on types with a minimum stock level configured
  → Flag any type approaching its reorder level for purchase
```

### Feed Forecasting Review (Weekly)

```
Farm Manager:
  → Forecasting → Feed tab
  → Review depletion dates
  → Initiate purchase for any feed running out within 14 days
  → Adjust Months Ahead slider to plan budget
```

---

## 6. Pallai Subscription Workflow

### New Customer Onboarding

```
1. Customer inquiry received
2. Owner / Farm Manager:
   → Pallai Overview → Customers → Add Customer
   → Enter name, CNIC, phone, address

3. Create subscription:
   → Open customer record → Subscriptions → Add Subscription
   → Select package, assign animal, set start date, duration

4. Issue welcome invoice:
   → Pallai Overview → Billing → Generate Invoices
   → Or manually: Invoices → New Invoice → select customer

5. Share portal login credentials with customer
   → Users → Add User → role: pallai_customer
   → Link to customer record
```

### Monthly Billing Workflow

```
On the 1st of each month:
  1. Accountant / Owner:
     → Pallai Overview → Billing tab
     → Select month and year
     → Click Generate Invoices
     → System creates one invoice per active subscription

  2. Review generated invoices
     → Invoices → filter by current month

  3. Send invoices to customers (via WhatsApp/phone currently)

  4. As payments come in:
     → Payments → Record Payment → link to invoice

  5. Monthly: review Pallai Reports for revenue summary
```

### Customer Cancellation

```
1. Owner / Farm Manager:
   → Pallai Overview → Subscriptions
   → Edit subscription → set end date → Status: Inactive

2. Issue final invoice if any amount outstanding

3. Deactivate customer user account if applicable
   → Users → Edit → Active: off
```

---

## 7. Investor Management Workflow

### New Investor Onboarding

```
1. Owner agrees terms (profit share %, initial capital)
2. Owner / Accountant:
   → Investor Management → Add Investor
   → Enter name, CNIC, profit share %

3. Record initial capital:
   → Open investor record → Capital → Add Contribution
   → Type: Deposit, amount, date

4. Record as journal entry:
   → Accounting → Journal Entries
   → DR: Cash/Bank (1100)
   → CR: Investor Capital / Equity (3100)

5. Create investor login (optional):
   → Users → Add User → role: investor
   → Investor can view portfolio via My Investment portal
```

### Monthly Profit Distribution

```
After month-end accounting close:
  1. Owner calculates distributable profit from P&L

  2. For each investor:
     → Investor Management → Distributions → Record Distribution
     → Type: Profit, amount = profit × investor's share %, date

  3. Record payment made:
     → Record actual bank transfer to investor
     → Accounting → Journal Entry:
       DR: Retained Earnings / Profit Distribution (3100)
       CR: Cash/Bank (1100)

  4. Investor can view their updated distribution history via portal
```

---

## 8. Invoicing & Payment Workflow

### Standard Invoice → Payment Flow

```
[Invoice Created] → [Sent to Customer] → [Payment Received] → [Closed]

1. Create invoice:
   → Invoices → New Invoice
   → Add customer, line items, due date
   → Status: Draft

2. Review and send:
   → Edit invoice → Status: Sent
   → Share with customer (download/print)

3. Record payment:
   → Payments → Record Payment
   → Select invoice, enter amount and date
   → System sets invoice to Paid if fully settled

4. Partial payment:
   → Record payment for partial amount
   → Invoice remains Sent with outstanding balance visible
   → Record further payments until fully paid
```

### Overdue Invoice Handling

```
When invoice passes due date with no payment:
  → Status automatically shows Overdue

  1. Accountant reviews: Accounting → Receivables
     → AR Aging report shows overdue invoices by bucket (30/60/90/90+ days)

  2. Follow up with customer

  3. If uncollectable: write off
     → Accounting → Journal Entry
     → DR: Bad Debt Expense (6000s)
     → CR: Accounts Receivable (1100)
```

---

## 9. Monthly Payroll Workflow

```
On the last working day of the month:

1. Verify attendance is fully marked for all employees:
   → Attendance → filter by current month
   → Confirm all days are recorded (Present / Absent / Leave)

2. Process payroll:
   → Accounting → Payroll → Process Payroll
   → Select month and year
   → Review calculated salaries (deductions applied for absences)
   → Confirm

3. System creates payroll run record with breakdown per employee

4. Make salary payments (bank transfers)

5. Record accounting entry:
   → Accounting → Journal Entries → New Entry
   → DR: Salaries Expense (6100)
   → CR: Cash/Bank (1100)
   → (or CR: Salaries Payable 2100 if not paid immediately)
```

---

## 10. Accounting Close Workflow

### Journal Entry Lifecycle

```
Draft  →  Post  →  (Void if needed)

1. Create entry:
   → Accounting → Journal Entries → New Entry
   → Add description, date, debit lines, credit lines
   → Total debits MUST equal total credits (system enforces this)
   → Click Save as Draft

2. Review draft:
   → Journal Entries list shows status = DRAFT
   → Draft entries are NOT visible in General Ledger or any reports

3. Post entry:
   → Open the draft entry → click Post
   → Status changes to POSTED
   → Entry now appears in General Ledger, Trial Balance, P&L, Balance Sheet

4. To reverse a mistake:
   → Open posted entry → click Void
   → A new offsetting entry is created automatically
   → Original entry status changes to VOIDED

Note: Only POSTED entries appear in the General Ledger.
      If the ledger shows empty for an account, check that
      entries exist AND have been posted.
```

### Viewing the General Ledger

```
Accountant / Owner:
  → Accounting → General Ledger
  → Select account from dropdown (e.g. "1010 — Bank - Main Account")
  → Optionally set Date From and Date To
  → Click View Ledger
  → Table shows: date | entry # | description | debit | credit | running balance
  → Closing balance shown at bottom

Tip: If all accounts appear empty, post at least one journal entry first.
     Draft entries are invisible to the ledger.
```

### Month-End Close

```
Last day of month:

□ 1. Ensure all milk sales invoices are created and posted
□ 2. Record all vendor bills received this month
□ 3. Verify feed consumption is recorded for all days
□ 4. Process payroll (see Workflow 9)
□ 5. Record and POST depreciation journal entry (if applicable)
□ 6. Reconcile bank balance:
     → Accounting → General Ledger → select Bank - Main Account (1010)
     → Set date range to current month
     → Compare closing balance with bank statement
□ 7. Review Trial Balance → Accounting → Trial Balance
     → Confirm debits = credits
□ 8. Run Profit & Loss → Accounting → P&L
     → Review for anomalies
□ 9. Run Balance Sheet → Accounting → Balance Sheet
     → Confirm assets = liabilities + equity
□ 10. Export/print financial statements for owner review
□ 11. Distribute investor profit shares (see Workflow 7)
□ 12. Generate Pallai invoices for next month (see Workflow 6)
```

---

## 11. New Employee Onboarding

```
1. HR / Farm Manager:
   → Employees → Add Employee
   → Enter personal details, designation, monthly salary, join date

2. (If system access needed) Create user account:
   → Users → Add User
   → Role: employee (or data_entry)
   → Link to employee record

3. Mark first day attendance:
   → Attendance → Mark Attendance → Present

4. Assign initial tasks:
   → Tasks → Add Task → assign to new employee
```

---

## 12. Crop Cycle Workflow

```
[Plan] → [Sow] → [Grow] → [Harvest] → [Record]

1. Plan:
   → Agriculture → Add Crop Cycle
   → Select field, crop, variety, expected sow/harvest dates
   → Status: Planned

2. At sowing:
   → Edit crop cycle → Status: Growing
   → Enter actual sow date and seed cost

3. During growth:
   → Monitor via Agriculture module
   → Forecasting → Crop Yield tab for projected output

4. At harvest:
   → Agriculture → Record Harvest
   → Enter actual yield (kg), harvest date, sale price
   → Status: Harvested

5. Sold harvest:
   → Invoices → New Invoice (if sold to buyer)
   → Record payment received
```

---

## 13. Month-End Reporting

```
Owner / Farm Manager / Accountant:

1. Reports → Overview tab
   → Review KPIs vs prior month

2. Reports → Milk tab
   → Check production trend, identify top/bottom animals

3. Reports → Animals tab
   → Review profitability per animal (treatment costs vs milk value)

4. Reports → Investors tab
   → Confirm ROI calculations are current

5. Accounting → Profit & Loss
   → Set date range to the closed month
   → Export/print for stakeholders

6. Accounting → Cash Flow
   → Review operating/investing/financing sections
   → Identify cash position trend

7. Forecasting → Cash Flow tab
   → Project next 3–6 months

8. Share reports with:
   → Owner: full financial summary
   → Investors: ROI + distribution statement (via portal or printed)
   → Farm Manager: operational KPIs
```

---

---

## 14. Admin Setup & Configuration

### First-Time Setup (Owner / Super Admin)

```
1. Go to Admin Settings → Organization tab
   → Enter farm name, address, phone, email, NTN, registration number
   → Click Save Changes

2. Go to Preferences tab
   → Set default milk price per liter (PKR)
   → Set fiscal year start month (default: July for Pakistan)
   → Set low stock alert threshold (days)
   → Click Save Changes

3. Go to Integrations tab
   → Configure any payment gateways or WhatsApp (see workflows 15 & 16)

4. Verify audit logs are populating
   → Admin Settings → Audit Logs tab
   → Recent logins and creates should appear
```

### Updating Settings

Settings can be changed at any time. Sensitive fields (API keys, passwords) display as `••••••••` once saved — re-enter to update, leave unchanged to keep existing.

---

## 15. WhatsApp Notification Workflow

### One-Time Setup

```
1. Create Meta Business account at business.facebook.com
2. Create WhatsApp Business app in Meta Developer Console
3. Add a phone number → get Phone Number ID
4. Generate a permanent access token (System User token recommended)
5. Admin Settings → Integrations → WhatsApp section:
   → Enter Phone Number ID, Access Token, Business Account ID
   → Enable toggle → Save Changes
6. Test: enter your number (e.g. 923001234567) → click Test
   → You should receive a test message on WhatsApp
```

### Daily Alert Workflow

```
Recommended: run every morning

Owner / Farm Manager:
  1. Admin Settings → Integrations → WhatsApp section
  2. Preview alerts panel shows current counts:
     - Overdue vaccinations
     - Overdue invoices
     - Feed types below minimum stock
  3. Enter recipient numbers (comma-separated)
  4. Click Send Alerts
  5. Each recipient receives a formatted WhatsApp message with all alerts
```

### Automatic Triggers (future)
Currently alerts are sent manually. A scheduled job (cron) can call the send endpoint automatically each morning once a task scheduler is set up.

---

## 16. Online Payment Collection Workflow

### Setup (once per gateway)

```
Easypaisa:
  1. Register merchant at easypaisa.com.pk/business
  2. Get: Store ID, Hash Key, Account Number
  3. Admin Settings → Integrations → Easypaisa → enable + enter credentials

JazzCash:
  1. Register merchant at jazzcash.com.pk
  2. Get: Merchant ID, Password, Integrity Salt
  3. Admin Settings → Integrations → JazzCash → enable + enter credentials
```

### Collecting Payment on an Invoice

```
1. Create or find an outstanding invoice (status: Sent or Overdue)
2. Invoices page → click Pay button on the invoice row
3. Payment modal appears with enabled gateway(s)
4. Share the payment link / QR with the customer:
   - Option A: Customer comes to your office → you submit the form for them
   - Option B (future): Generate a shareable payment URL for the customer
5. Customer completes payment on Easypaisa/JazzCash portal
6. Gateway sends a webhook to FarmERP360
7. Invoice status automatically changes to Paid
```

### Manual Fallback

If a customer pays via bank transfer or cash:
```
→ Payments → Record Payment → select invoice → enter amount and date
```

---

## 17. Animal QR Code Workflow

### Generating & Printing QR Labels

```
1. Animals page → find the animal
2. Click the QR button in the action column
3. A PNG file downloads: animal_{ear_tag}_qr.png
4. Print the PNG on a label sticker (recommended: 5cm × 5cm waterproof label)
5. Attach to the animal's ear tag holder, feed stall, or records folder
```

### Scanning a QR Code

```
1. Open phone camera (any modern smartphone)
2. Point at the QR label
3. Tap the notification → opens animal profile in the browser
4. Staff can immediately see: species, breed, health records, weight history
```

### QR Code Contents

Each QR encodes the URL: `{base_url}/animals?id={animal_id}&tag={ear_tag}`  
The base URL defaults to the server's origin. It can be set to your public domain once deployed with SSL.

---

## Quick Reference: Who Does What

| Task | Primary Role | Supporting Role |
|------|-------------|-----------------|
| Record milk | Employee | Farm Manager |
| Record feed consumption | Employee | Farm Manager |
| Mark attendance | Farm Manager | Employee (own) |
| Add/update animals | Farm Manager | Data Entry |
| Vaccinations / treatments | Vet Manager | Farm Manager |
| Process payroll | Accountant | Owner |
| Generate Pallai invoices | Accountant | Owner |
| Record investor distributions | Owner | Accountant |
| Create journal entries | Accountant | Owner |
| Run financial reports | Accountant | Owner |
| Manage users | Owner | Super Admin |
| Review forecasts | Owner | Farm Manager, Accountant |
| Configure integrations | Owner | Super Admin |
| Send WhatsApp alerts | Owner | Farm Manager |
| Collect online payment | Accountant | Owner |
| Generate animal QR codes | Farm Manager | Data Entry |
