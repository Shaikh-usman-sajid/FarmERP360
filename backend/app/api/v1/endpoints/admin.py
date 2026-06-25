import io
import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta
from typing import Optional

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
    Vaccination, FeedType, FeedStockTransaction, UserRole, AnimalBreed, AnimalSpecies
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
