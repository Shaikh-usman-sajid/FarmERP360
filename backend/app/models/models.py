import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, ForeignKey,
    Numeric, Integer, Text, Date, Enum, JSON, Float, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from app.core.database import Base
import enum


def gen_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    OWNER = "owner"
    ACCOUNTANT = "accountant"
    FARM_MANAGER = "farm_manager"
    VET_MANAGER = "vet_manager"
    EMPLOYEE = "employee"
    DATA_ENTRY = "data_entry"
    INVESTOR = "investor"
    PALLAI_CUSTOMER = "pallai_customer"


class AnimalSpecies(str, enum.Enum):
    GOAT = "goat"
    BUFFALO = "buffalo"
    CATTLE = "cattle"
    OTHER = "other"


class AnimalGender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"


class AnimalStatus(str, enum.Enum):
    ACTIVE = "active"
    SOLD = "sold"
    DECEASED = "deceased"
    TRANSFERRED = "transferred"


class OwnershipType(str, enum.Enum):
    FARM = "farm"
    INVESTOR = "investor"
    SHARED = "shared"
    PALLAI = "pallai"
    PALLAI_WITH_ANIMAL = "pallai_with_animal"
    INSTALLMENT = "installment"


class MilkSession(str, enum.Enum):
    MORNING = "morning"
    EVENING = "evening"


class EmploymentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    LEAVE = "leave"


class InventoryTxType(str, enum.Enum):
    IN = "in"
    OUT = "out"
    ADJUSTMENT = "adjustment"


class CropStatus(str, enum.Enum):
    PLANNED = "planned"
    GROWING = "growing"
    HARVESTED = "harvested"
    FAILED = "failed"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskCategory(str, enum.Enum):
    FEEDING = "feeding"
    MILKING = "milking"
    HEALTH_CHECK = "health_check"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    VACCINATION = "vaccination"
    TREATMENT = "treatment"
    OTHER = "other"


class FeedTxType(str, enum.Enum):
    IN = "in"
    OUT = "out"
    ADJUSTMENT = "adjustment"


class FeedSession(str, enum.Enum):
    MORNING = "morning"
    EVENING = "evening"
    BOTH = "both"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class AccountType(str, enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class JournalEntryStatus(str, enum.Enum):
    DRAFT = "draft"
    POSTED = "posted"
    VOIDED = "voided"


class VendorBillStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class PayrollStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PROCESSED = "processed"
    PAID = "paid"


# ─────────────────────────────────────────────
# ORGANIZATIONS / TENANTS
# ─────────────────────────────────────────────

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    logo_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    farms = relationship("Farm", back_populates="organization")
    users = relationship("User", back_populates="organization")


# ─────────────────────────────────────────────
# FARMS
# ─────────────────────────────────────────────

class Farm(Base):
    __tablename__ = "farms"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(500))
    total_area_acres = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="farms")
    animals = relationship("Animal", back_populates="farm")
    fields = relationship("Field", back_populates="farm")


# ─────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50))
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(500), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.EMPLOYEE)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    profile_photo = Column(String(500))
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organization = relationship("Organization", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


# ─────────────────────────────────────────────
# ANIMALS
# ─────────────────────────────────────────────

class Animal(Base):
    __tablename__ = "animals"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    farm_id = Column(UUID(as_uuid=False), ForeignKey("farms.id"), nullable=False, index=True)
    animal_code = Column(String(50), nullable=False, index=True)
    ear_tag = Column(String(100))
    rfid_tag = Column(String(100))
    name = Column(String(255))
    species = Column(Enum(AnimalSpecies), nullable=False)
    breed = Column(String(100))
    gender = Column(Enum(AnimalGender), nullable=False)
    date_of_birth = Column(Date)
    purchase_date = Column(Date)
    purchase_price = Column(Numeric(12, 2))
    current_value = Column(Numeric(12, 2))
    status = Column(Enum(AnimalStatus), default=AnimalStatus.ACTIVE, index=True)
    ownership_type = Column(Enum(OwnershipType), default=OwnershipType.FARM)
    pallai_customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=True)
    notes = Column(Text)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_animals_org_status', 'organization_id', 'status'),
        Index('ix_animals_org_active', 'organization_id', 'is_active'),
        Index('ix_animals_farm_active', 'farm_id', 'is_active'),
    )

    farm = relationship("Farm", back_populates="animals")
    pallai_customer = relationship("Customer", foreign_keys=[pallai_customer_id])
    photos = relationship("AnimalPhoto", back_populates="animal", cascade="all, delete-orphan")
    weights = relationship("AnimalWeight", back_populates="animal", cascade="all, delete-orphan")
    ownerships = relationship("AnimalOwnership", back_populates="animal")
    vaccinations = relationship("Vaccination", back_populates="animal")
    treatments = relationship("Treatment", back_populates="animal")
    milk_productions = relationship("MilkProduction", back_populates="animal")
    breeding_records = relationship("BreedingRecord", back_populates="animal", foreign_keys="BreedingRecord.animal_id")


