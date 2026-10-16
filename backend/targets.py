import uuid
from collections import defaultdict
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import BaseDocument, User, db, get_current_user, next_id, now_iso, require_roles

router = APIRouter(prefix="/api")
ADMIN = require_roles("admin")
WAITER = require_roles("waiter")
ANY = require_roles("admin", "kasir", "waiter")


class SalesTarget(BaseDocument):
    name: str
    productIds: List[str]
    productNames: List[str]
    targetQty: int
    waiterId: Optional[str] = None
    waiterName: str = ""


class WaiterShift(BaseDocument):
    userId: str
    userName: str
    openedAt: str
    status: str = "open"
    closedAt: Optional[str] = None
    results: List[dict] = []


class TargetIn(BaseModel):
    name: str = ""
    productIds: List[str] = Field(min_length=1)
    targetQty: int = Field(gt=0)
    waiterId: Optional[str] = None


async def resolve_waiter(waiter_id: Optional[str], fallback_name: str, user: User) -> Tuple[Optional[str], str]:
    wid = waiter_id or (user.id if user.role == "waiter" else None)
    if not wid:
        return None, fallback_name
    doc = await db.users.find_one({"_id": wid, "role": "waiter"})
    if not doc:
        raise HTTPException(404, "Pelayan tidak ditemukan")
    return wid, doc["name"]


def _qty_map(items: List[dict]) -> dict:
    m = defaultdict(lambda: [0, ""])
    for i in items:
        m[i["productId"]][0] += i["qty"]
        m[i["productId"]][1] = i["productName"]
    return m


async def _write_logs(waiter: Tuple[Optional[str], str], deltas: dict, source: str, ref: str):
    wid, wname = waiter
    if not wid:
        return
    shift = await db.waiter_shifts.find_one({"userId": wid, "status": "open"})
    ts = now_iso()
    docs = [{"_id": str(uuid.uuid4()), "timestamp": ts, "waiterId": wid, "waiterName": wname, "productId": pid,
             "productName": name, "qty": q, "source": source, "refId": ref, "shiftId": shift["_id"] if shift else None}
            for pid, (q, name) in deltas.items() if q]
    if docs:
        await db.order_logs.insert_many(docs)


async def log_order_diff(old_items: List[dict], old_waiter: Tuple, new_items: List[dict], new_waiter: Tuple, source: str, ref: str):
    old, new = _qty_map(old_items), _qty_map(new_items)
    if old_waiter[0] == new_waiter[0]:
        deltas = {pid: [new[pid][0] - old[pid][0], new[pid][1] or old[pid][1]] for pid in set(old) | set(new)}
        await _write_logs(new_waiter, deltas, source, ref)
    else:
        await _write_logs(old_waiter, {pid: [-q, n] for pid, (q, n) in old.items()}, source, ref)
        await _write_logs(new_waiter, dict(new), source, ref)


async def progress_for(shift: dict) -> dict:
    targets = await db.sales_targets.find({"$or": [{"waiterId": None}, {"waiterId": shift["userId"]}]}).to_list(None)
    pids = list({pid for t in targets for pid in t["productIds"]})
    got = defaultdict(int)
    async for log in db.order_logs.find({"shiftId": shift["_id"], "productId": {"$in": pids}}):
        got[log["productId"]] += log["qty"]
    items = []
    for t in targets:
        breakdown = [{"productId": pid, "productName": n, "qty": max(0, got.get(pid, 0))} for pid, n in zip(t["productIds"], t["productNames"])]
        achieved = max(0, sum(got.get(pid, 0) for pid in t["productIds"]))
        items.append({"targetId": t["_id"], "name": t["name"], "productIds": t["productIds"], "breakdown": breakdown,
                      "targetQty": t["targetQty"], "achieved": achieved, "pct": min(100.0, achieved / t["targetQty"] * 100)})
    return {"shiftId": shift["_id"], "waiterId": shift["userId"], "waiterName": shift["userName"], "openedAt": shift["openedAt"], "items": items}


