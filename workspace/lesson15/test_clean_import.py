from pathlib import Path

from clean_import import clean_email, clean_row, clean_rows, main, name_from_email

DATA = Path(__file__).parent.parent / "data" / "contacts_import.csv"
CLEAN_COUNT = 46
REJECTED_COUNT = 12


def test_clean_email():
    assert clean_email("  Ruth.Ueda@CopperStudio.com ") == "ruth.ueda@copperstudio.com"
    for bad in ["", "pat.doyle@copperstudio", "sam.quist.copperstudio.com", "lee moreau@copperstudio.com", "ana.silva@@copperstudio.com", "@copperstudio.com"]:
        assert clean_email(bad) is None, f"{bad!r} should be rejected"


def test_name_from_email():
    assert name_from_email("ruth.ueda@copperstudio.com") == "Ruth Ueda"
    assert name_from_email("kai@gmail.com") == "Kai"


def test_clean_row_good_and_bad():
    assert clean_row({"name": " Theo Yilmaz ", "email": "THEO@X.COM", "role": "MEMBER"}) == ({"name": "Theo Yilmaz", "email": "theo@x.com", "role": "member"}, None)
    assert clean_row({"name": "", "email": "ruth.ueda@x.com", "role": "admin"}) == ({"name": "Ruth Ueda", "email": "ruth.ueda@x.com", "role": "admin"}, None)
    assert clean_row({"name": "Jo", "email": "jo@x", "role": "admin"}) == (None, "invalid email")
    assert clean_row({"name": "Jo", "email": "jo@x.com", "role": "owner"}) == (None, "unknown role")


def test_clean_rows_rejects_duplicates_and_numbers_lines():
    rows = [
        {"name": "A", "email": "a@x.com", "role": "member"},
        {"name": "A again", "email": " A@X.COM", "role": "member"},
        {"name": "B", "email": "nope", "role": "member"},
    ]
    clean, rejected = clean_rows(rows)
    assert [c["email"] for c in clean] == ["a@x.com"]
    assert [(r["line"], r["reason"]) for r in rejected] == [(3, "duplicate"), (4, "invalid email")]
    assert rejected[0]["email"] == " A@X.COM", "rejected rows should keep the original values"


def test_real_file(tmp_path, capsys):
    assert main(DATA, out_dir=tmp_path) == 0
    clean = (tmp_path / "contacts_clean.csv").read_text().splitlines()
    rejected = (tmp_path / "contacts_rejected.csv").read_text().splitlines()
    assert clean[0] == "name,email,role"
    assert rejected[0] == "line,name,email,role,reason"
    assert len(clean) - 1 == CLEAN_COUNT
    assert len(rejected) - 1 == REJECTED_COUNT
    emails = [line.split(",")[1] for line in clean[1:]]
    assert len(emails) == len(set(emails)), "clean file has a duplicate email"
    assert all(e == e.lower() for e in emails)