class AnimalPhoto(Base):
    __tablename__ = "animal_photos"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=False, index=True)
    photo_url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)
    caption = Column(String(255))
    uploaded_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    animal = relationship("Animal", back_populates="photos")


class AnimalWeight(Base):
    __tablename__ = "animal_weights"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=False, index=True)
    weight_kg = Column(Numeric(8, 2), nullable=False)
    recorded_date = Column(Date, nullable=False, index=True)
    recorded_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_animal_weights_animal_date', 'animal_id', 'recorded_date'),
    )

    animal = relationship("Animal", back_populates="weights")


class AnimalOwnership(Base):
    __tablename__ = "animal_ownerships"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=False, index=True)
    owner_type = Column(Enum(OwnershipType), nullable=False)
    owner_user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), index=True)
    ownership_percentage = Column(Numeric(5, 2), default=100)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    is_current = Column(Boolean, default=True, index=True)
    transfer_reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_animal_ownerships_user_current', 'owner_user_id', 'is_current'),
    )

    animal = relationship("Animal", back_populates="ownerships")


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────

class VaccineType(Base):
    __tablename__ = "vaccine_types"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    species = Column(String(50), nullable=True)  # null = all species
    type = Column(String(20), default="vaccine")  # vaccine | medicine
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_vaccine_types_org', 'organization_id', 'is_active'),
    )


class Vaccination(Base):
    __tablename__ = "vaccinations"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=False, index=True)
    vaccine_name = Column(String(255), nullable=False)
    administered_date = Column(Date, nullable=False, index=True)
    next_due_date = Column(Date)
    administered_by = Column(String(255))
    dose = Column(String(100))
    notes = Column(Text)
    medicine_product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=True)
    medicine_quantity = Column(Numeric(10, 3), nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_vaccinations_org_date', 'organization_id', 'administered_date'),
        Index('ix_vaccinations_animal_date', 'animal_id', 'administered_date'),
    )

    animal = relationship("Animal", back_populates="vaccinations")


class Treatment(Base):
    __tablename__ = "treatments"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=False, index=True)
    diagnosis = Column(String(500), nullable=False)
    treatment_description = Column(Text)
    medicine_used = Column(String(500))
    treatment_date = Column(Date, nullable=False, index=True)
    follow_up_date = Column(Date)
    treated_by = Column(String(255))
    cost = Column(Numeric(10, 2))
    is_resolved = Column(Boolean, default=False)
    medicine_product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=True)
    medicine_quantity = Column(Numeric(10, 3), nullable=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_treatments_org_date', 'organization_id', 'treatment_date'),
        Index('ix_treatments_animal_date', 'animal_id', 'treatment_date'),
    )

    animal = relationship("Animal", back_populates="treatments")


# ─────────────────────────────────────────────
# BREEDING
# ─────────────────────────────────────────────

