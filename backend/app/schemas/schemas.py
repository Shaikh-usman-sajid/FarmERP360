from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from app.models.models import (
    UserRole, AnimalSpecies, AnimalGender, AnimalStatus,
    OwnershipType, MilkSession, EmploymentStatus, AttendanceStatus,
    InventoryTxType, CropStatus, InvoiceStatus,
    AccountType, JournalEntryStatus, VendorBillStatus, PayrollStatus
)


# ─── BASE ───────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    page: int
    per_page: int
    total: int
    items: list


# ─── AUTH ───────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ─── USERS ──────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    password: str
    role: UserRole = UserRole.EMPLOYEE
    organization_id: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    organization_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── ANIMALS ────────────────────────────────────────────

class AnimalCreate(BaseModel):
    animal_code: str
    ear_tag: Optional[str] = None
    rfid_tag: Optional[str] = None
    name: Optional[str] = None
    species: AnimalSpecies
    breed: Optional[str] = None
    gender: AnimalGender
    date_of_birth: Optional[date] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    ownership_type: OwnershipType = OwnershipType.FARM
    notes: Optional[str] = None
    farm_id: Optional[str] = None
    initial_weight_kg: Optional[Decimal] = None


class AnimalUpdate(BaseModel):
    name: Optional[str] = None
    species: Optional[AnimalSpecies] = None
    breed: Optional[str] = None
    status: Optional[AnimalStatus] = None
    ownership_type: Optional[OwnershipType] = None
    notes: Optional[str] = None
    ear_tag: Optional[str] = None
    rfid_tag: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    date_of_birth: Optional[date] = None


class AnimalOut(BaseModel):
    id: str
    animal_code: str
    ear_tag: Optional[str]
    rfid_tag: Optional[str]
    name: Optional[str]
    species: AnimalSpecies
    breed: Optional[str]
    gender: AnimalGender
    date_of_birth: Optional[date]
    purchase_date: Optional[date]
    purchase_price: Optional[Decimal]
    current_value: Optional[Decimal]
    feed_cost: Optional[Decimal] = None
    status: AnimalStatus
    ownership_type: OwnershipType
    farm_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── ANIMAL BREEDS ───────────────────────────────────────

class AnimalBreedCreate(BaseModel):
    name: str
    species: Optional[str] = None
    description: Optional[str] = None


class AnimalBreedOut(BaseModel):
    id: str
    name: str
    species: Optional[str]
    description: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class WeightCreate(BaseModel):
    weight_kg: Decimal
    recorded_date: date
    notes: Optional[str] = None


class WeightOut(BaseModel):
    id: str
    animal_id: str
    weight_kg: Decimal
    recorded_date: date
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── VACCINATIONS ────────────────────────────────────────

class VaccinationCreate(BaseModel):
    animal_id: str
    vaccine_name: str
    administered_date: date
    next_due_date: Optional[date] = None
    administered_by: Optional[str] = None
    dose: Optional[str] = None
    notes: Optional[str] = None


class VaccinationOut(BaseModel):
    id: str
    animal_id: str
    vaccine_name: str
    administered_date: date
    next_due_date: Optional[date]
    administered_by: Optional[str]
    dose: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── TREATMENTS ──────────────────────────────────────────

class TreatmentCreate(BaseModel):
    animal_id: str
    diagnosis: str
    treatment_description: Optional[str] = None
    medicine_used: Optional[str] = None
    treatment_date: date
    follow_up_date: Optional[date] = None
    treated_by: Optional[str] = None
    cost: Optional[Decimal] = None


class TreatmentOut(BaseModel):
    id: str
    animal_id: str
    diagnosis: str
    treatment_date: date
    cost: Optional[Decimal]
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── MILK ────────────────────────────────────────────────

class MilkProductionCreate(BaseModel):
    animal_id: str
    production_date: date
    session: MilkSession
    quantity_liters: Decimal
    fat_percentage: Optional[Decimal] = None
    remarks: Optional[str] = None


