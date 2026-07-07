import io
import hashlib
import hmac
import json
import smtplib
import ssl
import time
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List

import httpx
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.models import (
    AuditLog, User, SystemSettings, Animal, Invoice, InvoiceStatus,
    Vaccination, FeedType, FeedStockTransaction, UserRole, AnimalBreed, AnimalSpecies,
    PallaiCustomer, PallaiSubscription,
)
from sqlalchemy import or_

router = APIRouter(tags=["admin"])

ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.OWNER]


def _org(user: User) -> str:
    return str(user.organization_id)


def _get_setting(db: Session, org_id: str, key: str) -> Optional[str]:
    row = db.query(SystemSettings).filter_by(organization_id=org_id, key=key).first()
    return row.value if row else None


def _upsert_setting(db: Session, org_id: str, category: str, key: str,
                    value: str, sensitive: bool, user_id: str):
    row = db.query(SystemSettings).filter_by(organization_id=org_id, key=key).first()
    if row:
        row.value = value
        row.updated_at = datetime.utcnow()
        row.updated_by_id = user_id
    else:
        row = SystemSettings(
            organization_id=org_id, category=category, key=key,
            value=value, is_sensitive=sensitive, updated_by_id=user_id
        )
        db.add(row)


# ──────────────────────────────────────────────────────────────
# SYSTEM SETTINGS
# ──────────────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    # organization
    "org_name": ("organization", "", False),
    "org_address": ("organization", "", False),
    "org_phone": ("organization", "", False),
    "org_email": ("organization", "", False),
    "org_registration_no": ("organization", "", False),
    "org_ntn": ("organization", "", False),
    # preferences
    "milk_price_per_liter": ("preferences", "120", False),
    "currency": ("preferences", "PKR", False),
    "fiscal_year_start_month": ("preferences", "7", False),
    "low_stock_alert_days": ("preferences", "7", False),
    "low_inventory_threshold": ("preferences", "10", False),
    "date_format": ("preferences", "DD/MM/YYYY", False),
    # integrations — whatsapp
    "whatsapp_enabled": ("integrations", "false", False),
    "whatsapp_phone_number_id": ("integrations", "", True),
    "whatsapp_access_token": ("integrations", "", True),
    "whatsapp_business_account_id": ("integrations", "", True),
    # integrations — easypaisa
    "easypaisa_enabled": ("integrations", "false", False),
    "easypaisa_store_id": ("integrations", "", True),
    "easypaisa_hash_key": ("integrations", "", True),
    "easypaisa_account_num": ("integrations", "", True),
    # integrations — jazzcash
    "jazzcash_enabled": ("integrations", "false", False),
    "jazzcash_merchant_id": ("integrations", "", True),
    "jazzcash_password": ("integrations", "", True),
    "jazzcash_integrity_salt": ("integrations", "", True),
    # integrations — smtp (simple auth)
    "smtp_enabled": ("integrations", "false", False),
    "smtp_host": ("integrations", "", False),
    "smtp_port": ("integrations", "587", False),
    "smtp_username": ("integrations", "", False),
    "smtp_password": ("integrations", "", True),
    "smtp_from_email": ("integrations", "", False),
    "smtp_from_name": ("integrations", "FarmERP360", False),
    "smtp_use_tls": ("integrations", "true", False),
    # integrations — smtp (oauth2 / microsoft 365)
    "smtp_oauth_enabled": ("integrations", "false", False),
    "smtp_oauth_client_id": ("integrations", "", True),
    "smtp_oauth_client_secret": ("integrations", "", True),
    "smtp_oauth_tenant_id": ("integrations", "", False),
    "smtp_oauth_refresh_token": ("integrations", "", True),
    "smtp_oauth_from_email": ("integrations", "", False),
}