class BreedingRecord(Base):
    __tablename__ = "breeding_records"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=False, index=True)
    sire_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), index=True)
    breeding_date = Column(Date, nullable=False)
    expected_delivery = Column(Date)
    actual_delivery = Column(Date)
    offspring_count = Column(Integer, default=0)
    outcome = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    animal = relationship("Animal", back_populates="breeding_records", foreign_keys=[animal_id])


# ─────────────────────────────────────────────
# MILK PRODUCTION
# ─────────────────────────────────────────────

class MilkProduction(Base):
    __tablename__ = "milk_productions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    farm_id = Column(UUID(as_uuid=False), ForeignKey("farms.id"), nullable=False, index=True)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=False, index=True)
    production_date = Column(Date, nullable=False, index=True)
    session = Column(Enum(MilkSession), nullable=False)
    quantity_liters = Column(Numeric(8, 2), nullable=False)
    fat_percentage = Column(Numeric(4, 2))
    remarks = Column(Text)
    recorded_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_milk_prod_org_date', 'organization_id', 'production_date'),
        Index('ix_milk_prod_animal_date', 'animal_id', 'production_date'),
    )

    animal = relationship("Animal", back_populates="milk_productions")


class MilkSale(Base):
    __tablename__ = "milk_sales"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    sale_date = Column(Date, nullable=False, index=True)
    buyer_name = Column(String(255))
    vendor_id = Column(UUID(as_uuid=False), ForeignKey("vendors.id"), nullable=True, index=True)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=True, index=True)
    quantity_liters = Column(Numeric(8, 2), nullable=False)
    price_per_liter = Column(Numeric(8, 2), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(20), default="cash")   # cash | credit
    payment_status = Column(String(50), default="paid")
    journal_entry_id = Column(UUID(as_uuid=False), ForeignKey("journal_entries.id"), nullable=True)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    vendor = relationship("Vendor", foreign_keys=[vendor_id])
    customer = relationship("Customer", foreign_keys=[customer_id], back_populates="milk_sales")


# ─────────────────────────────────────────────
# INVENTORY
# ─────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    unit = Column(String(50))
    current_stock = Column(Numeric(12, 2), default=0)
    min_stock_level = Column(Numeric(12, 2), default=0)
    unit_cost = Column(Numeric(10, 2))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions = relationship("InventoryTransaction", back_populates="product")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=False, index=True)
    transaction_type = Column(Enum(InventoryTxType), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_cost = Column(Numeric(10, 2))
    total_cost = Column(Numeric(12, 2))
    reference = Column(String(255))
    notes = Column(Text)
    transaction_date = Column(Date, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_inv_tx_org_date', 'organization_id', 'transaction_date'),
        Index('ix_inv_tx_product_date', 'product_id', 'transaction_date'),
    )

    product = relationship("Product", back_populates="transactions")


class ProductCategory(Base):
    __tablename__ = "product_categories"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# AGRICULTURE
# ─────────────────────────────────────────────

class Field(Base):
    __tablename__ = "fields"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    farm_id = Column(UUID(as_uuid=False), ForeignKey("farms.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    area_acres = Column(Numeric(10, 2))
    soil_type = Column(String(100))
    location_description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    farm = relationship("Farm", back_populates="fields")
    crop_cycles = relationship("CropCycle", back_populates="field")


class CropCycle(Base):
    __tablename__ = "crop_cycles"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    field_id = Column(UUID(as_uuid=False), ForeignKey("fields.id"), nullable=False, index=True)
    crop_name = Column(String(100), nullable=False)
    variety = Column(String(100))
    sowing_date = Column(Date)
    expected_harvest_date = Column(Date)
    actual_harvest_date = Column(Date)
    status = Column(Enum(CropStatus), default=CropStatus.PLANNED)
    seed_product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=True)
    seed_quantity = Column(Numeric(12, 3), nullable=True)
    seed_cost = Column(Numeric(12, 2))
    fertilizer_cost = Column(Numeric(12, 2))
    labor_cost = Column(Numeric(12, 2))
    other_cost = Column(Numeric(12, 2))
    expected_yield_kg = Column(Numeric(12, 2))
    actual_yield_kg = Column(Numeric(12, 2))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    field = relationship("Field", back_populates="crop_cycles")


# ─────────────────────────────────────────────
# EMPLOYEES
# ─────────────────────────────────────────────

class Employee(Base):
    __tablename__ = "employees"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), index=True)
    employee_code = Column(String(50))
    full_name = Column(String(255), nullable=False)
    cnic = Column(String(20))
    phone = Column(String(50))
    address = Column(Text)
    designation = Column(String(100))
    department = Column(String(100))
    join_date = Column(Date)
    monthly_salary = Column(Numeric(12, 2))
    photo_url = Column(String(500))
    status = Column(Enum(EmploymentStatus), default=EmploymentStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attendance_records = relationship("AttendanceRecord", back_populates="employee")
    salary_history = relationship("EmployeeSalaryHistory", back_populates="employee", cascade="all, delete-orphan")


class EmployeeSalaryHistory(Base):
    __tablename__ = "employee_salary_history"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=False), ForeignKey("employees.id"), nullable=False, index=True)
    salary_amount = Column(Numeric(12, 2), nullable=False)
    previous_salary = Column(Numeric(12, 2))
    effective_date = Column(Date, nullable=False)
    change_reason = Column(String(200))
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="salary_history")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=False), ForeignKey("employees.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    status = Column(Enum(AttendanceStatus), nullable=False)
    check_in = Column(String(10))
    check_out = Column(String(10))
    overtime_hours = Column(Numeric(4, 2), default=0)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_attendance_emp_date', 'employee_id', 'date'),
        Index('ix_attendance_org_date', 'organization_id', 'date'),
    )

    employee = relationship("Employee", back_populates="attendance_records")


