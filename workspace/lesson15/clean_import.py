"""Case C: clean a customer's contact import.

A customer sent data/contacts_import.csv to bulk-add their team. Before anyone
imports it, clean it:

  - email: trim spaces and lowercase. Reject it if it isn't a plausible email
    (exactly one @, no spaces, something before the @, and a dot in the part
    after it with something either side).
  - role: lowercase. Reject anything other than admin or member.
  - name: trim. If it's blank, make one from the email: "ruth.ueda@x.com"
    becomes "Ruth Ueda".
  - duplicates: the same email (after cleaning) appearing again is rejected;
    the first one wins.

Writes out/contacts_clean.csv (name,email,role) and out/contacts_rejected.csv
(line,name,email,role,reason), where line is the row's line number in the
original file (the header is line 1) so the customer can find it.

Run:   python lesson15/clean_import.py data/contacts_import.csv
Test:  python -m pytest lesson15/test_clean_import.py
"""
import csv
import re
import sys
from pathlib import Path

ROLES = {"admin", "member"}
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def clean_email(raw):
    """Trimmed, lowercased email, or None if it isn't plausible."""
    raise NotImplementedError("TODO")


def name_from_email(email):
    """'ruth.ueda@copperstudio.com' -> 'Ruth Ueda'."""
    raise NotImplementedError("TODO")


def clean_row(row):
    """Clean one row (a dict with name, email, role).

    Returns (cleaned_row, None) if it's good, or (None, reason) if it's rejected.
    Reasons: "invalid email", "unknown role". (Duplicates are handled by clean_rows.)
    """
    raise NotImplementedError("TODO")


def clean_rows(rows):
    """Clean every row. Returns (clean, rejected).

    rejected rows are the original values plus "line" and "reason". The first
    data row is line 2, because the header is line 1.
    """
    raise NotImplementedError("TODO")


def write_csv(rows, path, fields):
    """Write the row dicts to a CSV with these columns. Create the folder if needed."""
    raise NotImplementedError("TODO")


def main(in_path, out_dir="out"):
    """Read the CSV, clean it, write out_dir/contacts_clean.csv (name,email,role) and
    out_dir/contacts_rejected.csv (line,name,email,role,reason), print a summary
    and each rejected line. Return 0."""
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python lesson15/clean_import.py <csv file>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
