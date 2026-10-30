from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional, Sequence
from uuid import uuid4


JournalLine = tuple[str, str, Decimal, Decimal]


def account_type_from_category(account_category: Optional[str]) -> Optional[str]:
    if not account_category:
        return None

    category = account_category.strip().lower()
    category_prefixes = (
        (("asset", "assets", "aset", "aktiva"), "asset"),
        (("liabilit", "kewajiban", "utang", "hutang"), "liability"),
        (("equity", "ekuitas", "modal"), "equity"),
        (("revenue", "pendapatan", "income"), "revenue"),
        (("expense", "beban", "biaya"), "expense"),
    )
    for prefixes, account_type in category_prefixes:
        if category.startswith(prefixes):
            return account_type
    return None


def _money(value: Any) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def transaction_lines(total: float, method: str, items: list[dict]) -> list[JournalLine]:
    amount = _money(total)
    lines: list[JournalLine] = []
    if amount > 0:
        cash_account = "Kas" if method == "Cash" else "Bank"
        lines.extend([
            (cash_account, "asset", amount, Decimal("0")),
            ("Penjualan", "revenue", Decimal("0"), amount),
        ])

    cost_of_goods = _money(sum(
        Decimal(str(item.get("hpp", 0) or 0)) * Decimal(str(item.get("qty", 0) or 0))
        for item in items
    ))
    if cost_of_goods > 0:
        lines.extend([
            ("Beban HPP", "expense", cost_of_goods, Decimal("0")),
            ("Persediaan bahan baku", "asset", Decimal("0"), cost_of_goods),
        ])
    return lines


def purchase_lines(total_cost: float) -> list[JournalLine]:
    amount = Decimal(int(round(total_cost)))
    if amount <= 0:
        return []
    return [
        ("Persediaan bahan baku", "asset", amount, Decimal("0")),
        ("Kas", "asset", Decimal("0"), amount),
    ]


def expense_lines(category: str, amount: float) -> list[JournalLine]:
    value = Decimal(int(round(amount)))
    if value <= 0:
        return []
    return [
        (category.strip(), "expense", value, Decimal("0")),
        ("Kas", "asset", Decimal("0"), value),
    ]


async def post_finance_source(
    connection: Any,
    source_type: str,
    source_id: str,
    entry_date: date,
    description: str,
    created_by: Optional[str],
    lines: Sequence[JournalLine],
) -> None:
    if not lines:
        return

    entry_id = uuid4()
    await connection.executemany(
        """
        insert into public.general_ledger
          (entry_id, transaction_date, entry_date, description, account_name, account_type, debit, credit,
           created_by, source_type, source_id)
        values ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        """,
        [
            (
                entry_id,
                entry_date,
                entry_date,
                description,
                account_name,
                account_type,
                debit,
                credit,
                created_by,
                source_type,
                source_id,
            )
            for account_name, account_type, debit, credit in lines
        ],
    )
