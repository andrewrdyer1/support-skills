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
    email = raw.strip().lower()
    return email if EMAIL.match(email) else None


def name_from_email(email):
    """'ruth.ueda@copperstudio.com' -> 'Ruth Ueda'."""
    return " ".join(part.capitalize() for part in email.split("@")[0].split("."))


def clean_row(row):
    """Clean one row (a dict with name, email, role).

    Returns (cleaned_row, None) if it's good, or (None, reason) if it's rejected.
    Reasons: "invalid email", "unknown role". (Duplicates are handled by clean_rows.)
    """
    email = clean_email(row["email"])
    if email is None:
        return None, "invalid email"
    role = row["role"].strip().lower()
    if role not in ROLES:
        return None, "unknown role"
    name = row["name"].strip() or name_from_email(email)
    return {"name": name, "email": email, "role": role}, None


def clean_rows(rows):
    """Clean every row. Returns (clean, rejected).

    rejected rows are the original values plus "line" and "reason". The first
    data row is line 2, because the header is line 1.
    """
    clean, rejected, seen = [], [], set()
    for line, row in enumerate(rows, start=2):
        cleaned, reason = clean_row(row)
        if cleaned and cleaned["email"] in seen:
            cleaned, reason = None, "duplicate"
        if cleaned:
            seen.add(cleaned["email"])
            clean.append(cleaned)
        else:
            rejected.append({"line": line, **row, "reason": reason})
    return clean, rejected


def write_csv(rows, path, fields):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main(in_path, out_dir="out"):
    with open(in_path, newline="") as f:
        rows = list(csv.DictReader(f))
    clean, rejected = clean_rows(rows)
    write_csv(clean, Path(out_dir) / "contacts_clean.csv", ["name", "email", "role"])
    write_csv(rejected, Path(out_dir) / "contacts_rejected.csv", ["line", "name", "email", "role", "reason"])
    print(f"{len(rows)} rows: {len(clean)} ready to import, {len(rejected)} rejected.")
    for r in rejected:
        print(f"  line {r['line']}: {r['reason']}: {r['email']!r}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python lesson15/clean_import.py <csv file>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