@router.get("/targets")
async def list_targets(_: User = Depends(ANY)):
    return [SalesTarget.from_mongo(d) for d in await db.sales_targets.find().sort("name", 1).to_list(None)]


async def _target_doc(body: TargetIn, target_id: str) -> SalesTarget:
    ids = list(dict.fromkeys(body.productIds))
    prods = {d["_id"]: d["name"] async for d in db.products.find({"_id": {"$in": ids}})}
    missing = [i for i in ids if i not in prods]
    if missing:
        raise HTTPException(404, f"Produk tidak ditemukan: {', '.join(missing)}")
    names = [prods[i] for i in ids]
    wname = ""
    if body.waiterId:
        w = await db.users.find_one({"_id": body.waiterId, "role": "waiter"})
        if not w:
            raise HTTPException(404, "Pelayan tidak ditemukan")
        wname = w["name"]
    return SalesTarget(id=target_id, name=body.name.strip() or " + ".join(names), productIds=ids, productNames=names,
                       targetQty=body.targetQty, waiterId=body.waiterId, waiterName=wname)


@router.post("/targets")
async def create_target(body: TargetIn, _: User = Depends(ADMIN)):
    t = await _target_doc(body, await next_id("TGT"))
    await db.sales_targets.insert_one(t.to_mongo())
    return t


@router.put("/targets/{tid}")
async def update_target(tid: str, body: TargetIn, _: User = Depends(ADMIN)):
    if not await db.sales_targets.find_one({"_id": tid}):
        raise HTTPException(404, "Target tidak ditemukan")
    t = await _target_doc(body, tid)
    await db.sales_targets.replace_one({"_id": tid}, t.to_mongo())
    return t


@router.delete("/targets/{tid}")
async def delete_target(tid: str, _: User = Depends(ADMIN)):
    res = await db.sales_targets.delete_one({"_id": tid})
    if not res.deleted_count:
        raise HTTPException(404, "Target tidak ditemukan")
    return {"ok": True}


@router.get("/targets/progress")
async def targets_progress(user: User = Depends(get_current_user)):
    if user.role == "waiter":
        shift = await db.waiter_shifts.find_one({"userId": user.id, "status": "open"})
        return [await progress_for(shift)] if shift else []
    if user.role != "admin":
        raise HTTPException(403, "Akses ditolak untuk peran ini")
    return [await progress_for(s) for s in await db.waiter_shifts.find({"status": "open"}).sort("openedAt", 1).to_list(None)]


@router.get("/waiter-shifts/current")
async def current_waiter_shift(user: User = Depends(WAITER)):
    doc = await db.waiter_shifts.find_one({"userId": user.id, "status": "open"})
    return {"shift": WaiterShift.from_mongo(doc) if doc else None}


@router.post("/waiter-shifts/open")
async def open_waiter_shift(user: User = Depends(WAITER)):
    if await db.waiter_shifts.find_one({"userId": user.id, "status": "open"}):
        raise HTTPException(409, "Shift Anda masih terbuka")
    shift = WaiterShift(id=await next_id("WSHIFT"), userId=user.id, userName=user.name, openedAt=now_iso())
    await db.waiter_shifts.insert_one(shift.to_mongo())
    return shift


@router.post("/waiter-shifts/close")
async def close_waiter_shift(user: User = Depends(WAITER)):
    doc = await db.waiter_shifts.find_one({"userId": user.id, "status": "open"})
    if not doc:
        raise HTTPException(400, "Tidak ada shift terbuka")
    results = (await progress_for(doc))["items"]
    await db.waiter_shifts.update_one({"_id": doc["_id"]}, {"$set": {"status": "closed", "closedAt": now_iso(), "results": results}})
    return WaiterShift.from_mongo(await db.waiter_shifts.find_one({"_id": doc["_id"]}))


@router.get("/waiter-shifts")
async def list_waiter_shifts(_: User = Depends(ADMIN)):
    docs = await db.waiter_shifts.find({"status": "closed"}).sort("closedAt", -1).to_list(100)
    return [WaiterShift.from_mongo(d) for d in docs]
