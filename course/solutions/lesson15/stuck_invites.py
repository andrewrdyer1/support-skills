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
select a.name as account, o.email as owner_email, u.email, u.created_at
from users u
join accounts a on a.id = u.account_id
join users o on o.account_id = a.id and o.role = 'owner'
where u.role <> 'owner'
  and u.last_login_at is null
  and u.created_at <= %s
  and a.status in ('active', 'trialing')
order by a.name, u.email
"""


def domain(email):
    """The part after the @, lowercased."""
    return email.split("@")[-1].lower()


def looks_like_typo(email, owner_email):
    """True when the invite went to a different domain than the owner's."""
    return domain(email) != domain(owner_email)


def fetch_stuck_invites(conn, today):
    """Rows for every stuck invite as of `today`, each a dict with account,
    owner_email, email, invited (a 'YYYY-MM-DD' string) and possible_typo."""
    cutoff = today - timedelta(days=7)
    with conn.cursor() as cur:
        cur.execute(QUERY, (cutoff,))
        rows = cur.fetchall()
    return [
        {
            "account": account,
            "owner_email": owner_email,
            "email": email,
            "invited": created_at.date().isoformat(),
            "possible_typo": looks_like_typo(email, owner_email),
        }
        for account, owner_email, email, created_at in rows
    ]


def write_csv(rows, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["account", "owner_email", "email", "invited", "possible_typo"])
        writer.writeheader()
        writer.writerows(rows)


def main(today=date(2026, 10, 30), out_dir="out"):
    with psycopg.connect(DATABASE_URL) as conn:
        rows = fetch_stuck_invites(conn, today)
    typos = [r for r in rows if r["possible_typo"]]
    print(f"{len(rows)} invites not accepted after 7 days. Possible typos: {len(typos)}")
    for r in typos:
        print(f"  {r['account']}: {r['email']} (owner is {r['owner_email']})")
    write_csv(rows, Path(out_dir) / "stuck_invites.csv")
    return 0


if __name__ == "__main__":
    sys.exit(main())
