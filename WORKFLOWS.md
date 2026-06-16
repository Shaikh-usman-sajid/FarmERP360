# FarmERP360 — Business Workflows

**Version**: 1.0 | **Last Updated**: 2026-06-16

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
  → Feed Management → Record Consumption
  → Enter quantity consumed per feed type
  → Stock level decreases automatically

Farm Manager review:
  → Feed Management → Summary tab
  → Check days remaining per feed type
  → Flag any type with < 7 days stock for reorder
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

### Month-End Close

```
Last day of month:

□ 1. Ensure all milk sales invoices are created and posted
□ 2. Record all vendor bills received this month
□ 3. Verify feed consumption is recorded for all days
□ 4. Process payroll (see Workflow 9)
□ 5. Record depreciation journal entry (if applicable)
□ 6. Reconcile bank balance:
     → Compare bank statement with Cash account in General Ledger
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
