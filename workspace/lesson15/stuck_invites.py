"""Case A: invites nobody accepted.

Teammates who were invited more than 7 days ago and have never logged in, on
accounts that are active or trialing. Flags the ones whose email domain doesn't
match the account owner's, which is how Sam's typo was found in Lesson 1.

Run:   python lesson15/stuck_invites.py
Test:  python -m pytest lesson15/test_stuck_invites.py
"""
import csv
import sys
from datetime import date, timedelta
from pathlib import Path

import psycopg

DATABASE_URL = "postgresql://learner@localhost:5488/paperkite"

QUERY = """
-- TODO: your SQL here. Use %s where the cutoff date goes; psycopg fills it in safely.
"""


def domain(email):
    """The part after the @, lowercased."""
    raise NotImplementedError("TODO")


def looks_like_typo(email, owner_email):
    """True when the invite went to a different domain than the owner's."""
    raise NotImplementedError("TODO")


def fetch_stuck_invites(conn, today):
    """Rows for every stuck invite as of `today`, each a dict with account,
    owner_email, email, invited (a 'YYYY-MM-DD' string) and possible_typo."""
    raise NotImplementedError("TODO")


def write_csv(rows, path):
    """Write the row dicts to a CSV with columns account, owner_email, email, invited,
    possible_typo. Create the folder if needed."""
    raise NotImplementedError("TODO")


def main(today=date(2026, 10, 30), out_dir="out"):
    """Connect to the database, fetch the stuck invites, and print
    "<n> invites not accepted after 7 days. Possible typos: <k>" followed by one
    line per possible typo that includes the email. Save out_dir/stuck_invites.csv.
    Return 0."""
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    sys.exit(main())
