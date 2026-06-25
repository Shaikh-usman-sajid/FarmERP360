from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, case
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles, get_org_id
from app.models.models import (
    User, ChartOfAccount, JournalEntry, JournalEntryLine,
    Vendor, VendorBill, VendorBillLine,
    PayrollRun, PayrollRecord, CostCenter, Employee, AttendanceRecord,
    AccountType, JournalEntryStatus, VendorBillStatus, PayrollStatus, AttendanceStatus
)
from app.schemas.schemas import (
    AccountCreate, AccountUpdate, AccountOut,
    JournalEntryCreate, JournalEntryOut, JournalEntryDetailOut, JournalLineOut,
    VendorCreate, VendorOut,
    VendorBillCreate, VendorBillOut,
    PayrollRunCreate, PayrollRunOut, PayrollRunDetailOut, PayrollRecordOut,
    CostCenterCreate, CostCenterOut,
    ProfitLossReport, PLLineItem, BalanceSheetReport, BalanceSheetItem,
    TrialBalanceItem, LedgerEntry
)

router = APIRouter(prefix="/accounting", tags=["accounting"])

ACCOUNTING_ROLES = ["super_admin", "owner", "accountant"]


# ─────────────────────────────────────────────
# DEFAULT CHART OF ACCOUNTS SEEDER
# ─────────────────────────────────────────────

DEFAULT_ACCOUNTS = [
    # Assets
    ("1000", "Cash in Hand", AccountType.ASSET, None),
    ("1010", "Bank - Main Account", AccountType.ASSET, None),
    ("1020", "Bank - Savings Account", AccountType.ASSET, None),
    ("1100", "Accounts Receivable", AccountType.ASSET, None),
    ("1110", "Pallai Receivable", AccountType.ASSET, None),
    ("1120", "Milk Sales Receivable", AccountType.ASSET, None),
    ("1200", "Inventory - Animal Feed", AccountType.ASSET, None),
    ("1210", "Inventory - Medicines & Vaccines", AccountType.ASSET, None),
    ("1220", "Inventory - Equipment & Supplies", AccountType.ASSET, None),
    ("1300", "Livestock Assets - Goats", AccountType.ASSET, None),
    ("1310", "Livestock Assets - Buffaloes", AccountType.ASSET, None),
    ("1400", "Land & Property", AccountType.ASSET, None),
    ("1410", "Farm Equipment", AccountType.ASSET, None),
    ("1420", "Accumulated Depreciation", AccountType.ASSET, None),
    # Liabilities
    ("2000", "Accounts Payable", AccountType.LIABILITY, None),
    ("2010", "Feed Supplier Payable", AccountType.LIABILITY, None),
    ("2020", "Medicine Supplier Payable", AccountType.LIABILITY, None),
    ("2100", "Salaries Payable", AccountType.LIABILITY, None),
    ("2200", "Loans Payable - Short Term", AccountType.LIABILITY, None),
    ("2210", "Loans Payable - Long Term", AccountType.LIABILITY, None),
    # Equity
    ("3000", "Owner's Equity", AccountType.EQUITY, None),
    ("3100", "Investor Capital", AccountType.EQUITY, None),
    ("3200", "Retained Earnings", AccountType.EQUITY, None),
    # Revenue
    ("4000", "Milk Sales Revenue", AccountType.REVENUE, None),
    ("4100", "Animal Sales Revenue", AccountType.REVENUE, None),
    ("4200", "Pallai Service Revenue", AccountType.REVENUE, None),
    ("4300", "Crop Sales Revenue", AccountType.REVENUE, None),
    ("4400", "Other Operating Revenue", AccountType.REVENUE, None),
    # Cost of Goods Sold (stored as Expense type)
    ("5000", "Animal Feed Cost", AccountType.EXPENSE, None),
    ("5010", "Fodder & Hay Cost", AccountType.EXPENSE, None),
    ("5100", "Veterinary & Medicine Cost", AccountType.EXPENSE, None),
    ("5200", "Animal Purchase Cost", AccountType.EXPENSE, None),
    # Operating Expenses
    ("6000", "Salaries & Wages", AccountType.EXPENSE, None),
    ("6100", "Utilities - Electricity", AccountType.EXPENSE, None),
    ("6110", "Utilities - Water", AccountType.EXPENSE, None),
    ("6200", "Maintenance & Repairs", AccountType.EXPENSE, None),
    ("6300", "Transportation", AccountType.EXPENSE, None),
    ("6400", "Administrative Expenses", AccountType.EXPENSE, None),
    ("6500", "Depreciation Expense", AccountType.EXPENSE, None),
    # Other
    ("7000", "Other Income", AccountType.REVENUE, None),
    ("7100", "Bank Interest Income", AccountType.REVENUE, None),
    ("7200", "Other Expenses", AccountType.EXPENSE, None),
    ("7300", "Bank Charges", AccountType.EXPENSE, None),
]