# ─────────────────────────────────────────────
# INVESTORS
# ─────────────────────────────────────────────

class Investor(Base):
    __tablename__ = "investors"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), index=True)
    full_name = Column(String(255), nullable=False)
    cnic = Column(String(20))
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    profit_share_percentage = Column(Numeric(5, 2), default=33.33)
    total_capital = Column(Numeric(14, 2), default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    capital_contributions = relationship("InvestorCapital", back_populates="investor")
    distributions = relationship("ProfitDistribution", back_populates="investor")


class InvestorCapital(Base):
    __tablename__ = "investor_capital"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    investor_id = Column(UUID(as_uuid=False), ForeignKey("investors.id"), nullable=False, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    contribution_date = Column(Date, nullable=False)
    type = Column(String(50), default="deposit")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    investor = relationship("Investor", back_populates="capital_contributions")


class ProfitDistribution(Base):
    __tablename__ = "profit_distributions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    investor_id = Column(UUID(as_uuid=False), ForeignKey("investors.id"), nullable=False, index=True)
    amount = Column(Numeric(14, 2), nullable=False)
    distribution_date = Column(Date, nullable=False)
    period = Column(String(7))
    distribution_type = Column(String(50), default="profit")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    investor = relationship("Investor", back_populates="distributions")


# ─────────────────────────────────────────────
# PALLAI CUSTOMERS
# ─────────────────────────────────────────────

class PallaiCustomer(Base):
    __tablename__ = "pallai_customers"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), index=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    cnic = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subscriptions = relationship("PallaiSubscription", back_populates="customer")


class PallaiPackage(Base):
    __tablename__ = "pallai_packages"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    billing_model = Column(String(50))  # daily, monthly, premium, custom
    price = Column(Numeric(12, 2), nullable=False)
    includes_feed = Column(Boolean, default=False)
    includes_vet = Column(Boolean, default=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PallaiSubscription(Base):
    __tablename__ = "pallai_subscriptions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("pallai_customers.id"), nullable=False, index=True)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=False, index=True)
    package_id = Column(UUID(as_uuid=False), ForeignKey("pallai_packages.id"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True, index=True)
    monthly_fee = Column(Numeric(12, 2))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_pallai_sub_org_active', 'organization_id', 'is_active'),
        Index('ix_pallai_sub_customer_active', 'customer_id', 'is_active'),
    )

    customer = relationship("PallaiCustomer", back_populates="subscriptions")
    package = relationship("PallaiPackage", foreign_keys=[package_id])
    animal = relationship("Animal", foreign_keys=[animal_id])


# ─────────────────────────────────────────────
# INVOICES & PAYMENTS
# ─────────────────────────────────────────────

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False)
    customer_name = Column(String(255))
    customer_id = Column(UUID(as_uuid=False))
    issue_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date)
    subtotal = Column(Numeric(14, 2), default=0)
    tax_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    paid_amount = Column(Numeric(14, 2), default=0)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, index=True)
    notes = Column(Text)
    subscription_id = Column(UUID(as_uuid=False), ForeignKey("pallai_subscriptions.id"), nullable=True, index=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_invoices_org_status', 'organization_id', 'status'),
        Index('ix_invoices_org_date', 'organization_id', 'issue_date'),
    )

    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    invoice_id = Column(UUID(as_uuid=False), ForeignKey("invoices.id"), nullable=False, index=True)
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(14, 2), nullable=False)

    invoice = relationship("Invoice", back_populates="line_items")