@router.get("/admin/settings")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"]))
):
    org_id = _org(current_user)
    rows = db.query(SystemSettings).filter_by(organization_id=org_id).all()
    stored = {r.key: r for r in rows}

    result = {}
    for key, (category, default, sensitive) in DEFAULT_SETTINGS.items():
        if key in stored:
            val = "••••••••" if stored[key].is_sensitive and stored[key].value else stored[key].value
            result[key] = {"category": category, "value": val, "is_sensitive": sensitive}
        else:
            result[key] = {"category": category, "value": default, "is_sensitive": sensitive}

    return {"success": True, "data": result}


@router.put("/admin/settings")
def update_settings(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"]))
):
    org_id = _org(current_user)
    user_id = str(current_user.id)
    updated = []

    for key, value in payload.items():
        if key not in DEFAULT_SETTINGS:
            continue
        category, _, sensitive = DEFAULT_SETTINGS[key]
        # Don't overwrite sensitive values if client sends the masked placeholder
        if sensitive and value == "••••••••":
            continue
        _upsert_setting(db, org_id, category, key, str(value), sensitive, user_id)
        updated.append(key)

    db.commit()
    return {"success": True, "data": {"updated": updated}}


# ──────────────────────────────────────────────────────────────
# AUDIT LOGS
# ──────────────────────────────────────────────────────────────

@router.get("/admin/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, le=200),
    module: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"]))
):
    org_id = _org(current_user)
    q = db.query(AuditLog, User).outerjoin(
        User, AuditLog.user_id == User.id
    ).filter(AuditLog.organization_id == org_id)

    if module:
        q = q.filter(AuditLog.module == module)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if date_from:
        q = q.filter(AuditLog.created_at >= date_from)
    if date_to:
        q = q.filter(AuditLog.created_at <= date_to + " 23:59:59")

    total = q.count()
    rows = q.order_by(desc(AuditLog.created_at)).offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for log, user in rows:
        items.append({
            "id": log.id,
            "action": log.action,
            "module": log.module,
            "record_id": log.record_id,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_name": user.full_name if user else "System",
            "user_role": user.role.value if user else None,
            "ip_address": log.ip_address,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    modules = [r[0] for r in db.query(AuditLog.module).filter(
        AuditLog.organization_id == org_id
    ).distinct().all() if r[0]]

    return {"success": True, "data": {"total": total, "page": page, "per_page": per_page,
                                      "items": items, "modules": modules}}


# ──────────────────────────────────────────────────────────────
# QR CODES
# ──────────────────────────────────────────────────────────────

@router.get("/animals/{animal_id}/qrcode")
def get_animal_qrcode(
    animal_id: str,
    base_url: str = Query("http://localhost:3000"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    animal = db.query(Animal).filter(
        Animal.id == animal_id,
        Animal.organization_id == _org(current_user)
    ).first()
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")

    label = animal.ear_tag or animal.animal_code or animal_id
    qr_data = f"{base_url}/animals/{animal_id}"

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1B4332", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="animal_{label}_qr.png"'}
    )


# ──────────────────────────────────────────────────────────────
# WHATSAPP NOTIFICATIONS
# ──────────────────────────────────────────────────────────────

async def _send_whatsapp(phone_number_id: str, token: str, to: str, message: str) -> dict:
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message}
    }
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(url, json=payload, headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        return r.json()


@router.post("/admin/notifications/whatsapp/test")
async def test_whatsapp(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"]))
):
    org_id = _org(current_user)
    phone_number_id = _get_setting(db, org_id, "whatsapp_phone_number_id")
    token = _get_setting(db, org_id, "whatsapp_access_token")

    if not phone_number_id or not token:
        raise HTTPException(400, "WhatsApp credentials not configured. Set them in Admin → Integrations.")

    to = payload.get("to", "").strip()
    if not to:
        raise HTTPException(400, "Recipient phone number required (international format, e.g. 923001234567)")

    message = payload.get("message", "FarmERP360: Test notification from your farm management system.")

    try:
        result = await _send_whatsapp(phone_number_id, token, to, message)
        if "error" in result:
            raise HTTPException(400, f"WhatsApp API error: {result['error'].get('message', str(result))}")
        return {"success": True, "data": {"message_id": result.get("messages", [{}])[0].get("id"), "status": "sent"}}
    except httpx.RequestError as e:
        raise HTTPException(503, f"Could not reach WhatsApp API: {str(e)}")


@router.get("/admin/notifications/alerts/preview")
def preview_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"]))
):
    org_id = _org(current_user)
    today = datetime.utcnow().date()
    threshold_days = int(_get_setting(db, org_id, "low_stock_alert_days") or "7")

    # Overdue vaccinations
    overdue_vax = db.query(Vaccination).filter(
        Vaccination.organization_id == org_id,
        Vaccination.next_due_date < today
    ).count()

    # Overdue invoices
    overdue_inv = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatus.OVERDUE
    ).count()

    # Low feed stock (simplistic: any feed type with stock < threshold * daily_consumption)
    low_feed = db.query(FeedType).filter(
        FeedType.organization_id == org_id,
        FeedType.current_stock_kg <= FeedType.min_stock_kg
    ).count()

    alerts = []
    if overdue_vax:
        alerts.append({"type": "vaccination", "count": overdue_vax,
                        "message": f"⚠️ {overdue_vax} vaccination(s) are overdue"})
    if overdue_inv:
        alerts.append({"type": "invoice", "count": overdue_inv,
                        "message": f"💰 {overdue_inv} invoice(s) are overdue for payment"})
    if low_feed:
        alerts.append({"type": "feed", "count": low_feed,
                        "message": f"🌿 {low_feed} feed type(s) are below minimum stock level"})

    return {"success": True, "data": {"alerts": alerts, "total": len(alerts)}}


