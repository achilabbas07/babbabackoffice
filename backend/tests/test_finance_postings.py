import asyncio
from datetime import date
from decimal import Decimal
import re

from finance import (
    account_type_from_category,
    expense_lines,
    get_dashboard_neraca_kas,
    post_cash_expense_journal,
    post_purchase_payment_journal,
    post_finance_source,
    purchase_lines,
    transaction_lines,
)


def test_chart_account_categories_map_to_journal_types():
    assert account_type_from_category("Aset Lancar") == "asset"
    assert account_type_from_category("Liabilitas Jangka Pendek") == "liability"
    assert account_type_from_category("Modal Pemilik") == "equity"
    assert account_type_from_category("Pendapatan Operasional") == "revenue"
    assert account_type_from_category("Beban Gaji") == "expense"
    assert account_type_from_category("Kategori Tidak Dikenal") is None


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


def test_cash_expense_posts_cash_credit_to_jurnal_transaksi():
    class FakeConnection:
        sql = ""
        args = ()

        async def execute(self, sql, *args):
            self.sql = sql
            self.args = args

    connection = FakeConnection()
    asyncio.run(post_cash_expense_journal(connection, 150000, "Tagihan Listrik & Air"))

    assert "insert into public.jurnal_transaksi" in connection.sql
    assert "(kode_akun, debit, kredit, keterangan)" in connection.sql
    assert "values ($1, 0, $2, $3)" in connection.sql
    assert connection.args == (
        "1-10001",
        Decimal("150000.00"),
        "Pembayaran Tunai Kasir: Tagihan Listrik & Air",
    )


def test_purchase_payment_uses_selected_funding_account():
    class FakeConnection:
        sql = ""
        args = ()

        async def execute(self, sql, *args):
            self.sql = sql
            self.args = args

    connection = FakeConnection()
    asyncio.run(post_purchase_payment_journal(
        connection,
        150000,
        "1-10002",
        "Pembelian persediaan PO-001 - Supplier",
    ))

    assert "insert into public.jurnal_transaksi" in connection.sql
    assert connection.args == (
        "1-10002",
        Decimal("150000.00"),
        "Pembelian persediaan PO-001 - Supplier",
    )


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
    target_columns = re.search(r"insert into public\.general_ledger\s*\((.*?)\)\s*values", connection.sql, re.DOTALL)
    value_expressions = re.search(r"\bvalues\s*\((.*?)\)", connection.sql, re.DOTALL)
    assert target_columns is not None
    assert value_expressions is not None
    assert len(target_columns.group(1).split(",")) == len(value_expressions.group(1).split(","))
    assert max(map(int, re.findall(r"\$(\d+)", value_expressions.group(1)))) == len(connection.rows[0])


def test_dashboard_neraca_kas_reads_summary_view():
    class FakeConnection:
        def __init__(self):
            self.sql = ""

        async def fetchrow(self, sql):
            self.sql = sql
            return {
                "kas_bank_akhir": Decimal("968050.00"),
                "persediaan_bahan_baku": Decimal("1526718.00"),
                "total_aset": Decimal("2494768.00"),
                "total_liabilitas_ekuitas": Decimal("2494768.00"),
            }

    connection = FakeConnection()
    result = asyncio.run(get_dashboard_neraca_kas(connection))

    assert result == {
        "kas_bank_akhir": Decimal("968050.00"),
        "persediaan_bahan_baku": Decimal("1526718.00"),
        "total_aset": Decimal("2494768.00"),
        "total_liabilitas_ekuitas": Decimal("2494768.00"),
    }
    assert "from public.view_dashboard_neraca_kas" in connection.sql