class Payment(Base):
    __tablename__ = "payments"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    invoice_id = Column(UUID(as_uuid=False), ForeignKey("invoices.id"), index=True)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("customers.id"), nullable=True, index=True)
    customer_name = Column(String(255), nullable=True)
    amount = Column(Numeric(14, 2), nullable=False)
    payment_date = Column(Date, nullable=False, index=True)
    payment_method = Column(String(100))
    reference = Column(String(255))
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_payments_org_date', 'organization_id', 'payment_date'),
    )

    invoice = relationship("Invoice", back_populates="payments")
    customer = relationship("Customer", foreign_keys=[customer_id])


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50))
    is_read = Column(Boolean, default=False, index=True)
    link = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_notifications_user_read', 'user_id', 'is_read'),
    )


# ─────────────────────────────────────────────
# AUDIT LOGS
# ─────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), index=True)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), index=True)
    action = Column(String(100), nullable=False)
    module = Column(String(100))
    record_id = Column(String(255))
    old_values = Column(JSON)
    new_values = Column(JSON)
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('ix_audit_logs_org_created', 'organization_id', 'created_at'),
    )

    user = relationship("User", back_populates="audit_logs")


# ─────────────────────────────────────────────
# ACCOUNTING — CHART OF ACCOUNTS
# ─────────────────────────────────────────────

class ChartOfAccount(Base):
    __tablename__ = "chart_of_accounts"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    account_code = Column(String(20), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_type = Column(Enum(AccountType), nullable=False, index=True)
    parent_id = Column(UUID(as_uuid=False), ForeignKey("chart_of_accounts.id"), index=True)
    description = Column(Text)
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_coa_org_type', 'organization_id', 'account_type'),
    )

    children = relationship("ChartOfAccount", backref=backref("parent", remote_side=[id]))
    journal_lines = relationship("JournalEntryLine", back_populates="account")


# ─────────────────────────────────────────────
# ACCOUNTING — JOURNAL ENTRIES
# ─────────────────────────────────────────────

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    entry_number = Column(String(50), nullable=False)
    entry_date = Column(Date, nullable=False, index=True)
    description = Column(String(500), nullable=False)
    reference = Column(String(255))
    status = Column(Enum(JournalEntryStatus), default=JournalEntryStatus.DRAFT, index=True)
    total_debit = Column(Numeric(14, 2), default=0)
    total_credit = Column(Numeric(14, 2), default=0)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_journal_entries_org_date', 'organization_id', 'entry_date'),
        Index('ix_journal_entries_org_status', 'organization_id', 'status'),
    )

    lines = relationship("JournalEntryLine", back_populates="entry", cascade="all, delete-orphan")


class JournalEntryLine(Base):
    __tablename__ = "journal_entry_lines"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    entry_id = Column(UUID(as_uuid=False), ForeignKey("journal_entries.id"), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=False), ForeignKey("chart_of_accounts.id"), nullable=False, index=True)
    description = Column(String(500))
    debit_amount = Column(Numeric(14, 2), default=0)
    credit_amount = Column(Numeric(14, 2), default=0)

    entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("ChartOfAccount", back_populates="journal_lines")