class MilkProductionOut(BaseModel):
    id: str
    animal_id: str
    animal_code: Optional[str] = None
    animal_name: Optional[str] = None
    animal_species: Optional[str] = None
    production_date: date
    session: MilkSession
    quantity_liters: Decimal
    fat_percentage: Optional[Decimal]
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MilkImportRow(BaseModel):
    animal_code: str
    production_date: date
    session: str          # morning / evening / both
    quantity_liters: Decimal
    fat_percentage: Optional[Decimal] = None
    remarks: Optional[str] = None


class MilkSaleCreate(BaseModel):
    sale_date: date
    buyer_name: Optional[str] = None
    vendor_id: Optional[str] = None
    customer_id: Optional[str] = None
    quantity_liters: Decimal
    price_per_liter: Decimal
    total_amount: Optional[Decimal] = None  # auto-calculated if omitted
    payment_method: str = "cash"            # cash | credit
    payment_status: str = "paid"
    notes: Optional[str] = None


class MilkSaleOut(BaseModel):
    id: str
    sale_date: date
    buyer_name: Optional[str]
    vendor_id: Optional[str]
    vendor_name: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    quantity_liters: Decimal
    price_per_liter: Decimal
    total_amount: Decimal
    payment_method: Optional[str]
    payment_status: str
    journal_entry_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── INVENTORY ───────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    min_stock_level: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    description: Optional[str] = None


class ProductOut(BaseModel):
    id: str
    name: str
    category: Optional[str]
    unit: Optional[str]
    current_stock: Decimal
    min_stock_level: Optional[Decimal]
    unit_cost: Optional[Decimal]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InventoryTxCreate(BaseModel):
    product_id: str
    transaction_type: InventoryTxType
    quantity: Decimal
    unit_cost: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    transaction_date: date


class InventoryTxOut(BaseModel):
    id: str
    product_id: str
    transaction_type: InventoryTxType
    quantity: Decimal
    total_cost: Optional[Decimal]
    transaction_date: date
    created_at: datetime

    class Config:
        from_attributes = True


# ─── AGRICULTURE ─────────────────────────────────────────

class FieldCreate(BaseModel):
    name: str
    area_acres: Optional[Decimal] = None
    soil_type: Optional[str] = None
    location_description: Optional[str] = None
    farm_id: Optional[str] = None


class FieldOut(BaseModel):
    id: str
    name: str
    area_acres: Optional[Decimal]
    soil_type: Optional[str]
    is_active: bool
    farm_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class CropCycleCreate(BaseModel):
    field_id: str
    crop_name: str
    variety: Optional[str] = None
    sowing_date: Optional[date] = None
    expected_harvest_date: Optional[date] = None
    seed_cost: Optional[Decimal] = None
    fertilizer_cost: Optional[Decimal] = None
    labor_cost: Optional[Decimal] = None
    other_cost: Optional[Decimal] = None
    expected_yield_kg: Optional[Decimal] = None


class CropCycleOut(BaseModel):
    id: str
    field_id: str
    crop_name: str
    variety: Optional[str]
    sowing_date: Optional[date]
    status: CropStatus
    actual_yield_kg: Optional[Decimal]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── EMPLOYEES ───────────────────────────────────────────

class EmployeeCreate(BaseModel):
    employee_code: Optional[str] = None
    full_name: str
    cnic: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    join_date: Optional[date] = None
    monthly_salary: Optional[Decimal] = None


class EmployeeOut(BaseModel):
    id: str
    employee_code: Optional[str]
    full_name: str
    cnic: Optional[str]
    phone: Optional[str]
    designation: Optional[str]
    department: Optional[str]
    monthly_salary: Optional[Decimal]
    status: EmploymentStatus
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    employee_id: str
    date: date
    status: AttendanceStatus
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    overtime_hours: Optional[Decimal] = None
    notes: Optional[str] = None


class AttendanceOut(BaseModel):
    id: str
    employee_id: str
    date: date
    status: AttendanceStatus
    check_in: Optional[str]
    check_out: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── INVESTORS ───────────────────────────────────────────

class InvestorCreate(BaseModel):
    full_name: str
    cnic: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    profit_share_percentage: Optional[Decimal] = None


