import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, auth, dashboard, leads, notifications, pipeline, reminders, reports, representatives, sap, warehouses, website, whatsapp
from app.config import get_settings
from app.db import init_db
from app.workers.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if settings.enable_scheduler:
        start_scheduler()
    yield
    if settings.enable_scheduler:
        stop_scheduler()


app = FastAPI(title="Enterprise Lead Management Platform", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(whatsapp.router)
app.include_router(website.router)
app.include_router(leads.router)
app.include_router(representatives.router)
app.include_router(notifications.router)
app.include_router(reminders.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(pipeline.router)
app.include_router(admin.router)
app.include_router(sap.router)
app.include_router(warehouses.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "claude_configured": settings.use_real_claude,
        "whatsapp_configured": settings.use_real_whatsapp,
        "sap_mode": settings.sap_mode_normalized,
        "sap_configured": settings.use_real_sap,
        "quip_configured": settings.use_real_quip,
    }