# ─────────────────────────────────────────────
# ACCOUNTING — VENDORS & BILLS (AP)
# ─────────────────────────────────────────────

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    vendor_code = Column(String(50))
    name = Column(String(255), nullable=False)
    phone = Column(String(50))
    email = Column(String(255))
    address = Column(Text)
    ntn = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    bills = relationship("VendorBill", back_populates="vendor")


class VendorBill(Base):
    __tablename__ = "vendor_bills"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    vendor_id = Column(UUID(as_uuid=False), ForeignKey("vendors.id"), nullable=False, index=True)
    bill_number = Column(String(50), nullable=False)
    bill_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date)
    subtotal = Column(Numeric(14, 2), default=0)
    tax_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    paid_amount = Column(Numeric(14, 2), default=0)
    status = Column(Enum(VendorBillStatus), default=VendorBillStatus.DRAFT, index=True)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_vendor_bills_org_status', 'organization_id', 'status'),
        Index('ix_vendor_bills_vendor_date', 'vendor_id', 'bill_date'),
    )

    vendor = relationship("Vendor", back_populates="bills")
    line_items = relationship("VendorBillLine", back_populates="bill", cascade="all, delete-orphan")


class VendorBillLine(Base):
    __tablename__ = "vendor_bill_lines"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    bill_id = Column(UUID(as_uuid=False), ForeignKey("vendor_bills.id"), nullable=False, index=True)
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(10, 2), default=1)
    unit_price = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(14, 2), nullable=False)
    account_id = Column(UUID(as_uuid=False), ForeignKey("chart_of_accounts.id"), index=True)

    bill = relationship("VendorBill", back_populates="line_items")


# ─────────────────────────────────────────────
# ACCOUNTING — PAYROLL
# ─────────────────────────────────────────────

class PayrollRun(Base):
    __tablename__ = "payroll_runs"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_gross = Column(Numeric(14, 2), default=0)
    total_deductions = Column(Numeric(14, 2), default=0)
    total_net = Column(Numeric(14, 2), default=0)
    status = Column(Enum(PayrollStatus), default=PayrollStatus.DRAFT)
    notes = Column(Text)
    processed_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    submitted_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    paid_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_payroll_runs_org_year_month', 'organization_id', 'year', 'month'),
    )

    records = relationship("PayrollRecord", back_populates="payroll_run", cascade="all, delete-orphan")