@router.post("/admin/notifications/alerts/send")
async def send_alerts(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"]))
):
    org_id = _org(current_user)
    phone_number_id = _get_setting(db, org_id, "whatsapp_phone_number_id")
    token = _get_setting(db, org_id, "whatsapp_access_token")
    enabled = _get_setting(db, org_id, "whatsapp_enabled") == "true"

    if not enabled or not phone_number_id or not token:
        raise HTTPException(400, "WhatsApp is not enabled or credentials missing.")

    recipients = payload.get("recipients", [])
    if not recipients:
        raise HTTPException(400, "At least one recipient phone number required.")

    # Build alert message
    today = datetime.utcnow().date()
    overdue_vax = db.query(Vaccination).filter(
        Vaccination.organization_id == org_id,
        Vaccination.next_due_date < today
    ).count()
    overdue_inv = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatus.OVERDUE
    ).count()
    low_feed = db.query(FeedType).filter(
        FeedType.organization_id == org_id,
        FeedType.current_stock_kg <= FeedType.min_stock_kg
    ).count()

    lines = ["📋 *FarmERP360 Daily Alert*\n"]
    if overdue_vax:
        lines.append(f"⚠️ {overdue_vax} overdue vaccination(s)")
    if overdue_inv:
        lines.append(f"💰 {overdue_inv} overdue invoice(s)")
    if low_feed:
        lines.append(f"🌿 {low_feed} feed type(s) below minimum stock")
    if not (overdue_vax or overdue_inv or low_feed):
        lines.append("✅ All clear — no alerts today!")

    message = "\n".join(lines)
    sent, failed = 0, 0

    for phone in recipients:
        try:
            result = await _send_whatsapp(phone_number_id, token, phone.strip(), message)
            if "error" in result:
                failed += 1
            else:
                sent += 1
        except Exception:
            failed += 1

    return {"success": True, "data": {"sent": sent, "failed": failed, "message_preview": message}}


# ──────────────────────────────────────────────────────────────
# EMAIL (SMTP + OAUTH2)
# ──────────────────────────────────────────────────────────────

def _send_email_smtp(
    host: str, port: int, username: str, password: str,
    from_email: str, from_name: str, use_tls: bool,
    to_email: str, subject: str, body_html: str,
) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{from_email}>" if from_name else from_email
    msg["To"] = to_email
    msg.attach(MIMEText(body_html, "html", "utf-8"))
    ctx = ssl.create_default_context()
    if use_tls:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls(context=ctx)
            server.login(username, password)
            server.sendmail(from_email, to_email, msg.as_string())
    else:
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=15) as server:
            server.login(username, password)
            server.sendmail(from_email, to_email, msg.as_string())


