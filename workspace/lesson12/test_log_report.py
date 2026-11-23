"""Tests for log_report.py. Run them from the workspace folder:

    python -m pytest lesson12

Each test is a function whose name starts with test_. pytest finds them, runs
them, and reports any assert that fails, with the values involved.
"""
from pathlib import Path

from log_report import (
    failures_by_endpoint,
    main,
    normalize_path,
    parse_line,
    read_requests,
    top_accounts,
    write_csv,
)

LOG = Path(__file__).parent.parent / "data" / "history.log"


# ---------- parse_line ----------

def test_parse_line_reads_json():
    entry = parse_line('{"status": 500, "path": "/api/v1/me"}\n')
    assert entry == {"status": 500, "path": "/api/v1/me"}


def test_parse_line_skips_blank_lines():
    assert parse_line("") is None
    assert parse_line("   \n") is None


def test_parse_line_skips_broken_json():
    assert parse_line('{"status": 500, "path": ') is None


# ---------- read_requests ----------

def test_read_requests_keeps_only_requests():
    entries = read_requests(LOG)
    assert len(entries) == 1094  # 1096 lines, 2 of them deploys
    assert all("status" in e for e in entries)


def test_read_requests_survives_a_bad_line(tmp_path):
    log = tmp_path / "mixed.log"
    log.write_text('{"status": 200}\nnot json at all\n\n{"msg": "deploy"}\n{"status": 404}\n')
    assert [e["status"] for e in read_requests(log)] == [200, 404]


# ---------- normalize_path ----------

def test_normalize_path():
    assert normalize_path("/api/v1/invoices/123") == "/api/v1/invoices/:id"
    assert normalize_path("/api/v1/invoices/export") == "/api/v1/invoices/export"
    assert normalize_path("/api/v1/invoices") == "/api/v1/invoices"
    assert normalize_path("/api/v1/me") == "/api/v1/me"


# ---------- failures_by_endpoint ----------

def test_failures_by_endpoint_small():
    entries = [
        {"path": "/api/v1/me", "status": 401},
        {"path": "/api/v1/me", "status": 200},
        {"path": "/api/v1/invoices/9", "status": 404},
        {"path": "/api/v1/invoices/12", "status": 404},
        {"path": "/api/v1/me", "status": 401},
        {"path": "/api/v1/me", "status": 401},
    ]
    assert failures_by_endpoint(entries) == [
        ("/api/v1/me", 401, 3),
        ("/api/v1/invoices/:id", 404, 2),
    ]


def test_failures_by_endpoint_real_log():
    rows = failures_by_endpoint(read_requests(LOG))
    assert rows[0] == ("/api/v1/invoices", 401, 46)
    assert ("/api/v1/invoices/export", 500, 16) in rows
    assert all(status >= 400 for _, status, _ in rows)


# ---------- top_accounts ----------

def test_top_accounts_500s():
    top = top_accounts(read_requests(LOG), 500, n=2)
    assert len(top) == 2
    assert {account for account, _ in top} == {1, 23}
    assert [count for _, count in top] == [3, 3]


# Your turn: write a test that checks top_accounts respects n, and one that
# checks it returns an empty list for a status nobody got (try 418).


# ---------- write_csv and main ----------

def test_write_csv(tmp_path):
    out = tmp_path / "nested" / "report.csv"
    write_csv([("a", 1), ("b", 2)], out, ["name", "count"])
    assert out.read_text().splitlines() == ["name,count", "a,1", "b,2"]


def test_main_end_to_end(tmp_path, capsys):
    assert main(LOG, out_dir=tmp_path) == 0
    printed = capsys.readouterr().out
    assert "1094 requests" in printed
    assert (tmp_path / "failures.csv").exists()