def seed_chart_of_accounts(org_id: str, db: Session):
    existing = db.query(ChartOfAccount).filter_by(organization_id=org_id).count()
    if existing > 0:
        return
    for code, name, acct_type, parent_code in DEFAULT_ACCOUNTS:
        acct = ChartOfAccount(
            organization_id=org_id,
            account_code=code,
            account_name=name,
            account_type=acct_type,
            is_system=True,
        )
        db.add(acct)
    db.commit()


def _next_entry_number(org_id: str, db: Session) -> str:
    count = db.query(JournalEntry).filter_by(organization_id=org_id).count()
    return f"JE-{count + 1:05d}"


def _next_bill_number(org_id: str, db: Session) -> str:
    count = db.query(VendorBill).filter_by(organization_id=org_id).count()
    return f"BILL-{count + 1:05d}"


# ─────────────────────────────────────────────
# CHART OF ACCOUNTS
# ─────────────────────────────────────────────

@router.get("/accounts", response_model=List[AccountOut])
def list_accounts(
    account_type: Optional[AccountType] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    seed_chart_of_accounts(org_id, db)
    q = db.query(ChartOfAccount).filter_by(organization_id=org_id, is_active=True)
    if account_type:
        q = q.filter(ChartOfAccount.account_type == account_type)
    return q.order_by(ChartOfAccount.account_code).all()


@router.post("/accounts", response_model=AccountOut)
def create_account(
    data: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    exists = db.query(ChartOfAccount).filter_by(
        organization_id=org_id, account_code=data.account_code
    ).first()
    if exists:
        raise HTTPException(400, f"Account code {data.account_code} already exists")
    acct = ChartOfAccount(organization_id=org_id, **data.model_dump())
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return acct


@router.put("/accounts/{account_id}", response_model=AccountOut)
def update_account(
    account_id: str,
    data: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    acct = db.query(ChartOfAccount).filter_by(id=account_id, organization_id=org_id).first()
    if not acct:
        raise HTTPException(404, "Account not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(acct, k, v)
    db.commit()
    db.refresh(acct)
    return acct


# ─────────────────────────────────────────────
# JOURNAL ENTRIES
# ─────────────────────────────────────────────

@router.get("/journal-entries", response_model=List[JournalEntryOut])
def list_journal_entries(
    status: Optional[JournalEntryStatus] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    q = db.query(JournalEntry).filter_by(organization_id=org_id)
    if status:
        q = q.filter(JournalEntry.status == status)
    if date_from:
        q = q.filter(JournalEntry.entry_date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.entry_date <= date_to)
    return q.order_by(JournalEntry.entry_date.desc()).all()


@router.post("/journal-entries", response_model=JournalEntryOut)
def create_journal_entry(
    data: JournalEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    if not data.lines:
        raise HTTPException(400, "Journal entry must have at least one line")
    total_debit = sum(l.debit_amount for l in data.lines)
    total_credit = sum(l.credit_amount for l in data.lines)
    if abs(total_debit - total_credit) > Decimal("0.01"):
        raise HTTPException(400, f"Entry not balanced: debits={total_debit} credits={total_credit}")

    entry = JournalEntry(
        organization_id=org_id,
        entry_number=_next_entry_number(org_id, db),
        entry_date=data.entry_date,
        description=data.description,
        reference=data.reference,
        total_debit=total_debit,
        total_credit=total_credit,
        created_by=current_user.id,
    )
    db.add(entry)
    db.flush()

    for line in data.lines:
        acct = db.query(ChartOfAccount).filter_by(id=line.account_id, organization_id=org_id).first()
        if not acct:
            raise HTTPException(404, f"Account {line.account_id} not found")
        db.add(JournalEntryLine(
            entry_id=entry.id,
            account_id=line.account_id,
            description=line.description,
            debit_amount=line.debit_amount,
            credit_amount=line.credit_amount,
        ))
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/journal-entries/{entry_id}", response_model=JournalEntryDetailOut)
def get_journal_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    entry = db.query(JournalEntry).filter_by(id=entry_id, organization_id=org_id).first()
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    lines = []
    for line in entry.lines:
        acct = db.query(ChartOfAccount).filter_by(id=line.account_id).first()
        lines.append(JournalLineOut(
            id=line.id,
            account_id=line.account_id,
            account_code=acct.account_code if acct else None,
            account_name=acct.account_name if acct else None,
            description=line.description,
            debit_amount=line.debit_amount,
            credit_amount=line.credit_amount,
        ))
    result = JournalEntryDetailOut(
        id=entry.id,
        entry_number=entry.entry_number,
        entry_date=entry.entry_date,
        description=entry.description,
        reference=entry.reference,
        status=entry.status,
        total_debit=entry.total_debit,
        total_credit=entry.total_credit,
        created_at=entry.created_at,
        lines=lines,
    )
    return result


@router.post("/journal-entries/{entry_id}/post", response_model=JournalEntryOut)
def post_journal_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    entry = db.query(JournalEntry).filter_by(id=entry_id, organization_id=org_id).first()
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    if entry.status != JournalEntryStatus.DRAFT:
        raise HTTPException(400, f"Entry is already {entry.status}")
    entry.status = JournalEntryStatus.POSTED
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/journal-entries/{entry_id}/void", response_model=JournalEntryOut)
def void_journal_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    entry = db.query(JournalEntry).filter_by(id=entry_id, organization_id=org_id).first()
    if not entry:
        raise HTTPException(404, "Journal entry not found")
    if entry.status == JournalEntryStatus.VOIDED:
        raise HTTPException(400, "Entry already voided")
    entry.status = JournalEntryStatus.VOIDED
    db.commit()
    db.refresh(entry)
    return entry


# ─────────────────────────────────────────────
# GENERAL LEDGER
# ─────────────────────────────────────────────

@router.get("/general-ledger/{account_id}")
def general_ledger(
    account_id: str,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    acct = db.query(ChartOfAccount).filter_by(id=account_id, organization_id=org_id).first()
    if not acct:
        raise HTTPException(404, "Account not found")

    q = (db.query(JournalEntryLine, JournalEntry)
         .join(JournalEntry, JournalEntryLine.entry_id == JournalEntry.id)
         .filter(
             JournalEntryLine.account_id == account_id,
             JournalEntry.organization_id == org_id,
             JournalEntry.status == JournalEntryStatus.POSTED,
         ))
    if date_from:
        q = q.filter(JournalEntry.entry_date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.entry_date <= date_to)
    rows = q.order_by(JournalEntry.entry_date).all()

    running_balance = Decimal("0")
    entries = []
    for line, entry in rows:
        running_balance += line.debit_amount - line.credit_amount
        entries.append({
            "entry_date": entry.entry_date,
            "entry_number": entry.entry_number,
            "description": line.description or entry.description,
            "debit": float(line.debit_amount),
            "credit": float(line.credit_amount),
            "balance": float(running_balance),
        })

    return {
        "account": {
            "id": acct.id,
            "code": acct.account_code,
            "name": acct.account_name,
            "type": acct.account_type,
        },
        "entries": entries,
        "closing_balance": float(running_balance),
    }


# ─────────────────────────────────────────────
# TRIAL BALANCE
# ─────────────────────────────────────────────

@router.get("/trial-balance")
def trial_balance(
    as_of: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    seed_chart_of_accounts(org_id, db)
    accounts = db.query(ChartOfAccount).filter_by(organization_id=org_id, is_active=True).order_by(
        ChartOfAccount.account_code
    ).all()

    result = []
    total_debit = Decimal("0")
    total_credit = Decimal("0")

    for acct in accounts:
        q = (db.query(
                func.coalesce(func.sum(JournalEntryLine.debit_amount), 0).label("debit"),
                func.coalesce(func.sum(JournalEntryLine.credit_amount), 0).label("credit"),
             )
             .join(JournalEntry, JournalEntryLine.entry_id == JournalEntry.id)
             .filter(
                 JournalEntryLine.account_id == acct.id,
                 JournalEntry.organization_id == org_id,
                 JournalEntry.status == JournalEntryStatus.POSTED,
             ))
        if as_of:
            q = q.filter(JournalEntry.entry_date <= as_of)
        row = q.first()
        dr = Decimal(str(row.debit)) if row and row.debit else Decimal("0")
        cr = Decimal(str(row.credit)) if row and row.credit else Decimal("0")
        if dr == 0 and cr == 0:
            continue
        balance = dr - cr
        result.append({
            "account_code": acct.account_code,
            "account_name": acct.account_name,
            "account_type": acct.account_type,
            "total_debit": float(dr),
            "total_credit": float(cr),
            "balance": float(balance),
        })
        total_debit += dr
        total_credit += cr

    return {
        "as_of_date": as_of or date.today(),
        "items": result,
        "total_debit": float(total_debit),
        "total_credit": float(total_credit),
    }


# ─────────────────────────────────────────────
# VENDORS
# ─────────────────────────────────────────────

@router.get("/vendors", response_model=List[VendorOut])
def list_vendors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    return db.query(Vendor).filter_by(organization_id=org_id, is_active=True).all()


@router.post("/vendors", response_model=VendorOut)
def create_vendor(
    data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    vendor = Vendor(organization_id=org_id, **data.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.put("/vendors/{vendor_id}", response_model=VendorOut)
def update_vendor(
    vendor_id: str,
    data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    vendor = db.query(Vendor).filter_by(id=vendor_id, organization_id=org_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(vendor, k, v)
    db.commit()
    db.refresh(vendor)
    return vendor


# ─────────────────────────────────────────────
# VENDOR BILLS (ACCOUNTS PAYABLE)
# ─────────────────────────────────────────────

@router.get("/bills", response_model=List[VendorBillOut])
def list_bills(
    status: Optional[VendorBillStatus] = None,
    vendor_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    q = db.query(VendorBill).filter_by(organization_id=org_id)
    if status:
        q = q.filter(VendorBill.status == status)
    if vendor_id:
        q = q.filter(VendorBill.vendor_id == vendor_id)
    bills = q.options(joinedload(VendorBill.vendor)).order_by(VendorBill.bill_date.desc()).all()
    result = []
    for bill in bills:
        out = VendorBillOut(
            id=bill.id,
            bill_number=bill.bill_number,
            vendor_id=bill.vendor_id,
            vendor_name=bill.vendor.name if bill.vendor else None,
            bill_date=bill.bill_date,
            due_date=bill.due_date,
            total_amount=bill.total_amount,
            paid_amount=bill.paid_amount,
            status=bill.status,
            created_at=bill.created_at,
        )
        result.append(out)
    return result


@router.post("/bills", response_model=VendorBillOut)
def create_bill(
    data: VendorBillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    vendor = db.query(Vendor).filter_by(id=data.vendor_id, organization_id=org_id).first()
    if not vendor:
        raise HTTPException(404, "Vendor not found")

    subtotal = sum(item.total for item in data.line_items)
    bill = VendorBill(
        organization_id=org_id,
        vendor_id=data.vendor_id,
        bill_number=_next_bill_number(org_id, db),
        bill_date=data.bill_date,
        due_date=data.due_date,
        subtotal=subtotal,
        total_amount=subtotal,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(bill)
    db.flush()

    for item in data.line_items:
        db.add(VendorBillLine(
            bill_id=bill.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=item.total,
            account_id=item.account_id,
        ))
    db.commit()
    db.refresh(bill)

    return VendorBillOut(
        id=bill.id,
        bill_number=bill.bill_number,
        vendor_id=bill.vendor_id,
        vendor_name=vendor.name,
        bill_date=bill.bill_date,
        due_date=bill.due_date,
        total_amount=bill.total_amount,
        paid_amount=bill.paid_amount,
        status=bill.status,
        created_at=bill.created_at,
    )


@router.put("/bills/{bill_id}/pay")
def pay_bill(
    bill_id: str,
    amount: Decimal = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    bill = db.query(VendorBill).filter_by(id=bill_id, organization_id=org_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")
    bill.paid_amount = (bill.paid_amount or Decimal("0")) + amount
    if bill.paid_amount >= bill.total_amount:
        bill.status = VendorBillStatus.PAID
    else:
        bill.status = VendorBillStatus.APPROVED
    db.commit()
    return {"message": "Payment recorded", "paid_amount": float(bill.paid_amount), "status": bill.status}


# ─────────────────────────────────────────────
# PAYROLL
# ─────────────────────────────────────────────

@router.get("/payroll", response_model=List[PayrollRunOut])
def list_payroll_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    return db.query(PayrollRun).filter_by(organization_id=org_id).order_by(
        PayrollRun.year.desc(), PayrollRun.month.desc()
    ).all()


@router.post("/payroll", response_model=PayrollRunDetailOut)
def create_payroll_run(
    data: PayrollRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    existing = db.query(PayrollRun).filter_by(
        organization_id=org_id, month=data.month, year=data.year
    ).first()
    if existing:
        raise HTTPException(400, f"Payroll for {data.month}/{data.year} already exists")

    employees = db.query(Employee).filter_by(organization_id=org_id, status="active").all()
    if not employees:
        raise HTTPException(400, "No active employees found")

    run = PayrollRun(
        organization_id=org_id,
        month=data.month,
        year=data.year,
        notes=data.notes,
        processed_by=current_user.id,
    )
    db.add(run)
    db.flush()

    total_gross = Decimal("0")
    total_net = Decimal("0")
    records_out = []

    for emp in employees:
        basic = emp.monthly_salary or Decimal("0")
        # Count attendance for this month
        days_present = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == emp.id,
            AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.HALF_DAY]),
        ).count()
        working_days = 26
        gross = basic if days_present == 0 else min(basic, (basic / working_days) * days_present)
        gross = gross.quantize(Decimal("0.01"))
        net = gross

        record = PayrollRecord(
            organization_id=org_id,
            payroll_run_id=run.id,
            employee_id=emp.id,
            basic_salary=basic,
            days_present=days_present,
            working_days=working_days,
            gross_salary=gross,
            deductions=Decimal("0"),
            net_salary=net,
        )
        db.add(record)
        total_gross += gross
        total_net += net
        records_out.append(PayrollRecordOut(
            id="",
            employee_id=emp.id,
            employee_name=emp.full_name,
            basic_salary=basic,
            days_present=days_present,
            working_days=working_days,
            gross_salary=gross,
            deductions=Decimal("0"),
            net_salary=net,
        ))

    run.total_gross = total_gross
    run.total_net = total_net
    run.status = PayrollStatus.PROCESSED
    db.commit()
    db.refresh(run)

    return PayrollRunDetailOut(
        id=run.id,
        month=run.month,
        year=run.year,
        total_gross=run.total_gross,
        total_deductions=run.total_deductions,
        total_net=run.total_net,
        status=run.status,
        created_at=run.created_at,
        records=records_out,
    )


@router.get("/payroll/{run_id}", response_model=PayrollRunDetailOut)
def get_payroll_run(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    run = db.query(PayrollRun).options(
        joinedload(PayrollRun.records).joinedload(PayrollRecord.employee)
    ).filter_by(id=run_id, organization_id=org_id).first()
    if not run:
        raise HTTPException(404, "Payroll run not found")
    records_out = []
    for rec in run.records:
        records_out.append(PayrollRecordOut(
            id=rec.id,
            employee_id=rec.employee_id,
            employee_name=rec.employee.full_name if rec.employee else None,
            basic_salary=rec.basic_salary,
            days_present=rec.days_present,
            working_days=rec.working_days,
            gross_salary=rec.gross_salary,
            deductions=rec.deductions,
            net_salary=rec.net_salary,
        ))
    return PayrollRunDetailOut(
        id=run.id,
        month=run.month,
        year=run.year,
        total_gross=run.total_gross,
        total_deductions=run.total_deductions,
        total_net=run.total_net,
        status=run.status,
        created_at=run.created_at,
        records=records_out,
    )


# ─────────────────────────────────────────────
# COST CENTERS
# ─────────────────────────────────────────────

@router.get("/cost-centers", response_model=List[CostCenterOut])
def list_cost_centers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    return db.query(CostCenter).filter_by(organization_id=org_id, is_active=True).all()


@router.post("/cost-centers", response_model=CostCenterOut)
def create_cost_center(
    data: CostCenterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    cc = CostCenter(organization_id=org_id, **data.model_dump())
    db.add(cc)
    db.commit()
    db.refresh(cc)
    return cc


# ─────────────────────────────────────────────
# FINANCIAL REPORTS
# ─────────────────────────────────────────────

def _account_balance(account_id: str, org_id: str, db: Session,
                     date_from: Optional[date] = None, date_to: Optional[date] = None) -> Decimal:
    q = (db.query(
            func.coalesce(func.sum(JournalEntryLine.debit_amount), 0).label("debit"),
            func.coalesce(func.sum(JournalEntryLine.credit_amount), 0).label("credit"),
         )
         .join(JournalEntry, JournalEntryLine.entry_id == JournalEntry.id)
         .filter(
             JournalEntryLine.account_id == account_id,
             JournalEntry.organization_id == org_id,
             JournalEntry.status == JournalEntryStatus.POSTED,
         ))
    if date_from:
        q = q.filter(JournalEntry.entry_date >= date_from)
    if date_to:
        q = q.filter(JournalEntry.entry_date <= date_to)
    row = q.first()
    dr = Decimal(str(row.debit)) if row and row.debit else Decimal("0")
    cr = Decimal(str(row.credit)) if row and row.credit else Decimal("0")
    return dr - cr


@router.get("/reports/profit-loss")
def profit_loss(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    seed_chart_of_accounts(org_id, db)
    accounts = db.query(ChartOfAccount).filter_by(organization_id=org_id, is_active=True).order_by(
        ChartOfAccount.account_code
    ).all()

    revenue_items, cogs_items, opex_items = [], [], []
    total_revenue = total_cogs = total_opex = Decimal("0")

    for acct in accounts:
        balance = _account_balance(acct.id, org_id, db, date_from, date_to)
        if balance == 0:
            continue
        item = {"account_code": acct.account_code, "account_name": acct.account_name, "amount": float(abs(balance))}
        code = int(acct.account_code[:4]) if acct.account_code[:4].isdigit() else 0
        if acct.account_type == AccountType.REVENUE:
            revenue_items.append(item)
            total_revenue += abs(balance)
        elif acct.account_type == AccountType.EXPENSE and 5000 <= code <= 5999:
            cogs_items.append(item)
            total_cogs += abs(balance)
        elif acct.account_type == AccountType.EXPENSE and code >= 6000:
            opex_items.append(item)
            total_opex += abs(balance)

    gross_profit = total_revenue - total_cogs
    net_profit = gross_profit - total_opex

    return {
        "period_start": date_from,
        "period_end": date_to,
        "revenue": revenue_items,
        "total_revenue": float(total_revenue),
        "cost_of_goods": cogs_items,
        "total_cogs": float(total_cogs),
        "gross_profit": float(gross_profit),
        "operating_expenses": opex_items,
        "total_opex": float(total_opex),
        "net_profit": float(net_profit),
    }


@router.get("/reports/balance-sheet")
def balance_sheet(
    as_of: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    seed_chart_of_accounts(org_id, db)
    accounts = db.query(ChartOfAccount).filter_by(organization_id=org_id, is_active=True).order_by(
        ChartOfAccount.account_code
    ).all()

    assets, liabilities, equity_items = [], [], []
    total_assets = total_liabilities = total_equity = Decimal("0")

    for acct in accounts:
        balance = _account_balance(acct.id, org_id, db, date_to=as_of)
        if balance == 0:
            continue
        item = {"account_code": acct.account_code, "account_name": acct.account_name, "balance": float(abs(balance))}
        if acct.account_type == AccountType.ASSET:
            assets.append(item)
            total_assets += abs(balance)
        elif acct.account_type == AccountType.LIABILITY:
            liabilities.append(item)
            total_liabilities += abs(balance)
        elif acct.account_type == AccountType.EQUITY:
            equity_items.append(item)
            total_equity += abs(balance)

    return {
        "as_of_date": as_of,
        "assets": assets,
        "total_assets": float(total_assets),
        "liabilities": liabilities,
        "total_liabilities": float(total_liabilities),
        "equity": equity_items,
        "total_equity": float(total_equity),
        "total_liabilities_equity": float(total_liabilities + total_equity),
    }


@router.get("/reports/accounts-receivable")
def accounts_receivable(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    from app.models.models import Invoice, InvoiceStatus
    invoices = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE]),
    ).all()
    total_outstanding = sum((i.total_amount - i.paid_amount) for i in invoices)
    overdue = [i for i in invoices if i.status == InvoiceStatus.OVERDUE]
    return {
        "total_outstanding": float(total_outstanding),
        "invoice_count": len(invoices),
        "overdue_count": len(overdue),
        "overdue_amount": float(sum((i.total_amount - i.paid_amount) for i in overdue)),
        "invoices": [
            {
                "id": i.id,
                "invoice_number": i.invoice_number,
                "customer_name": i.customer_name,
                "issue_date": i.issue_date,
                "due_date": i.due_date,
                "total_amount": float(i.total_amount),
                "paid_amount": float(i.paid_amount),
                "outstanding": float(i.total_amount - i.paid_amount),
                "status": i.status,
            }
            for i in invoices
        ],
    }


@router.get("/reports/cash-flow")
def cash_flow_statement(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    from datetime import timedelta
    seed_chart_of_accounts(org_id, db)

    prev_day = date_from - timedelta(days=1)
    accounts = db.query(ChartOfAccount).filter_by(organization_id=org_id, is_active=True).all()
    acct_by_code = {a.account_code: a for a in accounts}

    def period_bal(acct_id: str) -> Decimal:
        return _account_balance(acct_id, org_id, db, date_from, date_to)

    def opening_bal(acct_id: str) -> Decimal:
        return _account_balance(acct_id, org_id, db, date_to=prev_day)

    def closing_bal(acct_id: str) -> Decimal:
        return _account_balance(acct_id, org_id, db, date_to=date_to)

    def bal_change(acct_id: str) -> Decimal:
        return closing_bal(acct_id) - opening_bal(acct_id)

    # ── Net income (indirect method starting point) ──
    net_income = Decimal("0")
    for acct in accounts:
        b = period_bal(acct.id)
        if b == 0:
            continue
        if acct.account_type == AccountType.REVENUE:
            net_income += abs(b)
        elif acct.account_type == AccountType.EXPENSE:
            net_income -= abs(b)

    # ── OPERATING ACTIVITIES (indirect method) ──
    operating_items = [{"label": "Net Income / (Loss)", "amount": float(net_income)}]

    depr_acct = acct_by_code.get("6500")
    if depr_acct:
        depr = abs(period_bal(depr_acct.id))
        if depr != 0:
            operating_items.append({"label": "Add: Depreciation (non-cash)", "amount": float(depr)})

    wc_codes = [
        ("1100", "Accounts Receivable"),
        ("1110", "Pallai Receivable"),
        ("1120", "Milk Sales Receivable"),
        ("1200", "Inventory — Animal Feed"),
        ("1210", "Inventory — Medicines & Vaccines"),
        ("1220", "Inventory — Equipment & Supplies"),
        ("2000", "Accounts Payable"),
        ("2010", "Feed Supplier Payable"),
        ("2020", "Medicine Supplier Payable"),
        ("2100", "Salaries Payable"),
    ]
    for code, name in wc_codes:
        acct = acct_by_code.get(code)
        if not acct:
            continue
        change = bal_change(acct.id)
        if change == 0:
            continue
        # For all accounts: increase in asset = cash out (-change); increase in liability = cash in (-change)
        # Because _account_balance returns dr-cr; liability balance is normally negative, so a more negative
        # change (liability growing) gives -change = positive = cash inflow.
        operating_items.append({"label": f"Change in {name}", "amount": float(-change)})

    net_operating = sum(Decimal(str(i["amount"])) for i in operating_items)

    # ── INVESTING ACTIVITIES ──
    investing_codes = [
        ("1300", "Purchase of Livestock — Goats"),
        ("1310", "Purchase of Livestock — Buffaloes"),
        ("1400", "Land & Property"),
        ("1410", "Farm Equipment"),
        # 1420 Accumulated Depreciation excluded — non-cash, captured in operating above
    ]
    investing_items = []
    for code, label in investing_codes:
        acct = acct_by_code.get(code)
        if not acct:
            continue
        change = bal_change(acct.id)
        if change == 0:
            continue
        investing_items.append({"label": label, "amount": float(-change)})

    net_investing = sum(Decimal(str(i["amount"])) for i in investing_items) if investing_items else Decimal("0")

    # ── FINANCING ACTIVITIES ──
    financing_codes = [
        ("2200", "Short-term Loan Proceeds / (Repayments)"),
        ("2210", "Long-term Loan Proceeds / (Repayments)"),
        ("3000", "Owner Capital Contributions / (Withdrawals)"),
        ("3100", "Investor Capital Contributions / (Withdrawals)"),
    ]
    financing_items = []
    for code, label in financing_codes:
        acct = acct_by_code.get(code)
        if not acct:
            continue
        change = bal_change(acct.id)
        if change == 0:
            continue
        financing_items.append({"label": label, "amount": float(-change)})

    net_financing = sum(Decimal(str(i["amount"])) for i in financing_items) if financing_items else Decimal("0")

    # ── CASH BALANCES ──
    cash_accts = [a for a in accounts if a.account_code in ("1000", "1010", "1020")]
    opening_cash = sum(opening_bal(a.id) for a in cash_accts)
    closing_cash = sum(closing_bal(a.id) for a in cash_accts)
    net_cash_change = net_operating + net_investing + net_financing

    return {
        "period_start": date_from,
        "period_end": date_to,
        "operating_items": operating_items,
        "net_operating": float(net_operating),
        "investing_items": investing_items,
        "net_investing": float(net_investing),
        "financing_items": financing_items,
        "net_financing": float(net_financing),
        "net_cash_change": float(net_cash_change),
        "opening_cash": float(opening_cash),
        "closing_cash": float(closing_cash),
    }


@router.get("/reports/accounts-payable")
def accounts_payable_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ACCOUNTING_ROLES)),
    org_id: str = Depends(get_org_id),
):
    bills = db.query(VendorBill).filter(
        VendorBill.organization_id == org_id,
        VendorBill.status.in_([VendorBillStatus.APPROVED, VendorBillStatus.OVERDUE]),
    ).all()
    total_outstanding = sum((b.total_amount - b.paid_amount) for b in bills)
    return {
        "total_outstanding": float(total_outstanding),
        "bill_count": len(bills),
        "bills": [
            {
                "id": b.id,
                "bill_number": b.bill_number,
                "vendor_id": b.vendor_id,
                "bill_date": b.bill_date,
                "due_date": b.due_date,
                "total_amount": float(b.total_amount),
                "paid_amount": float(b.paid_amount),
                "outstanding": float(b.total_amount - b.paid_amount),
                "status": b.status,
            }
            for b in bills
        ],
    }
