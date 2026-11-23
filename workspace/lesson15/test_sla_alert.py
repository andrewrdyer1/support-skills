from datetime import datetime, timezone

import pytest
import requests

import sla_alert
from sla_alert import breaches, format_alert, main, parse_time

NOW = datetime(2026, 10, 30, 17, 0, tzinfo=timezone.utc)


def ticket(id, priority, created_at, first_response_at=None, subject="Help", account="Acme Co"):
    return {"id": id, "priority": priority, "created_at": created_at, "first_response_at": first_response_at, "subject": subject, "account_name": account}


def test_parse_time():
    assert parse_time("2026-10-29T13:21:13.325Z") == datetime(2026, 10, 29, 13, 21, 13, 325000, tzinfo=timezone.utc)


def test_breaches_applies_targets():
    tickets = [
        ticket(1, "urgent", "2026-10-30T15:30:00Z"),                    # 1.5h, target 1  -> breach
        ticket(2, "urgent", "2026-10-30T16:30:00Z"),                    # 0.5h            -> fine
        ticket(3, "high", "2026-10-30T12:00:00Z"),                      # 5h, target 4    -> breach
        ticket(4, "high", "2026-10-30T12:00:00Z", "2026-10-30T12:30:00Z"),  # replied     -> fine
        ticket(5, "normal", "2026-10-28T00:00:00Z"),                    # not watched
        ticket(6, "high", "2026-10-30T13:00:00Z"),                      # exactly 4h      -> fine
    ]
    found = breaches(tickets, NOW)
    assert [(t["id"], t["hours_waiting"]) for t in found] == [(3, 5.0), (1, 1.5)]


def test_format_alert():
    assert format_alert([]) == ""
    text = format_alert([{**ticket(592, "high", "x", subject="Card declined", account="Ember Print Shop"), "hours_waiting": 27.6}])
    assert text.splitlines() == [
        ":rotating_light: 1 ticket past the reply target with no response:",
        "• #592 [high] Ember Print Shop: Card declined (27.6h waiting)",
    ]


def server_running():
    try:
        return requests.get(sla_alert.API + "/api/v1/health", timeout=1).ok
    except requests.ConnectionError:
        return False


@pytest.mark.skipif(not server_running(), reason="course server isn't running (npm start)")
def test_live(monkeypatch, capsys):
    monkeypatch.setenv("HELPDESK_TOKEN", "hd_test_support_team")
    assert main(NOW) == 1
    out = capsys.readouterr().out
    assert out.startswith(":rotating_light: 2 tickets")
    assert "#592" in out and "#864" in out