async def _send_email_oauth2(
    client_id: str, client_secret: str, tenant_id: str, refresh_token: str,
    from_email: str, to_email: str, subject: str, body_html: str,
) -> None:
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(token_url, data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": "https://graph.microsoft.com/.default",
        })
        resp.raise_for_status()
        access_token = resp.json()["access_token"]

        graph_url = f"https://graph.microsoft.com/v1.0/users/{from_email}/sendMail"
        payload = {
            "message": {
                "subject": subject,
                "body": {"contentType": "HTML", "content": body_html},
                "toRecipients": [{"emailAddress": {"address": to_email}}],
            }
        }
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        r = await client.post(graph_url, json=payload, headers=headers)
        r.raise_for_status()


@router.post("/admin/notifications/email/test")
async def test_email(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"])),
):
    org_id = _org(current_user)
    to_email = payload.get("to", "").strip()
    if not to_email:
        raise HTTPException(400, "Recipient email required")

    smtp_enabled = _get_setting(db, org_id, "smtp_enabled") == "true"
    oauth_enabled = _get_setting(db, org_id, "smtp_oauth_enabled") == "true"

    if not smtp_enabled and not oauth_enabled:
        raise HTTPException(400, "No email method enabled. Enable SMTP or OAuth2 in Admin → Integrations.")

    subject = "FarmERP360 — Test Email"
    body = "<h2>Test Email</h2><p>This test email was sent from your FarmERP360 system.</p>"

    try:
        if oauth_enabled:
            await _send_email_oauth2(
                _get_setting(db, org_id, "smtp_oauth_client_id") or "",
                _get_setting(db, org_id, "smtp_oauth_client_secret") or "",
                _get_setting(db, org_id, "smtp_oauth_tenant_id") or "",
                _get_setting(db, org_id, "smtp_oauth_refresh_token") or "",
                _get_setting(db, org_id, "smtp_oauth_from_email") or "",
                to_email, subject, body,
            )
        else:
            _send_email_smtp(
                _get_setting(db, org_id, "smtp_host") or "",
                int(_get_setting(db, org_id, "smtp_port") or "587"),
                _get_setting(db, org_id, "smtp_username") or "",
                _get_setting(db, org_id, "smtp_password") or "",
                _get_setting(db, org_id, "smtp_from_email") or "",
                _get_setting(db, org_id, "smtp_from_name") or "FarmERP360",
                _get_setting(db, org_id, "smtp_use_tls") != "false",
                to_email, subject, body,
            )
        return {"success": True, "data": {"status": "sent", "to": to_email}}
    except Exception as e:
        raise HTTPException(500, f"Email send failed: {str(e)}")


