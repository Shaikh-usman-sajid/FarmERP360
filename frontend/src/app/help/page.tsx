'use client'
import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Step { text: string; note?: string }
interface Section {
  id: string
  title: string
  icon: string
  roles?: string[]
  overview: string
  subsections: {
    heading: string
    content?: string
    roles?: string[]
    steps?: Step[]
    fields?: { name: string; desc: string; required?: boolean }[]
    tip?: string
    warning?: string
  }[]
}

// ─── Role badge colours ───────────────────────────────────────────────────────
const ROLE_COLOUR: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  owner: 'bg-green-100 text-green-700',
  farm_manager: 'bg-blue-100 text-blue-700',
  vet_manager: 'bg-teal-100 text-teal-700',
  accountant: 'bg-amber-100 text-amber-700',
  employee: 'bg-gray-100 text-gray-600',
  data_entry: 'bg-orange-100 text-orange-700',
  investor: 'bg-indigo-100 text-indigo-700',
  pallai_customer: 'bg-rose-100 text-rose-700',
}

// ─── FULL MANUAL CONTENT ─────────────────────────────────────────────────────
const SECTIONS: Section[] = [
  // ── GETTING STARTED ───────────────────────────────────────────────────────
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    overview: 'FarmERP360 is an all-in-one farm management platform for Pakistani livestock and dairy operations. This guide covers every module and workflow available in the system.',
    subsections: [
      {
        heading: 'Logging In',
        steps: [
          { text: 'Open the application in your browser.' },
          { text: 'Enter your email address and password on the login screen.' },
          { text: 'Click Sign In. You will be redirected to your role-specific dashboard.' },
          { text: 'Use the demo credential buttons on the login page to quickly fill in test accounts.', note: 'Demo accounts are for testing only — do not use in production.' },
        ],
      },
      {
        heading: 'Navigating the App',
        content: 'The left sidebar contains all navigation links. The links shown depend on your user role — not all menu items are visible to every role. The top of each page shows the page title and any action buttons.',
      },
      {
        heading: 'Demo Credentials',
        fields: [
          { name: 'Owner', desc: 'owner@farmerp360.com — Owner123!@#' },
          { name: 'Farm Manager', desc: 'manager@farmerp360.com — Mgr123!@#' },
          { name: 'Accountant', desc: 'accountant@farmerp360.com — Acc123!@#' },
          { name: 'Vet', desc: 'vet@farmerp360.com — Vet123!@#' },
          { name: 'Employee', desc: 'employee@farmerp360.com — Emp123!@#' },
          { name: 'Investor', desc: 'investor1@farmerp360.com — Inv123!@#' },
          { name: 'Customer', desc: 'customer1@farmerp360.com — Cust123!@#' },
        ],
      },
    ],
  },

  // ── USER ROLES ────────────────────────────────────────────────────────────
  {
    id: 'user-roles',
    title: 'User Roles & Permissions',
    icon: '👥',
    overview: 'FarmERP360 uses role-based access control (RBAC). Every user is assigned one role that determines what they can see and do.',
    subsections: [
      {
        heading: 'Role Overview',
        fields: [
          { name: 'Super Admin', desc: 'Full system access across all organisations. Can create organisations and manage all users.' },
          { name: 'Owner', desc: 'Farm owner — full access to all farm modules, financial reports, investor data, and user management.' },
          { name: 'Farm Manager', desc: 'Manages daily farm operations: animals, milk, feed, attendance, inventory, agriculture.' },
          { name: 'Vet Manager', desc: 'Manages animal health: vaccinations, treatments, breeding records.' },
          { name: 'Accountant', desc: 'Manages all financial data: accounting, payroll, invoices, payments, reports.' },
          { name: 'Employee', desc: 'Farm worker — records milk production, attendance, and views animals.' },
          { name: 'Data Entry', desc: 'Data input operator — can record inventory, feed, and animal data.' },
          { name: 'Investor', desc: 'View-only access to their investment portfolio, ROI, capital, and distributions.' },
          { name: 'Pallai Customer', desc: 'View-only access to their subscribed animals, photos, and invoice ledger.' },
        ],
      },
      {
        heading: 'Creating a New User',
        roles: ['super_admin', 'owner'],
        steps: [
          { text: 'Navigate to Users (⚙️) in the sidebar.' },
          { text: 'Click Add User.' },
          { text: 'Fill in full name, email, and password.' },
          { text: 'Select the appropriate role from the dropdown.' },
          { text: 'Click Save. The user can now log in with those credentials.' },
          { text: 'To deactivate a user, click the toggle in the Users table. Deactivated users cannot log in.', note: 'Users cannot change their own role.' },
        ],
      },
    ],
  },

  // ── DAILY WORKFLOW ────────────────────────────────────────────────────────
  {
    id: 'daily-workflow',
    title: 'Daily Farm Workflow',
    icon: '📅',
    overview: 'A recommended daily operational checklist for farm staff. Follow this order every morning and evening to keep all records up to date.',
    subsections: [
      {
        heading: 'Morning Routine',
        steps: [
          { text: 'Mark employee attendance for the day (Farm Manager or Employee).' },
          { text: 'Record morning milk production for each milking animal.' },
          { text: 'Record morning feed consumption (feed type, quantity, species or individual animal).' },
          { text: 'Check the Feed Overview tab for any LOW STOCK alerts — reorder if needed.' },
          { text: 'Check Vaccination due-soon alerts on the Owner Dashboard.' },
          { text: 'Log any treatments or health observations to the Treatments module.' },
        ],
      },
      {
        heading: 'Evening Routine',
        steps: [
          { text: 'Record evening milk production for each milking animal.' },
          { text: 'Record evening feed consumption.' },
          { text: 'Review the daily milk summary on the Milk Production page.' },
          { text: 'Log any new health issues observed during the day.' },
        ],
      },
      {
        heading: 'Weekly Tasks',
        steps: [
          { text: 'Record animal weights for growing animals or recently purchased stock.' },
          { text: 'Upload new animal photos if available.' },
          { text: 'Review low-stock inventory items and place purchase orders.' },
          { text: 'Review outstanding invoices in the Invoices module and follow up on overdue payments.' },
          { text: 'Review pallai subscription billing and confirm all monthly invoices are generated.' },
        ],
      },
      {
        heading: 'Monthly Tasks',
        steps: [
          { text: 'Process monthly payroll: Accounting → Payroll → Create Run for the month.' },
          { text: 'Generate pallai billing for the month: Pallai → Billing → Generate.' },
          { text: 'Record investor profit distributions if applicable.' },
          { text: 'Run the Profit & Loss report to review the month\'s financial performance.' },
          { text: 'Review the Cash Flow analytics tab for income vs. expense trends.' },
          { text: 'Record any capital contributions from investors.' },
        ],
      },
    ],
  },

  // ── ANIMAL MANAGEMENT ─────────────────────────────────────────────────────
  {
    id: 'animals',
    title: 'Animal Management',
    icon: '🐐',
    roles: ['super_admin', 'owner', 'farm_manager', 'vet_manager', 'employee', 'data_entry'],
    overview: 'The central register for all livestock on the farm. Every animal has a unique code, species, breed, ownership type, and full history of health, milk, and weight records.',
    subsections: [
      {
        heading: 'Adding a New Animal',
        roles: ['super_admin', 'owner', 'farm_manager', 'data_entry'],
        steps: [
          { text: 'Navigate to Animals in the sidebar.' },
          { text: 'Click Add Animal.' },
          { text: 'Enter a unique Animal Code (e.g. GT-001 for goat 1). This is mandatory and used throughout the system.' },
          { text: 'Select Species: Goat, Buffalo, Cow, or Sheep.' },
          { text: 'Select Gender and enter Breed (e.g. Beetal, Nili-Ravi, Kundi).' },
          { text: 'Fill in Date of Birth, Purchase Date, and Purchase Price (PKR).' },
          { text: 'Set the Ownership Type: Farm, Investor, Shared, or Pallai.' },
          { text: 'Click Save. The animal is now in the system with Active status.' },
        ],
        tip: 'For Beetal and Kamori goats use species "Goat". For Nili-Ravi and Kundi use "Buffalo".',
      },
      {
        heading: 'Animal Status Lifecycle',
        fields: [
          { name: 'Active', desc: 'Animal is on the farm and operational.' },
          { name: 'Sold', desc: 'Animal has been sold. Set status to Sold and record the sale price.' },
          { name: 'Deceased', desc: 'Animal has died. Update status with the date and notes.' },
          { name: 'Transferred', desc: 'Animal moved to another farm or location.' },
        ],
      },
      {
        heading: 'Recording Weight',
        steps: [
          { text: 'Open the animal detail page by clicking the animal code in the list.' },
          { text: 'Scroll to the Weight History section.' },
          { text: 'Click Add Weight.' },
          { text: 'Enter the weight in kg and the recorded date.' },
          { text: 'Click Save. Weight history is maintained indefinitely.' },
        ],
      },
      {
        heading: 'Uploading Photos',
        steps: [
          { text: 'Open the animal detail page.' },
          { text: 'Click Upload Photo and select a JPG or PNG file.' },
          { text: 'The first uploaded photo becomes the primary photo automatically.' },
          { text: 'Primary photos appear in the Pallai animal gallery visible to customers.' },
        ],
      },
      {
        heading: 'Filtering & Searching Animals',
        content: 'Use the filter bar at the top of the Animals page to filter by species, status, or ownership type. Use the search box to find animals by code, name, or ear tag.',
      },
    ],
  },

  // ── MILK PRODUCTION ───────────────────────────────────────────────────────
  {
    id: 'milk',
    title: 'Milk Production',
    icon: '🥛',
    roles: ['super_admin', 'owner', 'farm_manager', 'employee'],
    overview: 'Records daily milk yield from each animal in morning and evening sessions. Sales are tracked separately. The dashboard automatically calculates today\'s total and monthly trends.',
    subsections: [
      {
        heading: 'Recording Milk Production',
        steps: [
          { text: 'Navigate to Milk Production.' },
          { text: 'Click Add Record.' },
          { text: 'Select the animal from the dropdown.' },
          { text: 'Select the Session: Morning or Evening.' },
          { text: 'Enter Quantity in litres (e.g. 4.5).' },
          { text: 'Optionally enter Fat Percentage if you have a lactometer reading.' },
          { text: 'Confirm the production date (defaults to today).' },
          { text: 'Click Save. The dashboard totals update immediately.' },
        ],
        tip: 'Record morning and evening as two separate entries for the same animal and date.',
      },
      {
        heading: 'Recording Milk Sales',
        steps: [
          { text: 'On the Milk Production page, open the Sales tab.' },
          { text: 'Click Add Sale.' },
          { text: 'Enter the buyer name, sale date, quantity sold (litres), and price per litre (PKR).' },
          { text: 'Total amount is calculated automatically.' },
          { text: 'Click Save.' },
        ],
      },
      {
        heading: 'Viewing Daily Summary',
        content: 'The Daily Summary tab shows total milk produced per day over the last 30 days (morning + evening combined), visible as both a table and a chart on the Reports page.',
      },
    ],
  },

  // ── ANIMAL HEALTH ─────────────────────────────────────────────────────────
  {
    id: 'health',
    title: 'Animal Health',
    icon: '💉',
    roles: ['super_admin', 'owner', 'farm_manager', 'vet_manager'],
    overview: 'Tracks vaccinations, medical treatments, and breeding records. Vaccination due-date alerts appear on the Owner Dashboard 7 days before they are due.',
    subsections: [
      {
        heading: 'Recording a Vaccination',
        steps: [
          { text: 'Navigate to Vaccination.' },
          { text: 'Click Add Vaccination.' },
          { text: 'Select the animal.' },
          { text: 'Enter the vaccine name (e.g. FMD, HS, BQ).' },
          { text: 'Enter administered date, dose, and administered by (vet name).' },
          { text: 'Set the Next Due Date for the follow-up dose.' },
          { text: 'Click Save. An alert will appear on the dashboard 7 days before the due date.' },
        ],
      },
      {
        heading: 'Recording a Treatment',
        steps: [
          { text: 'Navigate to Treatments.' },
          { text: 'Click Add Treatment.' },
          { text: 'Select the animal and enter the treatment date.' },
          { text: 'Fill in the Diagnosis, Treatment Description, and Medicine Used.' },
          { text: 'Enter the Cost in PKR.' },
          { text: 'Set a Follow-Up Date if required.' },
          { text: 'Once the animal recovers, check the Resolved checkbox and save.' },
        ],
        tip: 'Treatment costs per animal are used in the Animal Profitability analytics calculation.',
      },
      {
        heading: 'Recording a Breeding Record',
        steps: [
          { text: 'Navigate to Treatments → Breeding tab (or Treatments page).' },
          { text: 'Click Add Breeding Record.' },
          { text: 'Select the female animal (dam) and optionally the sire.' },
          { text: 'Enter the Breeding Date and Expected Delivery Date (approximately 5 months for goats, 10 months for buffaloes).' },
          { text: 'After delivery, update the record with Actual Delivery Date, Offspring Count, and Outcome.' },
        ],
      },
    ],
  },

  // ── FEED MANAGEMENT ───────────────────────────────────────────────────────
  {
    id: 'feed',
    title: 'Feed Management',
    icon: '🌿',
    roles: ['super_admin', 'owner', 'farm_manager', 'employee', 'data_entry'],
    overview: 'Dedicated module for managing feed types, stock levels, and daily consumption. Tracks what feed was purchased, how much is in stock, and how much is consumed each day. Automatically alerts on low stock.',
    subsections: [
      {
        heading: 'Setting Up Feed Types',
        roles: ['super_admin', 'owner', 'farm_manager'],
        steps: [
          { text: 'Navigate to Feed Management → Feed Types tab.' },
          { text: 'Click Add Feed Type.' },
          { text: 'Enter name (e.g. Lucerne, Dry Fodder, Concentrate/Rati, Silage, Berseem).' },
          { text: 'Select unit (kg, bundle, ton, bag).' },
          { text: 'Set Minimum Stock Level — the system alerts when stock drops to or below this level.' },
          { text: 'Enter Cost Per Unit (PKR) for expense tracking.' },
          { text: 'Optionally enter Suitable For (species this feed is intended for).' },
          { text: 'Click Save. The feed type appears in the stock and consumption forms.' },
        ],
        tip: '7 common Pakistani feed types are pre-seeded: Lucerne, Dry Fodder (Tori), Concentrate (Rati), Green Maize Silage, Mineral Supplement, Berseem, Rice Straw.',
      },
      {
        heading: 'Recording a Feed Purchase (Stock IN)',
        steps: [
          { text: 'Go to Feed Management → Record Consumption tab.' },
          { text: 'Scroll to the Add / Adjust Feed Stock section.' },
          { text: 'Select the feed type.' },
          { text: 'Set Transaction Type to Purchase (IN).' },
          { text: 'Enter the quantity received and Unit Cost (PKR) — total is auto-calculated.' },
          { text: 'Enter the Vendor name or reference number in the Reference field.' },
          { text: 'Click Save Stock Transaction. Stock level updates immediately.' },
        ],
      },
      {
        heading: 'Recording Daily Feed Consumption',
        steps: [
          { text: 'Go to Feed Management → Record Consumption tab.' },
          { text: 'Choose mode: Herd / Species (for feeding a whole herd at once) or Individual Animal.' },
          { text: 'Select the Feed Type and enter Quantity in the feed\'s unit (e.g. kg).' },
          { text: 'Select Session (Morning, Evening, or Both).' },
          { text: 'Confirm the date (defaults to today).' },
          { text: 'Click Record Consumption. Stock is auto-deducted and an OUT transaction is created.' },
        ],
        tip: 'Use Herd mode when you feed all goats or all buffaloes the same amount. Use Individual Animal for special diet animals.',
        warning: 'If stock drops to zero the system will still record consumption but the stock cannot go below zero. Top up stock promptly.',
      },
      {
        heading: 'Monitoring Stock Levels',
        content: 'The Overview tab shows a stock level bar for every feed type. Items marked LOW (in red) are at or below the minimum stock threshold. The Monthly Consumption Trend chart shows 6 months of consumption history to help plan purchases.',
      },
    ],
  },

  // ── INVENTORY ─────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    title: 'Inventory Management',
    icon: '📦',
    roles: ['super_admin', 'owner', 'farm_manager', 'data_entry'],
    overview: 'Manages general farm supplies — medicines, equipment, chemicals, spare parts. Separate from the Feed module. Tracks stock levels and prevents selling or using more than is in stock.',
    subsections: [
      {
        heading: 'Adding a Product',
        steps: [
          { text: 'Navigate to Inventory.' },
          { text: 'Click Add Product.' },
          { text: 'Enter the product Name, Category (e.g. Medicine, Equipment, Chemical), and Unit (e.g. vial, litre, piece).' },
          { text: 'Set Minimum Stock Level.' },
          { text: 'Enter Unit Cost (PKR).' },
          { text: 'Click Save.' },
        ],
      },
      {
        heading: 'Recording Stock Transactions',
        fields: [
          { name: 'IN', desc: 'Goods received (purchase). Increases stock by the entered quantity.' },
          { name: 'OUT', desc: 'Goods used or issued. Decreases stock. Returns an error if insufficient stock.' },
          { name: 'ADJUSTMENT', desc: 'Sets stock to an absolute value (for stocktakes/corrections).' },
        ],
      },
      {
        heading: 'Low Stock Alerts',
        content: 'Products at or below their minimum stock level are highlighted in red on the Inventory page. The Owner Dashboard also shows the total count of low-stock items. The Analytics → Inventory tab shows a full low-stock list and the top-consumed products over the last 30 days.',
      },
    ],
  },

  // ── AGRICULTURE ───────────────────────────────────────────────────────────
  {
    id: 'agriculture',
    title: 'Agriculture',
    icon: '🌾',
    roles: ['super_admin', 'owner', 'farm_manager'],
    overview: 'Manages farm fields and crop cycles. Track what is planted in each field, monitor growing crops, and record harvests with yield and cost data.',
    subsections: [
      {
        heading: 'Managing Fields',
        steps: [
          { text: 'Navigate to Agriculture.' },
          { text: 'Open the Fields tab and click Add Field.' },
          { text: 'Enter the field name, area in acres, soil type, and location description.' },
          { text: 'Click Save.' },
        ],
      },
      {
        heading: 'Creating a Crop Cycle',
        steps: [
          { text: 'Open the Crop Cycles tab and click Add Crop.' },
          { text: 'Select the field and enter the crop name and variety.' },
          { text: 'Set the Sowing Date and Expected Harvest Date.' },
          { text: 'Enter estimated costs: seed, fertiliser, labour, and other.' },
          { text: 'Set status to Growing once seeds are in the ground.' },
          { text: 'Click Save.' },
        ],
      },
      {
        heading: 'Recording a Harvest',
        steps: [
          { text: 'Open the Harvests tab and click Record Harvest.' },
          { text: 'Select the crop cycle.' },
          { text: 'Enter the actual harvest date and actual yield in kg.' },
          { text: 'The crop cycle status is automatically set to Harvested.' },
          { text: 'Click Save.' },
        ],
      },
    ],
  },

  // ── EMPLOYEES ─────────────────────────────────────────────────────────────
  {
    id: 'employees',
    title: 'Employees & Attendance',
    icon: '👥',
    roles: ['super_admin', 'owner', 'farm_manager'],
    overview: 'HR module covering employee profiles and daily attendance. Attendance data is used to calculate payroll — the system counts days present for each month.',
    subsections: [
      {
        heading: 'Adding an Employee',
        steps: [
          { text: 'Navigate to Employees.' },
          { text: 'Click Add Employee.' },
          { text: 'Enter the employee code (e.g. EMP-001), full name, CNIC, and phone number.' },
          { text: 'Fill in designation (e.g. Milkman, Guard, Driver), department, and join date.' },
          { text: 'Enter monthly salary in PKR.' },
          { text: 'Click Save.' },
        ],
      },
      {
        heading: 'Marking Daily Attendance',
        steps: [
          { text: 'Navigate to Attendance.' },
          { text: 'Click Mark Attendance.' },
          { text: 'Select the employee and the date.' },
          { text: 'Choose status: Present, Absent, Half Day, or Leave.' },
          { text: 'Optionally enter check-in and check-out times and overtime hours.' },
          { text: 'Click Save. Duplicate entries (same employee + same date) are automatically rejected.' },
        ],
        tip: 'The system assumes 26 working days per month for payroll calculations.',
      },
      {
        heading: 'Employee Status',
        fields: [
          { name: 'Active', desc: 'Currently employed, included in payroll runs.' },
          { name: 'Inactive', desc: 'Temporarily suspended, excluded from payroll.' },
          { name: 'Terminated', desc: 'No longer employed, fully excluded.' },
        ],
      },
    ],
  },

  // ── INVESTORS ─────────────────────────────────────────────────────────────
  {
    id: 'investors',
    title: 'Investor Management',
    icon: '📈',
    roles: ['super_admin', 'owner', 'accountant', 'investor'],
    overview: 'Manages investor profiles, capital contributions, profit sharing, and animal ownership. Investors have a read-only portal to view their own portfolio.',
    subsections: [
      {
        heading: 'Adding an Investor',
        roles: ['super_admin', 'owner'],
        steps: [
          { text: 'Navigate to Investor Management.' },
          { text: 'Click Add Investor.' },
          { text: 'Enter the investor\'s full name, CNIC, phone, and email.' },
          { text: 'Set Profit Share Percentage (e.g. 33.33% for equal three-way split).' },
          { text: 'Click Save.' },
        ],
      },
      {
        heading: 'Recording Capital Contributions',
        steps: [
          { text: 'Open the investor\'s profile.' },
          { text: 'Click Add Capital.' },
          { text: 'Enter the amount (PKR), date, and contribution type (deposit/withdrawal).' },
          { text: 'Add notes if needed (e.g. bank transfer reference).' },
          { text: 'Click Save. Total capital updates automatically.' },
        ],
      },
      {
        heading: 'Recording Profit Distributions',
        steps: [
          { text: 'Open the investor\'s profile.' },
          { text: 'Click Add Distribution.' },
          { text: 'Select type: Profit, Dividend, or Return.' },
          { text: 'Enter amount, distribution date, and the period it covers (YYYY-MM).' },
          { text: 'Click Save. ROI is recalculated automatically.' },
        ],
      },
      {
        heading: 'Investor Portal',
        roles: ['investor'],
        content: 'Investors log in and are directed to My Investment in the sidebar. They can view their total capital, total distributions, ROI percentage, and a list of animals they own (with photos). They cannot edit any data.',
      },
    ],
  },

  // ── PALLAI ────────────────────────────────────────────────────────────────
  {
    id: 'pallai',
    title: 'Pallai Management',
    icon: '🏠',
    roles: ['super_admin', 'owner', 'farm_manager', 'accountant', 'pallai_customer'],
    overview: 'Pallai is a shared livestock ownership/subscription model where customers pay a monthly fee for an animal to be cared for by the farm. The farm provides feeding, health care, and sends milk or offspring proceeds to the customer. This module manages customers, subscription packages, billing, and customer-facing portals.',
    subsections: [
      {
        heading: 'Creating a Pallai Package',
        roles: ['super_admin', 'owner', 'farm_manager'],
        steps: [
          { text: 'Navigate to Pallai Overview → Packages tab.' },
          { text: 'Click Add Package.' },
          { text: 'Enter package name (e.g. Basic Goat Care, Premium Buffalo Plan).' },
          { text: 'Select billing model: Daily, Monthly, Premium, or Custom.' },
          { text: 'Enter price per billing period (PKR).' },
          { text: 'Check Includes Feed and/or Includes Vet if applicable to this package.' },
          { text: 'Click Save.' },
        ],
      },
      {
        heading: 'Registering a Pallai Customer',
        steps: [
          { text: 'Navigate to Pallai Overview → Customers tab.' },
          { text: 'Click Add Customer.' },
          { text: 'Enter full name, phone, email, CNIC, and address.' },
          { text: 'Click Save.' },
          { text: 'To give the customer app access, create a user account for them (Users page) with the pallai_customer role, using the same email.' },
        ],
      },
      {
        heading: 'Creating a Subscription',
        steps: [
          { text: 'Navigate to Pallai Overview → Subscriptions tab.' },
          { text: 'Click Add Subscription.' },
          { text: 'Select the customer, the animal (must be Pallai ownership type), and the package.' },
          { text: 'Set the start date and optionally the monthly fee (defaults from package price).' },
          { text: 'Click Save. The subscription is now active.' },
        ],
        tip: 'Make sure the animal\'s Ownership Type is set to Pallai on the Animals page before creating a subscription.',
      },
      {
        heading: 'Generating Monthly Billing',
        steps: [
          { text: 'Navigate to Pallai Overview → Billing tab.' },
          { text: 'Select the month and year to bill.' },
          { text: 'Click Generate Invoices.' },
          { text: 'The system creates one invoice per active subscription for that month.' },
          { text: 'Invoices appear under Invoices in the sidebar with status Draft. Change to Sent to notify customers.' },
        ],
        warning: 'Running billing twice for the same month will create duplicate invoices. Always check the Invoices list before generating.',
      },
      {
        heading: 'Customer Portal',
        roles: ['pallai_customer'],
        content: 'Pallai customers log in and see My Portal in the sidebar. They can view their subscribed animals with photos, health status, their invoice history, and outstanding balance. They cannot make changes to any data.',
      },
    ],
  },

  // ── EMPLOYEE TASKS ────────────────────────────────────────────────────────
  {
    id: 'tasks',
    title: 'Employee Tasks',
    icon: '✅',
    roles: ['super_admin', 'owner', 'farm_manager', 'employee'],
    overview: 'Assign and track daily farm tasks for employees. Managers create and assign tasks; employees view their tasks and update progress. The Dashboard tab gives managers a live overview of pending, in-progress, overdue, and completed tasks.',
    subsections: [
      {
        heading: 'Dashboard Tab',
        content: 'Six KPI cards show: Pending, In Progress, Completed Today, Due Today, Overdue, and Total Open tasks. An "Open Tasks by Category" bar chart shows workload distribution. Two lists show today\'s due tasks and any overdue tasks with assignee names and priority badges.',
      },
      {
        heading: 'Creating a Task',
        roles: ['super_admin', 'owner', 'farm_manager'],
        steps: [
          { text: 'Navigate to Tasks → Create Task tab (or click + New Task button).' },
          { text: 'Enter a Task Title (e.g. "Morning milk collection — goat herd").' },
          { text: 'Select Category: Feeding, Milking, Health Check, Cleaning, Maintenance, Vaccination, Treatment, or Other.' },
          { text: 'Set Priority: Low, Medium, High, or Urgent.' },
          { text: 'Assign the task to an employee using the Assign To dropdown.' },
          { text: 'Set a Due Date.' },
          { text: 'Optionally link to an Animal and add a Description with detailed instructions.' },
          { text: 'Click Create Task. The task appears in All Tasks with status Pending.' },
        ],
        tip: 'Urgent priority tasks appear at the top of the Due Today list and are highlighted in red.',
      },
      {
        heading: 'Task Status Transitions',
        fields: [
          { name: 'Pending', desc: 'Task created, not yet started. Start button available.' },
          { name: 'In Progress', desc: 'Employee has clicked Start. Complete and Cancel buttons available.' },
          { name: 'Completed', desc: 'Task finished. Completion notes recorded. Counts in "Completed Today" KPI.' },
          { name: 'Cancelled', desc: 'Task cancelled by manager. Removed from active workload.' },
        ],
      },
      {
        heading: 'Starting and Completing a Task',
        steps: [
          { text: 'In the All Tasks tab, find the task and click Start — status changes to In Progress.' },
          { text: 'When done, click Complete.' },
          { text: 'A modal appears — optionally enter completion notes (e.g. "Fed 12 kg lucerne, all animals healthy").' },
          { text: 'Click Mark Complete. The task is marked Completed with a timestamp.' },
        ],
        tip: 'Employees can also use the My Tasks tab to see only their own tasks and complete them from there.',
      },
      {
        heading: 'My Tasks Tab',
        roles: ['employee'],
        content: 'Employees see only tasks assigned to them. Tasks are grouped into active (pending/in-progress) and completed cards showing title, category icon, priority badge, due date, assigned by, and action buttons. Note: the employee user account must be linked to an employee profile by the manager (via the employee record\'s user_id field) for this tab to show tasks.',
      },
      {
        heading: 'Filtering Tasks',
        content: 'The All Tasks tab has four filter dropdowns: Status, Priority, Category, and Employee. Combine filters to find e.g. all Urgent tasks in the Feeding category for a specific employee.',
      },
    ],
  },

  // ── INVOICES & PAYMENTS ───────────────────────────────────────────────────
  {
    id: 'invoices',
    title: 'Invoices & Payments',
    icon: '🧾',
    roles: ['super_admin', 'owner', 'accountant', 'data_entry'],
    overview: 'Handles all invoices issued to customers (pallai subscriptions, milk sales, custom charges) and records payments against them. Invoice status updates automatically when paid in full.',
    subsections: [
      {
        heading: 'Creating a Manual Invoice',
        steps: [
          { text: 'Navigate to Invoices.' },
          { text: 'Click Add Invoice.' },
          { text: 'Enter customer name and optionally link to a customer ID.' },
          { text: 'Set the issue date and due date.' },
          { text: 'Add line items: description, quantity, and unit price.' },
          { text: 'Subtotal, tax, and total are calculated automatically.' },
          { text: 'Set status to Draft (to review) or Sent (to send to customer).' },
          { text: 'Click Save. Invoice number is auto-generated (INV-XXXXXXXX).' },
        ],
      },
      {
        heading: 'Invoice Status Flow',
        fields: [
          { name: 'Draft', desc: 'Invoice created but not yet sent to the customer.' },
          { name: 'Sent', desc: 'Invoice delivered to customer, awaiting payment.' },
          { name: 'Paid', desc: 'Payment recorded in full — auto-set when paid_amount equals total_amount.' },
          { name: 'Overdue', desc: 'Due date has passed with outstanding balance.' },
          { name: 'Cancelled', desc: 'Invoice cancelled — no payment expected.' },
        ],
      },
      {
        heading: 'Recording a Payment',
        steps: [
          { text: 'Navigate to Payments.' },
          { text: 'Click Record Payment.' },
          { text: 'Select the invoice the payment is for.' },
          { text: 'Enter amount, payment date, and payment method (Cash, Bank Transfer, Easypaisa, etc.).' },
          { text: 'Optionally enter a reference (receipt number, transaction ID).' },
          { text: 'Click Save. The invoice paid_amount updates and status changes to Paid if fully settled.' },
        ],
        tip: 'Partial payments are supported — the invoice stays in Sent status until fully paid.',
      },
    ],
  },

  // ── ACCOUNTING ────────────────────────────────────────────────────────────
  {
    id: 'accounting',
    title: 'Accounting ERP',
    icon: '📒',
    roles: ['super_admin', 'owner', 'accountant'],
    overview: 'Full double-entry bookkeeping system. Includes a pre-seeded Chart of Accounts, journal entries, general ledger, vendor bills (accounts payable), payroll processing, and financial reports (P&L, Balance Sheet, Trial Balance).',
    subsections: [
      {
        heading: 'Chart of Accounts',
        content: 'The system comes with 43 pre-seeded accounts organised into Assets, Liabilities, Equity, Revenue, Cost of Goods Sold, and Operating Expenses. Navigate to Accounting → Chart of Accounts to view and add custom accounts. Each account has a code, name, and type. Account codes follow standard conventions: 1000s = Assets, 2000s = Liabilities, 3000s = Equity, 4000s = Revenue, 5000s = COGS, 6000s = Operating Expenses.',
      },
      {
        heading: 'Creating a Journal Entry',
        steps: [
          { text: 'Navigate to Accounting → Journal Entries.' },
          { text: 'Click New Entry.' },
          { text: 'Enter the entry date, description, and reference (optional).' },
          { text: 'Add journal lines: select the account, then enter either a Debit or Credit amount (not both).' },
          { text: 'Add as many lines as needed. Total Debits must equal Total Credits — the system will reject unbalanced entries.' },
          { text: 'Click Save as Draft to review.' },
          { text: 'Click Post to commit the entry to the ledger. Posted entries appear in the General Ledger and Trial Balance.' },
        ],
        warning: 'Once an entry is Posted it cannot be edited. To reverse it, create a new entry with the opposite amounts, or use the Void action (which marks it voided but does not auto-reverse).',
      },
      {
        heading: 'General Ledger',
        content: 'Navigate to Accounting → General Ledger, select an account, and choose a date range. You will see every posted journal entry that debited or credited that account, with a running balance.',
      },
      {
        heading: 'Trial Balance',
        content: 'Navigate to Accounting → Trial Balance and select an as-of date. The system shows every account with its total debits and credits. Total debits must equal total credits — a mismatch indicates an error in journal entries.',
      },
      {
        heading: 'Vendor Bills (Accounts Payable)',
        steps: [
          { text: 'Navigate to Accounting → Vendors. Create a vendor if they don\'t exist yet.' },
          { text: 'Navigate to Accounting → Bills (AP).' },
          { text: 'Click Add Bill.' },
          { text: 'Select the vendor, enter bill date and due date.' },
          { text: 'Add line items (description, quantity, unit price, account code).' },
          { text: 'Save as Draft or set to Approved.' },
          { text: 'When the bill is paid, click Pay and enter the payment amount. Status changes to Paid.' },
        ],
      },
      {
        heading: 'Processing Monthly Payroll',
        steps: [
          { text: 'Ensure all employee attendance has been marked for the month.' },
          { text: 'Navigate to Accounting → Payroll.' },
          { text: 'Click Create Payroll Run.' },
          { text: 'Select the month and year.' },
          { text: 'Click Process. The system reads attendance for every active employee and calculates: Gross Salary = (Monthly Salary ÷ 26) × Days Present.' },
          { text: 'Review the payroll records. Click Pay Run when salaries have been disbursed.' },
        ],
        warning: 'Only one payroll run per month is allowed. Make sure all attendance is recorded before processing.',
      },
      {
        heading: 'Financial Reports',
        fields: [
          { name: 'Profit & Loss', desc: 'Shows Revenue, Cost of Goods Sold, Gross Profit, Operating Expenses, and Net Profit for a date range. Navigate to Accounting → Profit & Loss.' },
          { name: 'Balance Sheet', desc: 'Snapshot of Assets, Liabilities, and Equity as of a chosen date. Assets must equal Liabilities + Equity. Navigate to Accounting → Balance Sheet.' },
          { name: 'Accounts Receivable', desc: 'Lists all outstanding invoices aged by days overdue (0–30, 31–60, 61–90, 90+ days). Navigate to Accounting → Receivables.' },
          { name: 'Accounts Payable', desc: 'Lists all unpaid vendor bills. Navigate to Accounting → Bills (AP).' },
        ],
      },
    ],
  },

  // ── REPORTS & ANALYTICS ───────────────────────────────────────────────────
  {
    id: 'reports',
    title: 'Reports & Analytics',
    icon: '📊',
    roles: ['super_admin', 'owner', 'accountant', 'farm_manager'],
    overview: 'The Reports page contains 8 analytics tabs covering the full farm operation. All data is real-time from the database.',
    subsections: [
      {
        heading: 'Overview Tab',
        content: 'Eight KPI cards showing current-month vs previous-month comparison with percentage change arrows: Milk Litres, Milk Revenue, Active Animals, Payments Received, Treatments Count, Invoices Issued, Low Stock Items, and Vaccinations Due in 7 Days. Two mini charts preview Milk Production (12 months) and Cash Flow (6 months).',
      },
      {
        heading: 'Milk Tab',
        content: 'Detailed 12-month milk production chart showing monthly litres (bars), milk revenue (line), and average daily litres (dashed line). A table below shows month-by-month breakdowns.',
      },
      {
        heading: 'Cash Flow Tab',
        content: 'Six-month income vs. expenses vs. net bar and line chart. Income includes milk sales and payments received. Expenses include treatments, vendor bills paid, and payroll. A summary table shows each month\'s net position.',
      },
      {
        heading: 'Farm Health Tab',
        content: 'Vaccination compliance percentage (animals vaccinated this year ÷ total active animals), average monthly treatments, and a 6-month stacked bar chart of vaccinations, treatments, and breeding attempts.',
      },
      {
        heading: 'Animals Tab',
        content: 'Animal profitability ranking. For each animal: milk revenue earned in the last 12 months, treatment costs, vaccination costs, and estimated profit. Shown as a horizontal bar chart (top 10) and a full sortable table (top 20).',
      },
      {
        heading: 'Inventory Tab',
        content: 'Two panels: Low Stock Alerts (products at or below minimum with deficit quantity) and Top 10 Consumed Products in the last 30 days (horizontal bar chart).',
      },
      {
        heading: 'Investors Tab',
        content: 'Total capital deployed, total distributions made, a 6-month distributions bar chart, and a per-investor table showing capital, distributions, and ROI percentage.',
      },
      {
        heading: 'Pallai Tab',
        content: 'Active subscriptions count, monthly revenue target, collection rate percentage, subscriptions by package (pie chart), and a 6-month billing vs. collection bar chart.',
      },
    ],
  },

  // ── USER MANAGEMENT ───────────────────────────────────────────────────────
  {
    id: 'users',
    title: 'User Management',
    icon: '⚙️',
    roles: ['super_admin', 'owner'],
    overview: 'Create and manage user accounts. Control who has access to the system and what they can do by assigning the correct role.',
    subsections: [
      {
        heading: 'Managing Users',
        steps: [
          { text: 'Navigate to Users (⚙️) at the bottom of the sidebar.' },
          { text: 'The table shows all users with their role and status.' },
          { text: 'Click Add User to create a new account.' },
          { text: 'To edit an existing user click their row and modify name, role, or status.' },
          { text: 'To deactivate a user toggle the Active switch — they will be immediately blocked from logging in.' },
        ],
        warning: 'Only Super Admin and Owner roles can access this page. Be careful assigning the Owner role as it grants full financial and HR access.',
      },
      {
        heading: 'Password Reset',
        content: 'Users can change their own password by logging in and navigating to their profile (the user name area at the bottom of the sidebar). Admins can reset passwords by editing the user record and entering a new password.',
      },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [search, setSearch] = useState('')
  const [active, setActive] = useState('getting-started')
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  // Filter sections by search
  const filtered = search.trim()
    ? SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.overview.toLowerCase().includes(search.toLowerCase()) ||
        s.subsections.some(ss =>
          ss.heading.toLowerCase().includes(search.toLowerCase()) ||
          (ss.content || '').toLowerCase().includes(search.toLowerCase()) ||
          (ss.steps || []).some(st => st.text.toLowerCase().includes(search.toLowerCase()))
        )
      )
    : SECTIONS

  // Scroll to section
  const scrollTo = (id: string) => {
    setActive(id)
    const el = sectionRefs.current[id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Track active section on scroll
  useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY + 120
      for (const s of SECTIONS) {
        const el = sectionRefs.current[s.id]
        if (el && el.offsetTop <= scrollY) setActive(s.id)
      }
    }
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Manual & Help</h1>
          <p className="page-subtitle">Complete guide to every module and workflow in FarmERP360</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          className="form-input max-w-md"
          placeholder="Search the manual… (e.g. payroll, vaccination, pallai)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <p className="text-xs text-gray-400 mt-1">{filtered.length} section{filtered.length !== 1 ? 's' : ''} matched</p>}
      </div>

      <div className="flex gap-6 items-start">
        {/* ── Table of Contents ── */}
        {!search && (
          <aside className="hidden lg:block w-52 shrink-0 sticky top-6">
            <div className="card p-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Contents</p>
              <nav className="space-y-0.5">
                {SECTIONS.map(s => (
                  <button key={s.id} onClick={() => scrollTo(s.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${active === s.id ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <span>{s.icon}</span>
                    <span className="leading-snug">{s.title}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-8">
          {filtered.map(section => (
            <article
              key={section.id}
              id={section.id}
              ref={el => { sectionRefs.current[section.id] = el }}
              className="card overflow-hidden"
            >
              {/* Section header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
                  {section.roles && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {section.roles.map(r => (
                        <span key={r} className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLOUR[r] || 'bg-gray-100 text-gray-600'}`}>
                          {r.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Overview */}
              <div className="px-6 pt-4 pb-2">
                <p className="text-sm text-gray-600 leading-relaxed">{section.overview}</p>
              </div>

              {/* Subsections */}
              <div className="px-6 pb-6 space-y-6">
                {section.subsections.map((sub, si) => (
                  <div key={si}>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2 mt-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-green-600 text-white rounded text-xs flex items-center justify-center font-bold">{si + 1}</span>
                      {sub.heading}
                      {sub.roles && sub.roles.map(r => (
                        <span key={r} className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLOUR[r] || 'bg-gray-100 text-gray-600'}`}>
                          {r.replace('_', ' ')}
                        </span>
                      ))}
                    </h3>

                    {sub.content && (
                      <p className="text-sm text-gray-600 leading-relaxed mb-2">{sub.content}</p>
                    )}

                    {sub.steps && (
                      <ol className="space-y-1.5 ml-2">
                        {sub.steps.map((step, si2) => (
                          <li key={si2} className="flex gap-2 text-sm text-gray-700">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold mt-0.5">
                              {si2 + 1}
                            </span>
                            <span>
                              {step.text}
                              {step.note && (
                                <span className="ml-1 text-xs text-gray-400 italic">({step.note})</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {sub.fields && (
                      <dl className="space-y-1.5 ml-2">
                        {sub.fields.map((f, fi) => (
                          <div key={fi} className="flex gap-2 text-sm">
                            <dt className="shrink-0 font-semibold text-gray-800 min-w-[140px]">{f.name}{f.required && <span className="text-red-500 ml-0.5">*</span>}</dt>
                            <dd className="text-gray-600">{f.desc}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {sub.tip && (
                      <div className="mt-3 flex gap-2 bg-green-50 border border-green-100 rounded px-3 py-2">
                        <span className="text-green-600 shrink-0">💡</span>
                        <p className="text-xs text-green-800">{sub.tip}</p>
                      </div>
                    )}

                    {sub.warning && (
                      <div className="mt-3 flex gap-2 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                        <span className="text-amber-600 shrink-0">⚠️</span>
                        <p className="text-xs text-amber-800">{sub.warning}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-gray-400 text-sm">No sections matched your search. Try different keywords.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
