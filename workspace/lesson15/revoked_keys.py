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
    raise NotImplementedError("TODO")


def read_401s(path):
    """Every log entry with status 401 that has a key_label."""
    raise NotImplementedError("TODO")


def still_knocking(entries, keys):
    """One row per revoked (account_id, label) that appears in the 401s.

    Each row: account_id, label, revoked_at ('YYYY-MM-DD'), attempts, last_attempt
    (the log's time string), note ("also has an active key with this label" or "").
    Sorted by attempts, most first, then account_id.
    """
    raise NotImplementedError("TODO")


def main(log_path):
    """Load the keys, read the 401s, and print one line per revoked key still in use. Return 0."""
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python lesson15/revoked_keys.py <log file>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