@router.post("/admin/notifications/email/alerts")
async def send_email_alerts(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"])),
):
    org_id = _org(current_user)
    emails: list = payload.get("emails", [])
    if not emails:
        raise HTTPException(400, "At least one recipient email required.")

    smtp_enabled = _get_setting(db, org_id, "smtp_enabled") == "true"
    oauth_enabled = _get_setting(db, org_id, "smtp_oauth_enabled") == "true"
    if not smtp_enabled and not oauth_enabled:
        raise HTTPException(400, "No email method enabled. Enable SMTP or OAuth2 in Admin → Integrations.")

    org_name = _get_setting(db, org_id, "org_name") or "FarmERP360"
    today = datetime.utcnow().date()
    threshold_days = int(_get_setting(db, org_id, "low_stock_alert_days") or "7")

    overdue_vax = db.query(Vaccination).filter(
        Vaccination.organization_id == org_id,
        Vaccination.next_due_date < today,
    ).count()
    overdue_inv = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatus.OVERDUE,
    ).count()
    low_feed = db.query(FeedType).filter(
        FeedType.organization_id == org_id,
        FeedType.current_stock_kg <= FeedType.min_stock_kg,
    ).count()

    alert_rows = ""
    if overdue_vax:
        alert_rows += f"<tr><td style='padding:6px 10px'>⚠️ Overdue Vaccinations</td><td style='padding:6px 10px;font-weight:bold;color:#dc2626'>{overdue_vax}</td></tr>"
    if overdue_inv:
        alert_rows += f"<tr><td style='padding:6px 10px'>💰 Overdue Invoices</td><td style='padding:6px 10px;font-weight:bold;color:#dc2626'>{overdue_inv}</td></tr>"
    if low_feed:
        alert_rows += f"<tr><td style='padding:6px 10px'>🌿 Low Feed Stock</td><td style='padding:6px 10px;font-weight:bold;color:#d97706'>{low_feed}</td></tr>"

    if not alert_rows:
        alert_rows = "<tr><td colspan='2' style='padding:6px 10px;color:#16a34a'>✅ No pending alerts — all clear!</td></tr>"

    html = (
        f"<div style='font-family:sans-serif;max-width:600px'>"
        f"<h2 style='color:#1B4332'>Farm Alert Summary — {org_name}</h2>"
        f"<p style='color:#4b5563'>Generated on {today}</p>"
        f"<table border='1' cellpadding='0' cellspacing='0' style='border-collapse:collapse;width:100%;border-color:#e5e7eb'>"
        f"<thead><tr style='background:#f3f4f6'>"
        f"<th style='padding:8px 10px;text-align:left'>Alert</th>"
        f"<th style='padding:8px 10px;text-align:left'>Count</th>"
        f"</tr></thead><tbody>{alert_rows}</tbody></table>"
        f"<p style='margin-top:16px;color:#6b7280;font-size:12px'>Sent by FarmERP360 — {org_name}</p>"
        f"</div>"
    )
    subject = f"Farm Alert Summary — {org_name} ({today})"

    sent, failed, errors = 0, 0, []
    for email in emails:
        try:
            if oauth_enabled:
                await _send_email_oauth2(
                    _get_setting(db, org_id, "smtp_oauth_client_id") or "",
                    _get_setting(db, org_id, "smtp_oauth_client_secret") or "",
                    _get_setting(db, org_id, "smtp_oauth_tenant_id") or "",
                    _get_setting(db, org_id, "smtp_oauth_refresh_token") or "",
                    _get_setting(db, org_id, "smtp_oauth_from_email") or "",
                    email, subject, html,
                )
            else:
                _send_email_smtp(
                    _get_setting(db, org_id, "smtp_host") or "",
                    int(_get_setting(db, org_id, "smtp_port") or "587"),
                    _get_setting(db, org_id, "smtp_username") or "",
                    _get_setting(db, org_id, "smtp_password") or "",
                    _get_setting(db, org_id, "smtp_from_email") or "",
                    _get_setting(db, org_id, "smtp_from_name") or "FarmERP360",
                    _get_setting(db, org_id, "smtp_use_tls") != "false",
                    email, subject, html,
                )
            sent += 1
        except Exception as e:
            failed += 1
            errors.append(f"{email}: {str(e)}")

    return {"success": True, "data": {"sent": sent, "failed": failed, "errors": errors}}