class PayrollRecord(Base):
    __tablename__ = "payroll_records"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    payroll_run_id = Column(UUID(as_uuid=False), ForeignKey("payroll_runs.id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=False), ForeignKey("employees.id"), nullable=False, index=True)
    basic_salary = Column(Numeric(12, 2), nullable=False)
    days_present = Column(Integer, default=0)
    working_days = Column(Integer, default=26)
    gross_salary = Column(Numeric(12, 2), nullable=False)
    deductions = Column(Numeric(12, 2), default=0)
    net_salary = Column(Numeric(12, 2), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    payroll_run = relationship("PayrollRun", back_populates="records")
    employee = relationship("Employee")


# ─────────────────────────────────────────────
# ACCOUNTING — COST CENTERS
# ─────────────────────────────────────────────

class CostCenter(Base):
    __tablename__ = "cost_centers"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    code = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ─────────────────────────────────────────────
# FEED MANAGEMENT
# ─────────────────────────────────────────────

class FeedType(Base):
    __tablename__ = "feed_types"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    unit = Column(String(50), nullable=False, default="kg")
    current_stock = Column(Numeric(12, 2), default=0)
    min_stock_level = Column(Numeric(12, 2), default=0)
    cost_per_unit = Column(Numeric(10, 2))
    suitable_for = Column(String(255))
    description = Column(Text)
    inventory_product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stock_transactions = relationship("FeedStockTransaction", back_populates="feed_type")
    consumption_records = relationship("FeedConsumption", back_populates="feed_type")
    inventory_product = relationship("Product", foreign_keys=[inventory_product_id])


class FeedStockTransaction(Base):
    __tablename__ = "feed_stock_transactions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    feed_type_id = Column(UUID(as_uuid=False), ForeignKey("feed_types.id"), nullable=False, index=True)
    transaction_type = Column(Enum(FeedTxType), nullable=False)
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_cost = Column(Numeric(10, 2))
    total_cost = Column(Numeric(12, 2))
    reference = Column(String(255))
    notes = Column(Text)
    transaction_date = Column(Date, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_feed_stock_org_date', 'organization_id', 'transaction_date'),
        Index('ix_feed_stock_feed_date', 'feed_type_id', 'transaction_date'),
    )

    feed_type = relationship("FeedType", back_populates="stock_transactions")


class FeedConsumption(Base):
    __tablename__ = "feed_consumption"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    feed_type_id = Column(UUID(as_uuid=False), ForeignKey("feed_types.id"), nullable=False, index=True)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=True, index=True)
    species = Column(Enum(AnimalSpecies), nullable=True)
    quantity = Column(Numeric(12, 2), nullable=False)
    consumption_date = Column(Date, nullable=False, index=True)
    session = Column(Enum(FeedSession), nullable=False, default=FeedSession.MORNING)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_feed_consumption_org_date', 'organization_id', 'consumption_date'),
        Index('ix_feed_consumption_feed_date', 'feed_type_id', 'consumption_date'),
    )

    feed_type = relationship("FeedType", back_populates="consumption_records")
    animal = relationship("Animal")


# ─────────────────────────────────────────────
# EMPLOYEE TASKS
# ─────────────────────────────────────────────

class Task(Base):
    __tablename__ = "tasks"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(Enum(TaskCategory), nullable=False, default=TaskCategory.OTHER)
    priority = Column(Enum(TaskPriority), nullable=False, default=TaskPriority.MEDIUM)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.PENDING, index=True)
    assigned_to_id = Column(UUID(as_uuid=False), ForeignKey("employees.id"), nullable=True, index=True)
    assigned_by_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    animal_id = Column(UUID(as_uuid=False), ForeignKey("animals.id"), nullable=True, index=True)
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    completion_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('ix_tasks_org_status', 'organization_id', 'status'),
        Index('ix_tasks_assigned_status', 'assigned_to_id', 'status'),
    )

    assigned_to = relationship("Employee", foreign_keys=[assigned_to_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    animal = relationship("Animal")


# ─────────────────────────────────────────────
# ANIMAL BREEDS
# ─────────────────────────────────────────────

class AnimalBreed(Base):
    __tablename__ = "animal_breeds"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    species = Column(Enum(AnimalSpecies), nullable=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('ix_animal_breeds_org_species', 'organization_id', 'species'),
    )


# ─────────────────────────────────────────────
# SYSTEM SETTINGS
# ─────────────────────────────────────────────

class SystemSettings(Base):
    __tablename__ = "system_settings"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True)
    key = Column(String(100), nullable=False)
    value = Column(Text)
    is_sensitive = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "key", name="uq_settings_org_key"),
        Index('ix_system_settings_org_cat', 'organization_id', 'category'),
    )


# ─────────────────────────────────────────────
# CUSTOMER CATEGORIES & CUSTOMERS
# ─────────────────────────────────────────────

class CustomerCategory(Base):
    __tablename__ = "customer_categories"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customers = relationship("Customer", back_populates="category")

    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_customer_category_org_name"),
    )


class Customer(Base):
    __tablename__ = "customers"
    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    organization_id = Column(UUID(as_uuid=False), ForeignKey("organizations.id"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=False), ForeignKey("customer_categories.id"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=True)
    email = Column(String(200), nullable=True)
    cnic = Column(String(20), nullable=True)   # XXXXX-XXXXXXX-X
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("CustomerCategory", back_populates="customers")
    milk_sales = relationship("MilkSale", back_populates="customer")
