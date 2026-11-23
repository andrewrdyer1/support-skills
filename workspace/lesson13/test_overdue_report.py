"""Tests for overdue_report.py. Run from the workspace folder:  python -m pytest lesson13

Two kinds of test live here:

  - Unit tests use FakeSession, a stand-in for requests that returns responses
    we choose. They're instant, and they can test things that are hard to make
    happen for real, like a server that fails twice and then works.

  - Live tests call your local Paperkite API. They're skipped if the course
    server isn't running.
"""
from datetime import date

import pytest
import requests

import overdue_report
from overdue_report import (
    ApiError,
    build_rows,
    days_overdue,
    fetch_all,
    make_session,
    main,
    request_with_retry,
    write_report,
)

KEY = "pk_test_harbor_reporting_7d2f"
TODAY = date(2026, 10, 30)


# ---------- fakes ----------

class FakeResponse:
    def __init__(self, status_code, body=None, headers=None):
        self.status_code = status_code
        self._body = body if body is not None else {}
        self.headers = headers or {}
        self.text = str(self._body)

    def json(self):
        return self._body


class FakeSession:
    """Returns the given responses in order, and records every request made."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def request(self, method, url, params=None, json=None, timeout=None):
        self.calls.append({"method": method, "url": url, "params": params, "json": json})
        return self.responses.pop(0)


class FakeSleep:
    """Records how long the code asked to sleep, without waiting."""

    def __init__(self):
        self.waits = []

    def __call__(self, seconds):
        self.waits.append(seconds)


def server_running():
    try:
        return requests.get(overdue_report.API + "/api/v1/health", timeout=1).ok
    except requests.ConnectionError:
        return False


live = pytest.mark.skipif(not server_running(), reason="course server isn't running (npm start)")


# ---------- request_with_retry ----------

def test_returns_a_successful_response():
    session = FakeSession([FakeResponse(200, {"ok": True})])
    response = request_with_retry(session, "GET", "http://x/api", sleep=FakeSleep())
    assert response.status_code == 200
    assert len(session.calls) == 1


def test_waits_retry_after_on_429_then_succeeds():
    session = FakeSession([FakeResponse(429, headers={"Retry-After": "7"}), FakeResponse(200)])
    sleep = FakeSleep()
    response = request_with_retry(session, "GET", "http://x/api", sleep=sleep)
    assert response.status_code == 200
    assert sleep.waits == [7]


def test_backs_off_on_server_errors_then_gives_up():
    session = FakeSession([FakeResponse(503), FakeResponse(503), FakeResponse(503)])
    sleep = FakeSleep()
    with pytest.raises(ApiError):
        request_with_retry(session, "GET", "http://x/api", sleep=sleep)
    assert len(session.calls) == 3
    assert sleep.waits == [2, 4]


def test_does_not_retry_a_403_and_explains_why():
    body = {"error": {"type": "permission_error", "message": "The starter plan does not include API access."}}
    session = FakeSession([FakeResponse(403, body)])
    sleep = FakeSleep()
    with pytest.raises(ApiError) as caught:
        request_with_retry(session, "GET", "http://x/api", sleep=sleep)
    assert "403" in str(caught.value)
    assert "starter plan" in str(caught.value)
    assert len(session.calls) == 1
    assert sleep.waits == []


# ---------- fetch_all ----------

def test_fetch_all_follows_every_page():
    session = FakeSession([
        FakeResponse(200, {"data": [{"n": 1}, {"n": 2}], "has_more": True}),
        FakeResponse(200, {"data": [{"n": 3}, {"n": 4}], "has_more": True}),
        FakeResponse(200, {"data": [{"n": 5}], "has_more": False}),
    ])
    items = fetch_all(session, "/api/v1/invoices", {"status": "overdue"}, page_size=2, sleep=FakeSleep())
    assert [i["n"] for i in items] == [1, 2, 3, 4, 5]
    assert [c["params"]["page"] for c in session.calls] == [1, 2, 3]
    assert all(c["params"]["status"] == "overdue" and c["params"]["limit"] == 2 for c in session.calls)


# ---------- days_overdue, build_rows, write_report ----------

def test_days_overdue():
    assert days_overdue("2026-10-09", TODAY) == 21
    assert days_overdue("2026-10-30", TODAY) == 0


def test_build_rows_formats_and_sorts():
    invoices = [
        {"number": "INV-2", "client_name": "B", "amount_cents": 150000, "currency": "USD", "due_at": "2026-10-20"},
        {"number": "INV-1", "client_name": "A", "amount_cents": 99, "currency": "USD", "due_at": "2026-09-30"},
    ]
    rows = build_rows(invoices, TODAY)
    assert [r["number"] for r in rows] == ["INV-1", "INV-2"]
    assert rows[0] == {"number": "INV-1", "client": "A", "amount": "0.99", "currency": "USD", "due_at": "2026-09-30", "days_overdue": 30}
    assert rows[1]["amount"] == "1500.00"


def test_write_report(tmp_path):
    rows = [{"number": "INV-1", "client": "A", "amount": "0.99", "currency": "USD", "due_at": "2026-09-30", "days_overdue": 30}]
    out = tmp_path / "out" / "overdue.csv"
    write_report(rows, out)
    assert out.read_text().splitlines() == [
        "number,client,amount,currency,due_at,days_overdue",
        "INV-1,A,0.99,USD,2026-09-30,30",
    ]


# ---------- main ----------

def test_main_needs_an_api_key(monkeypatch, capsys):
    monkeypatch.delenv("PAPERKITE_API_KEY", raising=False)
    assert main(today=TODAY) == 2
    assert "PAPERKITE_API_KEY" in capsys.readouterr().err


# ---------- live, against your local API ----------

@live
def test_live_fetch_all_gets_every_overdue_invoice():
    invoices = fetch_all(make_session(KEY), "/api/v1/invoices", {"status": "overdue"}, page_size=4)
    assert len(invoices) == 6  # two pages of 4 and 2
    assert all(i["status"] == "overdue" for i in invoices)


@live
def test_live_main(monkeypatch, tmp_path, capsys):
    monkeypatch.setenv("PAPERKITE_API_KEY", KEY)
    assert main(today=TODAY, out_dir=tmp_path) == 0
    printed = capsys.readouterr().out
    assert "6 overdue invoices" in printed
    assert (tmp_path / "overdue.csv").exists()


@live
def test_live_main_reports_a_refused_key(monkeypatch, capsys):
    monkeypatch.setenv("PAPERKITE_API_KEY", "pk_test_sprout_site_8n2c")
    assert main(today=TODAY) == 1
    assert "starter plan" in capsys.readouterr().err
