import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from core import User, db, require_roles

router = APIRouter(prefix="/api")
ANY = require_roles("admin", "kasir", "waiter")


def product_num(product_id: str) -> int:
    digits = re.sub(r"\D", "", product_id or "")
    return int(digits) if digits else -1


@router.get("/menu-variants")
async def list_menu_variants(menu_id: Optional[int] = None, _: User = Depends(ANY)):
    rows = await db.menu_variants.find({"menu_id": menu_id} if menu_id is not None else None).sort("_id", 1).to_list(None)
    by_variant = defaultdict(list)
    async for r in db.variant_ingredients.find({"variant_id": {"$in": [r["_id"] for r in rows]}}):
        by_variant[r["variant_id"]].append(r)
    mids = list({r["material_id"] for lst in by_variant.values() for r in lst})
    mats = {m["_id"]: float(m["stock_quantity"] or 0) async for m in db.raw_materials.find({"_id": {"$in": mids}})} if mids else {}
    out = []
    for r in rows:
        caps = [int(mats.get(i["material_id"], 0) // float(i["qty_needed"])) for i in by_variant[r["_id"]] if float(i["qty_needed"] or 0) > 0]
        if r.get("stock") is not None:
            caps.append(int(r["stock"]))
        out.append({"id": r["_id"], "menu_id": r["menu_id"], "variant_name": r["variant_name"],
                    "additional_price": r.get("additional_price") or 0, "stock": r.get("stock"),
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


async def material_needs(items: List[dict]) -> dict:
    vq = variant_qty(items)
    if not vq:
        return {}
    needs = defaultdict(float)
    async for r in db.variant_ingredients.find({"variant_id": {"$in": list(vq)}}):
        needs[r["material_id"]] += float(r["qty_needed"]) * vq[r["variant_id"]]
    return needs


async def check_materials(items: List[dict]) -> dict:
    vq = variant_qty(items)
    if not vq:
        return {}
    for vid, v in (await load_variants(list(vq))).items():
        if v.get("stock") is not None and v["stock"] < vq[vid]:
            raise HTTPException(400, f"Stok varian {v['variant_name']} {'habis' if v['stock'] <= 0 else 'tidak cukup'} (tersedia {v['stock']})")
    needs = await material_needs(items)
    if needs:
        mats = {m["_id"]: m async for m in db.raw_materials.find({"_id": {"$in": list(needs)}})}
        for mid, qty in needs.items():
            m = mats.get(mid)
            if not m:
                raise HTTPException(400, f"Bahan baku #{mid} tidak ditemukan di raw_materials")
            stock = float(m["stock_quantity"] or 0)
            if stock + 1e-9 < qty:
                label = "habis" if stock <= 0 else "tidak cukup"
                raise HTTPException(400, f"Stok bahan baku {m['material_name']} {label} (butuh {qty:g} {m.get('unit') or ''}, tersedia {stock:g})")
    return needs


async def consume_materials(items: List[dict], needs: dict):
    for mid, qty in needs.items():
        await db.raw_materials.update_one({"_id": mid}, {"$inc": {"stock_quantity": -qty}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}})
    for vid, qty in variant_qty(items).items():
        await db.menu_variants.update_one({"_id": vid, "stock": {"$ne": None}}, {"$inc": {"stock": -qty}})