@router.post("/admin/pallai/billing/send")
async def send_pallai_billing_notifications(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner", "accountant"])),
):
    """
    Send Pallai invoices to customers via WhatsApp and/or Email.
    payload: { billing_month: 'YYYY-MM', channels: ['whatsapp','email'], invoice_ids: optional }
    """
    from datetime import date as date_type
    import calendar as cal_mod

    org_id = _org(current_user)
    billing_month = payload.get("billing_month", "")
    channels = payload.get("channels", ["whatsapp", "email"])
    invoice_ids = payload.get("invoice_ids")

    q = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.subscription_id.isnot(None),
    )
    if billing_month:
        try:
            year, month = billing_month.split("-")
            first_day = date_type(int(year), int(month), 1)
            q = q.filter(Invoice.issue_date == first_day)
        except (ValueError, AttributeError):
            raise HTTPException(422, "billing_month must be YYYY-MM")
    if invoice_ids:
        q = q.filter(Invoice.id.in_(invoice_ids))
    invoices = q.all()
    if not invoices:
        raise HTTPException(404, "No invoices found for the specified criteria")

    wa_enabled = _get_setting(db, org_id, "whatsapp_enabled") == "true"
    wa_pid = _get_setting(db, org_id, "whatsapp_phone_number_id") or ""
    wa_token = _get_setting(db, org_id, "whatsapp_access_token") or ""

    smtp_enabled = _get_setting(db, org_id, "smtp_enabled") == "true"
    oauth_enabled = _get_setting(db, org_id, "smtp_oauth_enabled") == "true"
    smtp_host = _get_setting(db, org_id, "smtp_host") or ""
    smtp_port = int(_get_setting(db, org_id, "smtp_port") or "587")
    smtp_user = _get_setting(db, org_id, "smtp_username") or ""
    smtp_pass = _get_setting(db, org_id, "smtp_password") or ""
    smtp_from = _get_setting(db, org_id, "smtp_from_email") or ""
    smtp_name = _get_setting(db, org_id, "smtp_from_name") or "FarmERP360"
    smtp_tls = _get_setting(db, org_id, "smtp_use_tls") != "false"
    oauth_cid = _get_setting(db, org_id, "smtp_oauth_client_id") or ""
    oauth_sec = _get_setting(db, org_id, "smtp_oauth_client_secret") or ""
    oauth_tid = _get_setting(db, org_id, "smtp_oauth_tenant_id") or ""
    oauth_ref = _get_setting(db, org_id, "smtp_oauth_refresh_token") or ""
    oauth_frm = _get_setting(db, org_id, "smtp_oauth_from_email") or ""
    org_name = _get_setting(db, org_id, "org_name") or "FarmERP360"

    results = {"whatsapp_sent": 0, "whatsapp_failed": 0, "email_sent": 0, "email_failed": 0, "errors": []}

    for inv in invoices:
        customer = db.query(PallaiCustomer).filter(PallaiCustomer.id == inv.customer_id).first()
        if not customer:
            continue

        inv_text = (
            f"Dear {customer.full_name},\n\n"
            f"Your invoice {inv.invoice_number} for PKR {float(inv.total_amount or 0):,.0f} "
            f"is due on {inv.due_date}.\n\nPlease contact us for payment.\n\n— {org_name}"
        )
        inv_html = (
            f"<p>Dear <strong>{customer.full_name}</strong>,</p>"
            f"<p>Please find your invoice details below:</p>"
            f"<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;font-family:sans-serif'>"
            f"<tr><td><b>Invoice #</b></td><td>{inv.invoice_number}</td></tr>"
            f"<tr><td><b>Amount</b></td><td>PKR {float(inv.total_amount or 0):,.2f}</td></tr>"
            f"<tr><td><b>Due Date</b></td><td>{inv.due_date}</td></tr>"
            f"<tr><td><b>Status</b></td><td>{inv.status.value if inv.status else 'draft'}</td></tr>"
            f"</table>"
            f"<p>Please contact us for payment details.</p>"
            f"<p>— <em>{org_name}</em></p>"
        )

        if "whatsapp" in channels and wa_enabled and wa_pid and wa_token and customer.phone:
            try:
                result = await _send_whatsapp(wa_pid, wa_token, customer.phone.strip(), inv_text)
                if "error" in result:
                    results["whatsapp_failed"] += 1
                    results["errors"].append(f"WA {customer.phone}: {result['error'].get('message','error')}")
                else:
                    results["whatsapp_sent"] += 1
            except Exception as e:
                results["whatsapp_failed"] += 1
                results["errors"].append(f"WA {customer.phone}: {str(e)}")

        if "email" in channels and customer.email:
            try:
                subj = f"Invoice {inv.invoice_number} — {org_name}"
                if oauth_enabled and oauth_cid and oauth_ref:
                    await _send_email_oauth2(oauth_cid, oauth_sec, oauth_tid, oauth_ref, oauth_frm, customer.email, subj, inv_html)
                elif smtp_enabled and smtp_host and smtp_from:
                    _send_email_smtp(smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_name, smtp_tls, customer.email, subj, inv_html)
                else:
                    results["email_failed"] += 1
                    results["errors"].append(f"Email to {customer.email}: no email method configured")
                    continue
                results["email_sent"] += 1
            except Exception as e:
                results["email_failed"] += 1
                results["errors"].append(f"Email {customer.email}: {str(e)}")

    total = results["whatsapp_sent"] + results["email_sent"]
    return {"success": True, "data": {**results, "total_sent": total, "invoices_processed": len(invoices)}}


