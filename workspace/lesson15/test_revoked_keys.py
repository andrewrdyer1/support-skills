from datetime import datetime, timezone
from pathlib import Path

import psycopg

from revoked_keys import DATABASE_URL, load_keys, read_401s, still_knocking

LOG = Path(__file__).parent.parent / "data" / "history.log"


def dt(s):
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc)


def test_still_knocking_small():
    keys = {
        (1, "Zapier"): {"revoked_at": dt("2026-09-01T12:00:00"), "has_active": False},
        (2, "Sync"): {"revoked_at": None, "has_active": True},           # never revoked
        (3, "CRM"): {"revoked_at": dt("2026-05-01T00:00:00"), "has_active": True},
    }
    entries = [
        {"account_id": 1, "key_label": "Zapier", "time": "2026-10-25T10:00:00.000Z"},
        {"account_id": 3, "key_label": "CRM", "time": "2026-10-26T09:00:00.000Z"},
        {"account_id": 1, "key_label": "Zapier", "time": "2026-10-29T08:00:00.000Z"},
        {"account_id": 2, "key_label": "Sync", "time": "2026-10-29T08:00:00.000Z"},
        {"account_id": 9, "key_label": "Unknown", "time": "2026-10-29T08:00:00.000Z"},
    ]
    assert still_knocking(entries, keys) == [
        {"account_id": 1, "label": "Zapier", "revoked_at": "2026-09-01", "attempts": 2, "last_attempt": "2026-10-29T08:00:00.000Z", "note": ""},
        {"account_id": 3, "label": "CRM", "revoked_at": "2026-05-01", "attempts": 1, "last_attempt": "2026-10-26T09:00:00.000Z", "note": "also has an active key with this label"},
    ]


def test_read_401s_keeps_only_401s_with_a_label():
    entries = read_401s(LOG)
    assert len(entries) == 58
    assert all(e["status"] == 401 and e["key_label"] for e in entries)


def test_load_keys_knows_about_shared_labels():
    with psycopg.connect(DATABASE_URL) as conn:
        keys = load_keys(conn)
    assert keys[(39, "Accounting sync")]["has_active"] is True
    assert keys[(39, "Accounting sync")]["revoked_at"] is not None
    assert keys[(1, "Old Zapier connection")]["has_active"] is False


def test_real_log():
    with psycopg.connect(DATABASE_URL) as conn:
        rows = still_knocking(read_401s(LOG), load_keys(conn))
    assert len(rows) == 5
    assert [(r["account_id"], r["attempts"]) for r in rows[:2]] == [(39, 14), (189, 14)]
    harbor = next(r for r in rows if r["account_id"] == 1)
    assert harbor["label"] == "Old Zapier connection" and harbor["attempts"] == 11
    assert next(r for r in rows if r["account_id"] == 39)["note"] == "also has an active key with this label"
