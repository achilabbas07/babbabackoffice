import re
import uuid
from collections import defaultdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from core import User, db, now_iso, require_roles

router = APIRouter(prefix="/api")
ANY = require_roles("admin", "kasir", "waiter")


def product_num(product_id) -> int:
    digits = re.sub(r"\D", "", str(product_id or ""))
    return int(digits) if digits else -1


def product_keys(product_id: str) -> list:
    n = product_num(product_id)
    return list({product_id, str(n), f"{n:03d}", f"PRD-{n:03d}"}) if n >= 0 else [product_id]


@router.get("/menu-variants")
async def list_menu_variants(product_id: str, _: User = Depends(ANY)):
    rows = await db.menu_variants.find({"product_id": {"$in": product_keys(product_id)}}).sort("_id", 1).to_list(None)
    by_variant = defaultdict(list)
    if rows:
        async for r in db.variant_ingredients.find({"variant_id": {"$in": [r["_id"] for r in rows]}}):
            by_variant[r["variant_id"]].append(r)
    mids = list({r["material_id"] for lst in by_variant.values() for r in lst})
    mats = {m["_id"]: float(m["stock"] or 0) async for m in db.raw_materials.find({"_id": {"$in": mids}})} if mids else {}
    out = []
    for r in rows:
        caps = [int(mats.get(i["material_id"], 0) // float(i["qty_needed"])) for i in by_variant[r["_id"]] if float(i["qty_needed"] or 0) > 0]
        out.append({"id": r["_id"], "product_id": r["product_id"], "variant_name": r["variant_name"],
                    "additional_price": r.get("additional_price") or 0,
                    "available": max(0, min(caps)) if caps else None})
    return out


async def load_variants(ids: List[int]) -> dict:
    if not ids:
        return {}
    return {r["_id"]: r async for r in db.menu_variants.find({"_id": {"$in": ids}})}


def variant_qty(items: List[dict]) -> dict:
    out = defaultdict(int)
    for it in items:
        if it.get("variantId") is not None:
            out[it["variantId"]] += it["qty"]
    return out


async def check_materials(items: List[dict]):
    vq = variant_qty(items)
    if not vq:
        return
    needs = defaultdict(float)
    async for r in db.variant_ingredients.find({"variant_id": {"$in": list(vq)}}):
        needs[r["material_id"]] += float(r["qty_needed"]) * vq[r["variant_id"]]
    if not needs:
        return
    mats = {m["_id"]: m async for m in db.raw_materials.find({"_id": {"$in": list(needs)}})}
    for mid, qty in needs.items():
        m = mats.get(mid)
        if not m:
            raise HTTPException(400, f"Bahan baku #{mid} tidak ditemukan di raw_materials")
        stock = float(m["stock"] or 0)
        if stock + 1e-9 < qty:
            label = "habis" if stock <= 0 else "tidak cukup"
            raise HTTPException(400, f"Stok bahan baku {m['material_name']} {label} (butuh {qty:g}, tersedia {stock:g})")


async def log_variant_sales(items: List[dict], ref: str, waiter_id, waiter_name: str):
    ts = now_iso()
    docs = [{"_id": str(uuid.uuid4()), "timestamp": ts, "waiterId": waiter_id, "waiterName": waiter_name or "",
             "productId": it["productId"], "productName": f"{it['productName']} {it.get('variantName') or ''}".strip(),
             "qty": it["qty"], "source": "variant_sale", "refId": ref, "shiftId": None, "variant_id": it["variantId"]}
            for it in items if it.get("variantId") is not None and it["qty"] > 0]
    if docs:
        await db.order_logs.insert_many(docs)