# ──────────────────────────────────────────────────────────────
# PAYMENT GATEWAYS
# ──────────────────────────────────────────────────────────────

@router.get("/admin/payments/invoice/{invoice_id}")
def get_payment_options(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner", "accountant"]))
):
    org_id = _org(current_user)
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.organization_id == org_id
    ).first()
    if not invoice:
        raise HTTPException(404, "Invoice not found")

    easypaisa_enabled = _get_setting(db, org_id, "easypaisa_enabled") == "true"
    jazzcash_enabled = _get_setting(db, org_id, "jazzcash_enabled") == "true"

    gateways = []

    if easypaisa_enabled:
        store_id = _get_setting(db, org_id, "easypaisa_store_id") or ""
        hash_key = _get_setting(db, org_id, "easypaisa_hash_key") or ""
        account_num = _get_setting(db, org_id, "easypaisa_account_num") or ""
        amount_pkr = str(int(float(invoice.total_amount) * 100))  # in paisas
        order_ref = f"INV-{invoice.invoice_number or invoice_id[:8]}"
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        post_data = f"{store_id}{account_num}{amount_pkr}{order_ref}{timestamp}"
        signature = hmac.new(hash_key.encode(), post_data.encode(), hashlib.sha256).hexdigest() if hash_key else ""
        gateways.append({
            "provider": "easypaisa",
            "label": "Easypaisa",
            "logo": "https://www.easypaisa.com.pk/favicon.ico",
            "payment_url": "https://easypaisa.com.pk/easypay/index.jsf",
            "params": {
                "storeId": store_id,
                "amount": amount_pkr,
                "postBackURL": f"/api/v1/webhooks/easypaisa",
                "orderRefNum": order_ref,
                "autoRedirect": "0",
                "expiryDate": (datetime.utcnow() + timedelta(days=3)).strftime("%Y%m%d %H%M%S"),
                "storeHashRequest": signature,
                "signature": signature,
            }
        })

    if jazzcash_enabled:
        merchant_id = _get_setting(db, org_id, "jazzcash_merchant_id") or ""
        password = _get_setting(db, org_id, "jazzcash_password") or ""
        integrity_salt = _get_setting(db, org_id, "jazzcash_integrity_salt") or ""
        amount_pkr = str(int(float(invoice.total_amount) * 100))
        order_ref = f"T{int(time.time())}"
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        expire = (datetime.utcnow() + timedelta(hours=1)).strftime("%Y%m%d%H%M%S")
        hash_str = f"{integrity_salt}&{amount_pkr}&PKR&{expire}&{merchant_id}&{order_ref}&{password}&{timestamp}&MWALLET"
        jc_hash = hashlib.sha256(hash_str.encode()).hexdigest() if integrity_salt else ""
        gateways.append({
            "provider": "jazzcash",
            "label": "JazzCash",
            "logo": "https://www.jazzcash.com.pk/customer/favicon.ico",
            "payment_url": "https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction",
            "params": {
                "pp_Version": "2.0",
                "pp_TxnType": "MWALLET",
                "pp_Language": "EN",
                "pp_MerchantID": merchant_id,
                "pp_Password": password,
                "pp_TxnRefNo": order_ref,
                "pp_Amount": amount_pkr,
                "pp_TxnCurrency": "PKR",
                "pp_TxnDateTime": timestamp,
                "pp_BillReference": f"INV-{invoice.invoice_number or invoice_id[:8]}",
                "pp_Description": f"Invoice Payment",
                "pp_TxnExpiryDateTime": expire,
                "pp_SecureHash": jc_hash,
            }
        })

    return {"success": True, "data": {
        "invoice_id": invoice_id,
        "invoice_number": invoice.invoice_number,
        "amount": str(invoice.total_amount),
        "currency": "PKR",
        "gateways": gateways
    }}


