from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import Base, engine
import os

# Import all models to register them
from app.models import models  # noqa

# Import routers
from app.api.v1.endpoints import auth, users, animals, health, dairy, inventory, agriculture, employees, business, dashboard, accounting, pallai, investors, analytics, feed, tasks, forecasting, admin

app = FastAPI(
    title="FarmERP360 API",
    description="Enterprise Livestock ERP Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include all routers
PREFIX = "/api/v1"

app.include_router(auth.router, prefix=PREFIX)
app.include_router(users.router, prefix=PREFIX)
app.include_router(animals.router, prefix=PREFIX)
app.include_router(health.router, prefix=PREFIX)
app.include_router(dairy.router, prefix=PREFIX)
app.include_router(inventory.router, prefix=PREFIX)
app.include_router(agriculture.router, prefix=PREFIX)
app.include_router(employees.router, prefix=PREFIX)
app.include_router(investors.router, prefix=PREFIX)
app.include_router(business.router, prefix=PREFIX)
app.include_router(dashboard.router, prefix=PREFIX)
app.include_router(accounting.router, prefix=PREFIX)
app.include_router(pallai.router, prefix=PREFIX)
app.include_router(analytics.router, prefix=PREFIX)
app.include_router(feed.router, prefix=PREFIX)
app.include_router(tasks.router, prefix=PREFIX)
app.include_router(forecasting.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)


@app.get("/")
def root():
    return {
        "app": "FarmERP360",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
