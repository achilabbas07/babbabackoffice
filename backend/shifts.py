from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import BaseDocument, User, db, next_id, now_iso, require_roles

router = APIRouter(prefix="/api")
STAFF = require_roles("admin", "kasir")
ADMIN = require_roles("admin")


class Shift(BaseDocument):
    userId: str
    userName: str
    openedAt: str
    openingCash: float
    status: str = "open"
    closedAt: Optional[str] = None
    countedCash: Optional[float] = None
    expectedCash: Optional[float] = None
    difference: Optional[float] = None
    cashSales: float = 0
    nonCashSales: float = 0
    cashIn: float = 0
    cashOut: float = 0
    trxCount: int = 0
    note: str = ""


class CashMovement(BaseDocument):
    shiftId: str
    userId: str
    userName: str
    type: str
    amount: float
    note: str = ""
    timestamp: str


class OpenShiftIn(BaseModel):
    openingCash: float = Field(ge=0)


class MovementIn(BaseModel):
    type: Literal["in", "out"]
    amount: float = Field(gt=0)
    note: str = Field(min_length=1)


class CloseShiftIn(BaseModel):
    countedCash: float = Field(ge=0)
    note: str = ""


async def get_open_shift(user_id: str) -> Optional[dict]:
    doc = await db.shifts.find_one({"userId": user_id, "status": "open"})
    return dict(doc) if doc else None


async def require_open_shift(user: User) -> dict:
    doc = await get_open_shift(user.id)
    if not doc:
        raise HTTPException(400, "Buka shift kasir terlebih dahulu")
    return doc


async def summarize(shift_id: str) -> dict:
    txs = await db.transactions.find({"shiftId": shift_id}).to_list(None)
    movs = await db.cash_movements.find({"shiftId": shift_id}).to_list(None)
    return {
        "cashSales": sum(t["total"] for t in txs if t["method"] == "Cash"),
        "nonCashSales": sum(t["total"] for t in txs if t["method"] != "Cash"),
        "cashIn": sum(m["amount"] for m in movs if m["type"] == "in"),
        "cashOut": sum(m["amount"] for m in movs if m["type"] == "out"),
        "trxCount": len(txs),
    }


def expected_cash(opening: float, s: dict) -> float:
    return opening + s["cashSales"] + s["cashIn"] - s["cashOut"]


@router.get("/shifts/current")
async def current_shift(user: User = Depends(STAFF)):
    doc = await get_open_shift(user.id)
    return {"shift": Shift.from_mongo(doc) if doc else None}


@router.post("/shifts/open")
async def open_shift(body: OpenShiftIn, user: User = Depends(STAFF)):
    if await get_open_shift(user.id):
        raise HTTPException(409, "Shift Anda masih terbuka")
    shift = Shift(id=await next_id(f"SHIFT-{datetime.now(timezone.utc):%Y%m%d}"), userId=user.id, userName=user.name,
                  openedAt=now_iso(), openingCash=body.openingCash)
    await db.shifts.insert_one(shift.to_mongo())
    return shift


@router.get("/shifts/current/movements")
async def current_movements(user: User = Depends(STAFF)):
    shift = await require_open_shift(user)
    docs = await db.cash_movements.find({"shiftId": shift["_id"]}).sort("timestamp", -1).to_list(None)
    return [CashMovement.from_mongo(d) for d in docs]


@router.post("/shifts/cash-movements")
async def add_movement(body: MovementIn, user: User = Depends(STAFF)):
    shift = await require_open_shift(user)
    mov = CashMovement(id=await next_id("KAS", 4), shiftId=shift["_id"], userId=user.id, userName=user.name,
                       type=body.type, amount=body.amount, note=body.note, timestamp=now_iso())
    await db.cash_movements.insert_one(mov.to_mongo())
    return mov


@router.post("/shifts/close")
async def close_shift(body: CloseShiftIn, user: User = Depends(STAFF)):
    shift = await require_open_shift(user)
    s = await summarize(shift["_id"])
    expected = expected_cash(shift["openingCash"], s)
    update = {**s, "status": "closed", "closedAt": now_iso(), "countedCash": body.countedCash,
              "expectedCash": expected, "difference": body.countedCash - expected, "note": body.note}
    await db.shifts.update_one({"_id": shift["_id"]}, {"$set": update})
    return Shift.from_mongo(await db.shifts.find_one({"_id": shift["_id"]}))


@router.get("/shifts")
async def list_shifts(_: User = Depends(ADMIN)):
    out = []
    for d in await db.shifts.find().sort("openedAt", -1).to_list(200):
        if d["status"] == "open":
            s = await summarize(d["_id"])
            d = {**d, **s, "expectedCash": expected_cash(d["openingCash"], s)}
        out.append(Shift.from_mongo(d))
    return out


@router.get("/shifts/{sid}/movements")
async def shift_movements(sid: str, _: User = Depends(ADMIN)):
    docs = await db.cash_movements.find({"shiftId": sid}).sort("timestamp", -1).to_list(None)
    return [CashMovement.from_mongo(d) for d in docs]
