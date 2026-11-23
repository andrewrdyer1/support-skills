"""Case B: revoked keys still knocking.

Finds revoked API keys that are still being used, from the request log, so CX
can tell those customers an integration of theirs has been failing silently.

The log only records a key's label, never the key, and labels aren't unique:
an account can have an active "Accounting sync" key and a revoked one. So
matches are by (account_id, label), and the report notes when the account also
has an active key with that label: usually a rotated key where an old copy of
the integration was never updated.

Run:   python lesson15/revoked_keys.py data/history.log
Test:  python -m pytest lesson15/test_revoked_keys.py
"""
import json
import sys

import psycopg

DATABASE_URL = "postgresql://learner@localhost:5488/paperkite"


def load_keys(conn):
    """Every key label in the database, grouped by account.

    Returns a dict mapping (account_id, label) to a dict with two entries:
      "revoked_at": the latest revoked_at among that label's revoked keys (or None)
      "has_active": True if any key with that label is NOT revoked
    """
    keys = {}
    with conn.cursor() as cur:
        cur.execute("select account_id, label, revoked_at from api_keys")
        for account_id, label, revoked_at in cur.fetchall():
            entry = keys.setdefault((account_id, label), {"revoked_at": None, "has_active": False})
            if revoked_at is None:
                entry["has_active"] = True
            elif entry["revoked_at"] is None or revoked_at > entry["revoked_at"]:
                entry["revoked_at"] = revoked_at
    return keys


def read_401s(path):
    """Every log entry with status 401 that has a key_label."""
    entries = []
    with open(path) as f:
        for line in f:
            if not line.strip():
                continue
            e = json.loads(line)
            if e.get("status") == 401 and e.get("key_label"):
                entries.append(e)
    return entries


def still_knocking(entries, keys):
    """One row per revoked (account_id, label) that appears in the 401s.

    Each row: account_id, label, revoked_at ('YYYY-MM-DD'), attempts, last_attempt
    (the log's time string), note ("also has an active key with this label" or "").
    Sorted by attempts, most first, then account_id.
    """
    rows = {}
    for e in entries:
        k = (e["account_id"], e["key_label"])
        info = keys.get(k)
        if not info or info["revoked_at"] is None:
            continue
        row = rows.setdefault(k, {
            "account_id": k[0],
            "label": k[1],
            "revoked_at": info["revoked_at"].date().isoformat(),
            "attempts": 0,
            "last_attempt": "",
            "note": "also has an active key with this label" if info["has_active"] else "",
        })
        row["attempts"] += 1
        row["last_attempt"] = max(row["last_attempt"], e["time"])
    return sorted(rows.values(), key=lambda r: (-r["attempts"], r["account_id"]))


def main(log_path):
    with psycopg.connect(DATABASE_URL) as conn:
        keys = load_keys(conn)
    rows = still_knocking(read_401s(log_path), keys)
    print(f"{len(rows)} revoked keys are still being used:")
    for r in rows:
        note = f"  ({r['note']})" if r["note"] else ""
        print(f"  account {r['account_id']}, {r['label']!r}: {r['attempts']} attempts, revoked {r['revoked_at']}, last {r['last_attempt'][:16]}{note}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python lesson15/revoked_keys.py <log file>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
