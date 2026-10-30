import asyncio
from datetime import date
from decimal import Decimal

from finance import expense_lines, post_finance_source, purchase_lines, transaction_lines


def test_cash_sale_posts_revenue_and_cost_of_goods():
    lines = transaction_lines(
        1000,
        "Cash",
        [{"hpp": 12.5, "qty": 2}, {"hpp": 3.25, "qty": 4}],
    )

    assert lines == [
        ("Kas", "asset", Decimal("1000.00"), Decimal("0")),
        ("Penjualan", "revenue", Decimal("0"), Decimal("1000.00")),
        ("Beban HPP", "expense", Decimal("38.00"), Decimal("0")),
        ("Persediaan bahan baku", "asset", Decimal("0"), Decimal("38.00")),
    ]


def test_non_cash_sale_uses_bank_and_rounds_cost_to_cents():
    lines = transaction_lines(500, "QRIS", [{"hpp": 10.105, "qty": 1}])

    assert lines == [
        ("Bank", "asset", Decimal("500.00"), Decimal("0")),
        ("Penjualan", "revenue", Decimal("0"), Decimal("500.00")),
        ("Beban HPP", "expense", Decimal("10.11"), Decimal("0")),
        ("Persediaan bahan baku", "asset", Decimal("0"), Decimal("10.11")),
    ]


def test_purchase_and_expense_post_balanced_lines():
    assert purchase_lines(1200) == [
        ("Persediaan bahan baku", "asset", Decimal("1200"), Decimal("0")),
        ("Kas", "asset", Decimal("0"), Decimal("1200")),
    ]
    assert expense_lines("  Listrik  ", 350) == [
        ("Listrik", "expense", Decimal("350"), Decimal("0")),
        ("Kas", "asset", Decimal("0"), Decimal("350")),
    ]


def test_post_finance_source_sets_required_transaction_date():
    class FakeConnection:
        sql = ""
        rows = []

        async def executemany(self, sql, rows):
            self.sql = sql
            self.rows = list(rows)

    connection = FakeConnection()
    entry_date = date(2026, 10, 30)
    asyncio.run(post_finance_source(
        connection,
        "transaction",
        "TRX-TEST",
        entry_date,
        "Penjualan test",
        "USR-ADMIN",
        [("Kas", "asset", Decimal("100"), Decimal("0"))],
    ))

    assert "transaction_date, entry_date" in connection.sql
    assert connection.rows[0][1:3] == (entry_date, entry_date)