class InvestorOut(BaseModel):
    id: str
    full_name: str
    phone: Optional[str]
    email: Optional[str]
    profit_share_percentage: Optional[Decimal]
    total_capital: Decimal
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class InvestorCapitalCreate(BaseModel):
    investor_id: str
    amount: Decimal
    contribution_date: date
    type: str = "deposit"
    notes: Optional[str] = None


class ProfitDistributionCreate(BaseModel):
    investor_id: str
    amount: Decimal
    distribution_date: date
    period: Optional[str] = None
    distribution_type: str = "profit"
    notes: Optional[str] = None


class ProfitDistributionOut(BaseModel):
    id: str
    investor_id: str
    amount: Decimal
    distribution_date: date
    period: Optional[str]
    distribution_type: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class InvestorROI(BaseModel):
    investor_id: str
    full_name: str
    total_invested: Decimal
    total_distributed: Decimal
    roi_percentage: Decimal
    net_position: Decimal
    active_animals: int


class InvestorPortfolioAnimal(BaseModel):
    animal_id: str
    animal_code: str
    name: Optional[str]
    breed: str
    ownership_percentage: Decimal
    start_date: date


# ─── PALLAI ──────────────────────────────────────────────

class PallaiCustomerCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    cnic: Optional[str] = None


class PallaiCustomerOut(BaseModel):
    id: str
    full_name: str
    phone: Optional[str]
    email: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PallaiPackageCreate(BaseModel):
    name: str
    billing_model: str
    price: Decimal
    includes_feed: bool = False
    includes_vet: bool = False
    description: Optional[str] = None


class PallaiPackageOut(BaseModel):
    id: str
    name: str
    billing_model: str
    price: Decimal
    includes_feed: bool
    includes_vet: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PallaiSubscriptionCreate(BaseModel):
    customer_id: str
    animal_id: str
    package_id: str
    start_date: date
    end_date: Optional[date] = None
    monthly_fee: Optional[Decimal] = None
    notes: Optional[str] = None


class PallaiSubscriptionOut(BaseModel):
    id: str
    customer_id: str
    animal_id: str
    package_id: str
    start_date: date
    end_date: Optional[date]
    monthly_fee: Optional[Decimal]
    is_active: bool
    notes: Optional[str]
    created_at: datetime
    customer_name: Optional[str] = None
    animal_name: Optional[str] = None
    package_name: Optional[str] = None

    class Config:
        from_attributes = True


class PallaiLedgerEntry(BaseModel):
    date: date
    description: str
    invoice_number: Optional[str] = None
    amount: Decimal
    paid_amount: Decimal
    balance: Decimal
    status: str


# ─── INVOICES ────────────────────────────────────────────

class InvoiceLineItemCreate(BaseModel):
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    total: Decimal


class InvoiceCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    issue_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    line_items: List[InvoiceLineItemCreate] = []


class InvoiceOut(BaseModel):
    id: str
    invoice_number: str
    customer_name: Optional[str]
    issue_date: date
    due_date: Optional[date]
    total_amount: Decimal
    paid_amount: Decimal
    status: InvoiceStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ─── PAYMENTS ────────────────────────────────────────────

class PaymentCreate(BaseModel):
    invoice_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    amount: Decimal
    payment_date: date
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    id: str
    invoice_id: Optional[str]
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    amount: Decimal
    payment_date: date
    payment_method: Optional[str]
    reference: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── NOTIFICATIONS ───────────────────────────────────────

class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    type: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── CHART OF ACCOUNTS ───────────────────────────────────

class AccountCreate(BaseModel):
    account_code: str
    account_name: str
    account_type: AccountType
    parent_id: Optional[str] = None
    description: Optional[str] = None


class AccountUpdate(BaseModel):
    account_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AccountOut(BaseModel):
    id: str
    account_code: str
    account_name: str
    account_type: AccountType
    parent_id: Optional[str]
    description: Optional[str]
    is_system: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── JOURNAL ENTRIES ──────────────────────────────────────

class JournalLineCreate(BaseModel):
    account_id: str
    description: Optional[str] = None
    debit_amount: Decimal = Decimal("0")
    credit_amount: Decimal = Decimal("0")


