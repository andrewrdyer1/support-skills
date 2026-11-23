from datetime import date

import psycopg
import pytest

from stuck_invites import DATABASE_URL, domain, fetch_stuck_invites, looks_like_typo, main

TODAY = date(2026, 10, 30)


def test_domain():
    assert domain("Priya.Shah@HarborAndPine.com") == "harborandpine.com"


def test_looks_like_typo():
    assert looks_like_typo("sam@harborandpine.co", "maya@harborandpine.com") is True
    assert looks_like_typo("tom@harborandpine.com", "maya@harborandpine.com") is False
    assert looks_like_typo("Priya.Shah@HarborAndPine.com", "maya@harborandpine.com") is False


@pytest.fixture
def conn():
    with psycopg.connect(DATABASE_URL) as c:
        yield c


def test_finds_sam_and_flags_the_typo(conn):
    rows = fetch_stuck_invites(conn, TODAY)
    sam = [r for r in rows if r["email"] == "sam@harborandpine.co"]
    assert sam == [{
        "account": "Harbor & Pine Bakery",
        "owner_email": "maya@harborandpine.com",
        "email": "sam@harborandpine.co",
        "invited": "2026-10-20",
        "possible_typo": True,
    }]


def test_counts_match_the_spec(conn):
    rows = fetch_stuck_invites(conn, TODAY)
    assert len(rows) == 47
    assert sum(r["possible_typo"] for r in rows) == 1


def test_seven_day_cutoff(conn):
    # On Oct 26, Sam's invite was only 6 days old, so he isn't stuck yet.
    assert not any(r["email"] == "sam@harborandpine.co" for r in fetch_stuck_invites(conn, date(2026, 10, 26)))


def test_sorted_by_account_then_email(conn):
    rows = fetch_stuck_invites(conn, TODAY)
    assert rows == sorted(rows, key=lambda r: (r["account"], r["email"]))


def test_main_writes_the_csv(tmp_path, capsys):
    assert main(TODAY, out_dir=tmp_path) == 0
    assert (tmp_path / "stuck_invites.csv").read_text().count("\n") == 48  # header + 47
    assert "sam@harborandpine.co" in capsys.readouterr().out
