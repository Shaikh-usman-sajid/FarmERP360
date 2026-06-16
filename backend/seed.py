"""
FarmERP360 - Database Seed Script
Populates demo data for immediate use
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, timedelta
from decimal import Decimal
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import (
    Organization, Farm, User, Animal, AnimalWeight, AnimalOwnership,
    MilkProduction, Product, InventoryTransaction, Field, CropCycle,
    Employee, Investor, InvestorCapital, PallaiCustomer, PallaiPackage,
    Notification, Vaccination, Treatment, Task,
    UserRole, AnimalSpecies, AnimalGender, AnimalStatus, OwnershipType,
    MilkSession, EmploymentStatus, AttendanceStatus, InventoryTxType, CropStatus,
    TaskStatus, TaskPriority, TaskCategory
)


def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        existing = db.query(Organization).filter(Organization.slug == "hayo-farm").first()
        if existing:
            print("✅ Database already seeded. Skipping.")
            return

        print("🌱 Seeding FarmERP360 database...")

        # ─── ORGANIZATION ───────────────────────────────
        org = Organization(
            name="Hayo Telecommunication Farm",
            slug="hayo-farm",
            address="Lahore, Punjab, Pakistan",
            phone="+92-300-0000000",
            email="farm@hayo.net",
            is_active=True
        )
        db.add(org)
        db.flush()

        # ─── FARM ────────────────────────────────────────
        farm = Farm(
            organization_id=org.id,
            name="Main Farm - Lahore",
            location="Lahore, Punjab, Pakistan",
            total_area_acres=Decimal("5.0"),
            is_active=True
        )
        db.add(farm)
        db.flush()

        # ─── USERS ───────────────────────────────────────
        users = {}
        user_data = [
            ("admin@farmerp360.com", "Admin123!@#", "Super Admin", UserRole.SUPER_ADMIN),
            ("owner@farmerp360.com", "Owner123!@#", "Farm Owner", UserRole.OWNER),
            ("accountant@farmerp360.com", "Acc123!@#", "Ahmed Accountant", UserRole.ACCOUNTANT),
            ("manager@farmerp360.com", "Mgr123!@#", "Bilal Manager", UserRole.FARM_MANAGER),
            ("vet@farmerp360.com", "Vet123!@#", "Dr. Sara Vet", UserRole.VET_MANAGER),
            ("employee@farmerp360.com", "Emp123!@#", "Raza Employee", UserRole.EMPLOYEE),
            ("investor1@farmerp360.com", "Inv123!@#", "Investor Ali", UserRole.INVESTOR),
            ("investor2@farmerp360.com", "Inv123!@#", "Investor Khan", UserRole.INVESTOR),
            ("investor3@farmerp360.com", "Inv123!@#", "Investor Malik", UserRole.INVESTOR),
            ("customer1@farmerp360.com", "Cust123!@#", "Pallai Customer Zara", UserRole.PALLAI_CUSTOMER),
        ]

        for email, password, name, role in user_data:
            u = User(
                organization_id=org.id,
                email=email,
                full_name=name,
                hashed_password=hash_password(password),
                role=role,
                is_active=True,
                is_verified=True
            )
            db.add(u)
            users[role.value + "_" + email] = u

        db.flush()

        # ─── EMPLOYEES ───────────────────────────────────
        emp_data = [
            ("EMP001", "Muhammad Raza", "03001234567", "Farm Worker", "Operations", Decimal("25000")),
            ("EMP002", "Asif Ali", "03001234568", "Milkman", "Dairy", Decimal("20000")),
            ("EMP003", "Tariq Mehmood", "03001234569", "Driver", "Transport", Decimal("22000")),
        ]
        employees = []
        for code, name, phone, desig, dept, sal in emp_data:
            e = Employee(
                organization_id=org.id,
                employee_code=code,
                full_name=name,
                phone=phone,
                designation=desig,
                department=dept,
                join_date=date.today() - timedelta(days=180),
                monthly_salary=sal,
                status=EmploymentStatus.ACTIVE
            )
            db.add(e)
            employees.append(e)
        db.flush()

        # ─── INVESTORS ───────────────────────────────────
        inv_data = [
            ("Investor Ali Shah", "42101-1234567-1", "+92-300-1111111", "ali@example.com", Decimal("33.33"), Decimal("500000")),
            ("Investor Khan Sahib", "42101-2345678-2", "+92-300-2222222", "khan@example.com", Decimal("33.33"), Decimal("500000")),
            ("Investor Malik Sb", "42101-3456789-3", "+92-300-3333333", "malik@example.com", Decimal("33.34"), Decimal("500000")),
        ]
        investors = []
        for name, cnic, phone, email, share, capital in inv_data:
            inv = Investor(
                organization_id=org.id,
                full_name=name,
                cnic=cnic,
                phone=phone,
                email=email,
                profit_share_percentage=share,
                total_capital=capital,
                is_active=True
            )
            db.add(inv)
            investors.append(inv)
        db.flush()

        # ─── PALLAI PACKAGES ─────────────────────────────
        packages = []
        pkg_data = [
            ("Basic Monthly", "monthly", Decimal("5000"), False, False),
            ("Premium Monthly", "monthly", Decimal("8000"), True, False),
            ("Premium Vet", "monthly", Decimal("12000"), True, True),
            ("Daily Package", "daily", Decimal("200"), False, False),
        ]
        for name, model, price, feed, vet in pkg_data:
            p = PallaiPackage(
                organization_id=org.id,
                name=name,
                billing_model=model,
                price=price,
                includes_feed=feed,
                includes_vet=vet,
                is_active=True
            )
            db.add(p)
            packages.append(p)
        db.flush()

        # ─── PALLAI CUSTOMER ─────────────────────────────
        pallai_cust = PallaiCustomer(
            organization_id=org.id,
            full_name="Zara Bibi",
            phone="+92-300-4444444",
            email="zara@example.com",
            address="Gulberg, Lahore",
            is_active=True
        )
        db.add(pallai_cust)
        db.flush()

        # ─── ANIMALS - 5 GOATS ────────────────────────────
        goats = []
        goat_data = [
            ("G0001", "Beetal", AnimalGender.FEMALE, date(2022, 3, 15), Decimal("35000")),
            ("G0002", "Beetal", AnimalGender.MALE, date(2022, 6, 10), Decimal("40000")),
            ("G0003", "Kamori", AnimalGender.FEMALE, date(2023, 1, 5), Decimal("30000")),
            ("G0004", "Beetal", AnimalGender.FEMALE, date(2023, 4, 20), Decimal("28000")),
            ("G0005", "Teddy", AnimalGender.MALE, date(2021, 8, 12), Decimal("45000")),
        ]
        for code, breed, gender, dob, value in goat_data:
            g = Animal(
                organization_id=org.id,
                farm_id=farm.id,
                animal_code=code,
                ear_tag=f"ET-{code}",
                species=AnimalSpecies.GOAT,
                breed=breed,
                gender=gender,
                date_of_birth=dob,
                purchase_date=dob + timedelta(days=30),
                purchase_price=value * Decimal("0.8"),
                current_value=value,
                status=AnimalStatus.ACTIVE,
                ownership_type=OwnershipType.FARM,
                is_active=True
            )
            db.add(g)
            goats.append(g)
        db.flush()

        # ─── ANIMALS - 4 BUFFALOES ────────────────────────
        buffaloes = []
        buffalo_data = [
            ("B0001", "Nili-Ravi", AnimalGender.FEMALE, date(2020, 5, 10), Decimal("250000")),
            ("B0002", "Nili-Ravi", AnimalGender.FEMALE, date(2021, 2, 14), Decimal("220000")),
            ("B0003", "Kundi", AnimalGender.FEMALE, date(2019, 11, 3), Decimal("200000")),
            ("B0004", "Nili-Ravi", AnimalGender.MALE, date(2020, 8, 25), Decimal("180000")),
        ]
        for code, breed, gender, dob, value in buffalo_data:
            b = Animal(
                organization_id=org.id,
                farm_id=farm.id,
                animal_code=code,
                ear_tag=f"ET-{code}",
                species=AnimalSpecies.BUFFALO,
                breed=breed,
                gender=gender,
                date_of_birth=dob,
                purchase_date=dob + timedelta(days=60),
                purchase_price=value * Decimal("0.85"),
                current_value=value,
                status=AnimalStatus.ACTIVE,
                ownership_type=OwnershipType.FARM,
                is_active=True
            )
            db.add(b)
            buffaloes.append(b)
        db.flush()

        all_animals = goats + buffaloes

        # ─── WEIGHT RECORDS ──────────────────────────────
        import random
        random.seed(42)
        for animal in all_animals:
            base = 35 if animal.species == AnimalSpecies.GOAT else 350
            for i in range(5, -1, -1):
                w = AnimalWeight(
                    animal_id=animal.id,
                    weight_kg=Decimal(str(round(base + random.uniform(-2, 5) * (6 - i), 1))),
                    recorded_date=date.today() - timedelta(days=i * 30),
                    recorded_by=None
                )
                db.add(w)
        db.flush()

        # ─── VACCINATIONS ────────────────────────────────
        vaccines = ["FMD Vaccine", "Anthrax Vaccine", "HS Vaccine", "PPR Vaccine"]
        for animal in all_animals[:4]:
            v = Vaccination(
                organization_id=org.id,
                animal_id=animal.id,
                vaccine_name=random.choice(vaccines),
                administered_date=date.today() - timedelta(days=random.randint(30, 90)),
                next_due_date=date.today() + timedelta(days=random.randint(10, 60)),
                administered_by="Dr. Sara",
                dose="2ml"
            )
            db.add(v)
        db.flush()

        # ─── MILK PRODUCTION (30 days) ───────────────────
        female_buffaloes = [b for b in buffaloes if b.gender == AnimalGender.FEMALE]
        for i in range(30):
            d = date.today() - timedelta(days=29 - i)
            for buffalo in female_buffaloes:
                for session in [MilkSession.MORNING, MilkSession.EVENING]:
                    qty = Decimal(str(round(random.uniform(6.0, 12.0), 2)))
                    mp = MilkProduction(
                        organization_id=org.id,
                        farm_id=farm.id,
                        animal_id=buffalo.id,
                        production_date=d,
                        session=session,
                        quantity_liters=qty,
                        fat_percentage=Decimal(str(round(random.uniform(5.5, 7.5), 1)))
                    )
                    db.add(mp)
        db.flush()

        # ─── INVENTORY / FEED ────────────────────────────
        feed_items = [
            ("Wheat Bran", "Feed", "kg", Decimal("500"), Decimal("50"), Decimal("35")),
            ("Corn Silage", "Feed", "kg", Decimal("1000"), Decimal("100"), Decimal("18")),
            ("Cottonseed Cake", "Feed", "kg", Decimal("200"), Decimal("30"), Decimal("55")),
            ("Mineral Mix", "Supplement", "kg", Decimal("50"), Decimal("10"), Decimal("150")),
            ("Ivermectin", "Medicine", "vial", Decimal("20"), Decimal("5"), Decimal("200")),
            ("Antibiotic Bolus", "Medicine", "pack", Decimal("30"), Decimal("5"), Decimal("180")),
            ("Syringe 10ml", "Equipment", "pcs", Decimal("100"), Decimal("20"), Decimal("15")),
            ("Berseem Seed", "Seed", "kg", Decimal("25"), Decimal("5"), Decimal("120")),
        ]
        for name, cat, unit, stock, min_stock, cost in feed_items:
            p = Product(
                organization_id=org.id,
                name=name,
                category=cat,
                unit=unit,
                current_stock=stock,
                min_stock_level=min_stock,
                unit_cost=cost,
                is_active=True
            )
            db.add(p)
        db.flush()

        # ─── FIELDS ──────────────────────────────────────
        field_data = [
            ("Field A - North", Decimal("2.0"), "Loamy"),
            ("Field B - South", Decimal("1.5"), "Clay Loam"),
            ("Field C - East", Decimal("1.5"), "Sandy Loam"),
        ]
        fields = []
        for name, area, soil in field_data:
            f = Field(
                organization_id=org.id,
                farm_id=farm.id,
                name=name,
                area_acres=area,
                soil_type=soil,
                is_active=True
            )
            db.add(f)
            fields.append(f)
        db.flush()

        # ─── CROP CYCLES ─────────────────────────────────
        crop_data = [
            (fields[0].id, "Berseem", "Local", date(2024, 10, 1), date(2024, 12, 15), CropStatus.HARVESTED, Decimal("3000"), Decimal("5000"), Decimal("2000")),
            (fields[1].id, "Maize", "Hybrid 123", date(2024, 6, 15), date(2024, 9, 30), CropStatus.HARVESTED, Decimal("4000"), Decimal("7000"), Decimal("3500")),
            (fields[2].id, "Berseem", "Local", date(2025, 1, 10), date(2025, 3, 31), CropStatus.GROWING, Decimal("2500"), None, Decimal("4500")),
        ]
        for field_id, crop, variety, sow, harvest, status, seed_cost, actual_yield, exp_yield in crop_data:
            c = CropCycle(
                organization_id=org.id,
                field_id=field_id,
                crop_name=crop,
                variety=variety,
                sowing_date=sow,
                expected_harvest_date=harvest,
                actual_harvest_date=harvest if status == CropStatus.HARVESTED else None,
                status=status,
                seed_cost=seed_cost,
                fertilizer_cost=Decimal("1500"),
                labor_cost=Decimal("2000"),
                expected_yield_kg=exp_yield,
                actual_yield_kg=actual_yield
            )
            db.add(c)
        db.flush()

        # ─── TASKS ────────────────────────────────────────
        manager_user = db.query(User).filter(User.role == UserRole.FARM_MANAGER, User.organization_id == org.id).first()
        owner_user2 = db.query(User).filter(User.role == UserRole.OWNER, User.organization_id == org.id).first()
        assigned_by = manager_user or owner_user2
        if assigned_by and employees:
            emp = employees[0]
            task_defs = [
                ("Morning Milk Collection", TaskCategory.MILKING, TaskPriority.HIGH, TaskStatus.PENDING, date.today(), None),
                ("Vaccinate B0001 Buffalo", TaskCategory.VACCINATION, TaskPriority.URGENT, TaskStatus.IN_PROGRESS, date.today(), None),
                ("Clean Goat Pens", TaskCategory.CLEANING, TaskPriority.MEDIUM, TaskStatus.PENDING, date.today() + timedelta(days=1), None),
                ("Replenish Feed Stock", TaskCategory.FEEDING, TaskPriority.HIGH, TaskStatus.PENDING, date.today(), None),
                ("Check Sick Animals", TaskCategory.HEALTH_CHECK, TaskPriority.URGENT, TaskStatus.PENDING, date.today(), None),
                ("Water Trough Maintenance", TaskCategory.MAINTENANCE, TaskPriority.LOW, TaskStatus.COMPLETED, date.today() - timedelta(days=1), date.today() - timedelta(days=1)),
                ("Evening Milk Collection", TaskCategory.MILKING, TaskPriority.HIGH, TaskStatus.COMPLETED, date.today() - timedelta(days=1), date.today() - timedelta(days=1)),
                ("Monthly Treatment Round", TaskCategory.TREATMENT, TaskPriority.MEDIUM, TaskStatus.PENDING, date.today() + timedelta(days=3), None),
                ("Hay Delivery Check", TaskCategory.FEEDING, TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, date.today(), None),
                ("Weigh All Animals", TaskCategory.OTHER, TaskPriority.LOW, TaskStatus.PENDING, date.today() + timedelta(days=7), None),
            ]
            for title, cat, pri, stat, due, comp in task_defs:
                from datetime import datetime
                t = Task(
                    organization_id=org.id,
                    title=title,
                    category=cat,
                    priority=pri,
                    status=stat,
                    assigned_to_id=emp.id,
                    assigned_by_id=assigned_by.id,
                    due_date=due,
                    completed_at=datetime.combine(comp, datetime.min.time()) if comp else None,
                )
                db.add(t)
            db.flush()

        # ─── NOTIFICATIONS ───────────────────────────────
        owner_user = db.query(User).filter(User.role == UserRole.OWNER, User.organization_id == org.id).first()
        if owner_user:
            notifs = [
                ("Vaccination Due", "B0001 buffalo vaccination is due in 5 days", "warning"),
                ("Low Stock Alert", "Mineral Mix stock is below minimum level", "warning"),
                ("Milk Record", "Today's milk production recorded: 67.5 liters", "info"),
                ("Welcome", "Welcome to FarmERP360! Your farm is set up and ready.", "success"),
            ]
            for title, msg, typ in notifs:
                n = Notification(
                    organization_id=org.id,
                    user_id=owner_user.id,
                    title=title,
                    message=msg,
                    type=typ,
                    is_read=False
                )
                db.add(n)

        db.commit()
        print("✅ Seed complete! Demo data loaded.")
        print("\n📋 LOGIN CREDENTIALS:")
        print("─" * 50)
        print(f"  Super Admin : admin@farmerp360.com / Admin123!@#")
        print(f"  Owner       : owner@farmerp360.com / Owner123!@#")
        print(f"  Accountant  : accountant@farmerp360.com / Acc123!@#")
        print(f"  Farm Mgr    : manager@farmerp360.com / Mgr123!@#")
        print(f"  Vet Manager : vet@farmerp360.com / Vet123!@#")
        print(f"  Employee    : employee@farmerp360.com / Emp123!@#")
        print(f"  Investor    : investor1@farmerp360.com / Inv123!@#")
        print(f"  Customer    : customer1@farmerp360.com / Cust123!@#")
        print("─" * 50)
        print(f"\n  Animals: 5 Goats + 4 Buffaloes seeded")
        print(f"  Milk: 30 days of production data")
        print(f"  Investors: 3 (33.33% each)")
        print(f"  Fields: 3 agricultural fields")
        print(f"  Inventory: 8 feed/medicine items")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