class JournalLineOut(BaseModel):
    id: str
    account_id: str
    account_code: Optional[str] = None
    account_name: Optional[str] = None
    description: Optional[str]
    debit_amount: Decimal
    credit_amount: Decimal

    class Config:
        from_attributes = True


class JournalEntryCreate(BaseModel):
    entry_date: date
    description: str
    reference: Optional[str] = None
    lines: List[JournalLineCreate]


class JournalEntryOut(BaseModel):
    id: str
    entry_number: str
    entry_date: date
    description: str
    reference: Optional[str]
    status: JournalEntryStatus
    total_debit: Decimal
    total_credit: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class JournalEntryDetailOut(JournalEntryOut):
    lines: List[JournalLineOut] = []


# ─── VENDORS ─────────────────────────────────────────────

class VendorCreate(BaseModel):
    vendor_code: Optional[str] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    ntn: Optional[str] = None


class VendorOut(BaseModel):
    id: str
    vendor_code: Optional[str]
    name: str
    phone: Optional[str]
    email: Optional[str]
    ntn: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── VENDOR BILLS (AP) ────────────────────────────────────

class VendorBillLineCreate(BaseModel):
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    total: Decimal
    account_id: Optional[str] = None


class VendorBillCreate(BaseModel):
    vendor_id: str
    bill_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    line_items: List[VendorBillLineCreate] = []


class VendorBillOut(BaseModel):
    id: str
    bill_number: str
    vendor_id: str
    vendor_name: Optional[str] = None
    bill_date: date
    due_date: Optional[date]
    total_amount: Decimal
    paid_amount: Decimal
    status: VendorBillStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ─── PAYROLL ─────────────────────────────────────────────

class PayrollRunCreate(BaseModel):
    month: int
    year: int
    notes: Optional[str] = None


class PayrollRecordOut(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    basic_salary: Decimal
    days_present: int
    working_days: int
    gross_salary: Decimal
    deductions: Decimal
    net_salary: Decimal

    class Config:
        from_attributes = True


class PayrollRunOut(BaseModel):
    id: str
    month: int
    year: int
    total_gross: Decimal
    total_deductions: Decimal
    total_net: Decimal
    status: PayrollStatus
    created_at: datetime

    class Config:
        from_attributes = True


class PayrollRunDetailOut(PayrollRunOut):
    records: List[PayrollRecordOut] = []


# ─── COST CENTERS ────────────────────────────────────────

class CostCenterCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class CostCenterOut(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── FINANCIAL REPORTS ────────────────────────────────────

class PLLineItem(BaseModel):
    account_code: str
    account_name: str
    amount: Decimal


class ProfitLossReport(BaseModel):
    period_start: date
    period_end: date
    revenue: List[PLLineItem]
    total_revenue: Decimal
    cost_of_goods: List[PLLineItem]
    total_cogs: Decimal
    gross_profit: Decimal
    operating_expenses: List[PLLineItem]
    total_opex: Decimal
    net_profit: Decimal


class BalanceSheetItem(BaseModel):
    account_code: str
    account_name: str
    balance: Decimal


class BalanceSheetReport(BaseModel):
    as_of_date: date
    assets: List[BalanceSheetItem]
    total_assets: Decimal
    liabilities: List[BalanceSheetItem]
    total_liabilities: Decimal
    equity: List[BalanceSheetItem]
    total_equity: Decimal
    total_liabilities_equity: Decimal


class TrialBalanceItem(BaseModel):
    account_code: str
    account_name: str
    account_type: AccountType
    total_debit: Decimal
    total_credit: Decimal
    balance: Decimal


class LedgerEntry(BaseModel):
    entry_date: date
    entry_number: str
    description: str
    debit: Decimal
    credit: Decimal
    balance: Decimal


# ── Customer Categories ──────────────────────────────────

class CustomerCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class CustomerCategoryOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    customer_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ── Customers ────────────────────────────────────────────

class CustomerCreate(BaseModel):
    category_id: Optional[str] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    cnic: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class CustomerOut(BaseModel):
    id: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    cnic: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