@router.post("/webhooks/easypaisa")
def easypaisa_webhook(payload: dict, db: Session = Depends(get_db)):
    # Easypaisa calls this URL after payment
    order_ref = payload.get("orderRefNum", "")
    status = payload.get("responseCode", "")
    if status == "0000" and order_ref:
        invoice_num = order_ref.replace("INV-", "")
        inv = db.query(Invoice).filter(Invoice.invoice_number == invoice_num).first()
        if inv and inv.status != InvoiceStatus.PAID:
            inv.status = InvoiceStatus.PAID
            db.commit()
    return {"success": True}


@router.post("/webhooks/jazzcash")
def jazzcash_webhook(payload: dict, db: Session = Depends(get_db)):
    # JazzCash calls this URL after payment
    response_code = payload.get("pp_ResponseCode", "")
    bill_ref = payload.get("pp_BillReference", "")
    if response_code == "000" and bill_ref:
        invoice_num = bill_ref.replace("INV-", "")
        inv = db.query(Invoice).filter(Invoice.invoice_number == invoice_num).first()
        if inv and inv.status != InvoiceStatus.PAID:
            inv.status = InvoiceStatus.PAID
            db.commit()
    return {"success": True}


# ─────────────────────────────────────────────
# ANIMAL BREEDS
# ─────────────────────────────────────────────

@router.get("/admin/animal-breeds")
def list_breeds(
    species: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(AnimalBreed).filter(
        AnimalBreed.organization_id == _org(current_user),
        AnimalBreed.is_active == True,
    )
    if species:
        q = q.filter(
            or_(AnimalBreed.species == species, AnimalBreed.species == None)
        )
    breeds = q.order_by(AnimalBreed.name).all()
    return {
        "success": True,
        "data": [
            {"id": b.id, "name": b.name, "species": b.species, "description": b.description}
            for b in breeds
        ],
    }


@router.post("/admin/animal-breeds")
def create_breed(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"])),
):
    breed = AnimalBreed(
        organization_id=_org(current_user),
        name=payload["name"],
        species=payload.get("species") or None,
        description=payload.get("description"),
    )
    db.add(breed)
    db.commit()
    db.refresh(breed)
    return {"success": True, "data": {"id": breed.id, "name": breed.name, "species": breed.species, "description": breed.description}}


@router.put("/admin/animal-breeds/{breed_id}")
def update_breed(
    breed_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"])),
):
    breed = db.query(AnimalBreed).filter(
        AnimalBreed.id == breed_id,
        AnimalBreed.organization_id == _org(current_user),
    ).first()
    if not breed:
        raise HTTPException(404, "Breed not found")
    for k in ("name", "species", "description"):
        if k in payload:
            setattr(breed, k, payload[k] or None if k == "species" else payload[k])
    db.commit()
    return {"success": True}


@router.delete("/admin/animal-breeds/{breed_id}")
def delete_breed(
    breed_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["super_admin", "owner"])),
):
    breed = db.query(AnimalBreed).filter(
        AnimalBreed.id == breed_id,
        AnimalBreed.organization_id == _org(current_user),
    ).first()
    if not breed:
        raise HTTPException(404, "Breed not found")
    breed.is_active = False
    db.commit()
    return {"success": True}
