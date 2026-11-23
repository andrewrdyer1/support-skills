"""Tests for export_followup.py. Run from the workspace folder:  python -m pytest lesson14

Almost every test uses FakeHelpdesk: an in-memory help desk with the same
methods as HelpdeskClient (search, add_comment, update). Because the script's
functions take the client as a parameter, the tests can hand them this fake and
check exactly what the script did, without touching the real help desk.

That matters most for a script that changes data: you want to know it behaves
before it ever runs for real.
"""
import pytest
import requests

import export_followup
from export_followup import HelpdeskClient, HelpdeskError, find_tickets, follow_up, main, reply_for

TAG = "export-bug-oct28"


def ticket(id, subject, status="open", tags=None, account="Acme Co"):
    return {"id": id, "subject": subject, "status": status, "tags": list(tags or []), "account_name": account}


class FakeHelpdesk:
    """An in-memory help desk. `fail_on` lists ticket ids whose updates should fail."""

    def __init__(self, tickets, fail_on=()):
        self.tickets = {t["id"]: t for t in tickets}
        self.comments = {t["id"]: [] for t in tickets}
        self.searches = []
        self.fail_on = set(fail_on)

    def search(self, q, status):
        self.searches.append((q, status))
        allowed = status.split(",")
        return [dict(t, tags=list(t["tags"])) for t in self.tickets.values()
                if q.lower() in t["subject"].lower() and t["status"] in allowed]

    def add_comment(self, ticket_id, body, public=True):
        if ticket_id in self.fail_on:
            raise HelpdeskError(f"500 from POST /tickets/{ticket_id}/comments: Something went wrong")
        self.comments[ticket_id].append({"body": body, "public": public})

    def update(self, ticket_id, status=None, add_tags=None):
        t = self.tickets[ticket_id]
        if status:
            t["status"] = status
        for tag in add_tags or []:
            if tag not in t["tags"]:
                t["tags"].append(tag)


def sample():
    return FakeHelpdesk([
        ticket(1, "CSV export says Something went wrong", account="Harbor & Pine Bakery"),
        ticket(2, "Export to CSV broken?"),
        ticket(3, "Can't download my invoices", status="pending"),
        ticket(4, "Export and download both fail"),        # matches both terms
        ticket(5, "Export question", status="solved"),       # not active
        ticket(6, "How do I add my logo"),                   # not about exports
    ])


def quiet(_message):
    pass


# ---------- find_tickets ----------

def test_find_tickets_combines_terms_without_duplicates():
    desk = sample()
    found = find_tickets(desk, ["export", "download"], "open,pending")
    assert [t["id"] for t in found] == [1, 2, 3, 4]


def test_find_tickets_searches_each_term_with_the_statuses():
    desk = sample()
    find_tickets(desk, ["export", "download"], "open,pending")
    assert desk.searches == [("export", "open,pending"), ("download", "open,pending")]


# ---------- reply_for ----------

def test_reply_is_addressed_to_the_account():
    text = reply_for(ticket(1, "x", account="Harbor & Pine Bakery"))
    assert text.startswith("Hi Harbor & Pine Bakery team,")
    assert "October 28" in text


# ---------- follow_up ----------

def test_dry_run_changes_nothing():
    desk = sample()
    tickets = find_tickets(desk, ["export", "download"], "open,pending")
    messages = []
    result = follow_up(desk, tickets, TAG, dry_run=True, log=messages.append)
    assert result["done"] == [1, 2, 3, 4]
    assert all(c == [] for c in desk.comments.values()), "a dry run posted a comment"
    assert all(TAG not in t["tags"] for t in desk.tickets.values()), "a dry run added a tag"
    assert all("would" in m for m in messages), "dry-run log lines should say what WOULD happen"


def test_follow_up_replies_tags_and_sets_pending():
    desk = sample()
    tickets = find_tickets(desk, ["export", "download"], "open,pending")
    result = follow_up(desk, tickets, TAG, log=quiet)
    assert result == {"done": [1, 2, 3, 4], "skipped": [], "failed": []}
    for tid in [1, 2, 3, 4]:
        assert len(desk.comments[tid]) == 1
        assert desk.comments[tid][0]["public"] is True
        assert TAG in desk.tickets[tid]["tags"]
        assert desk.tickets[tid]["status"] == "pending"
    assert desk.comments[6] == [] and desk.tickets[6]["tags"] == []


def test_running_twice_does_not_reply_twice():
    desk = sample()
    follow_up(desk, find_tickets(desk, ["export", "download"], "open,pending"), TAG, log=quiet)
    second = follow_up(desk, find_tickets(desk, ["export", "download"], "open,pending"), TAG, log=quiet)
    assert second["done"] == []
    assert second["skipped"] == [1, 2, 3, 4]
    assert all(len(desk.comments[tid]) == 1 for tid in [1, 2, 3, 4])


def test_one_failure_does_not_stop_the_rest():
    desk = FakeHelpdesk(sample().tickets.values(), fail_on={2})
    result = follow_up(desk, find_tickets(desk, ["export", "download"], "open,pending"), TAG, log=quiet)
    assert result["done"] == [1, 3, 4]
    assert [tid for tid, _ in result["failed"]] == [2]
    assert "500" in result["failed"][0][1]
    assert TAG not in desk.tickets[2]["tags"], "a ticket whose reply failed shouldn't be tagged as done"


# ---------- main ----------

def test_main_dry_run(capsys):
    desk = sample()
    assert main(["--dry-run"], client=desk) == 0
    out = capsys.readouterr().out
    assert "Found 4 active export tickets; 4 need a follow-up." in out
    assert all(c == [] for c in desk.comments.values())


def test_main_asks_first_and_can_be_canceled(capsys):
    desk = sample()
    assert main([], client=desk, confirm=lambda prompt: "no") == 1
    assert all(c == [] for c in desk.comments.values())
    assert "Nothing was changed" in capsys.readouterr().out


def test_main_does_the_work_when_confirmed():
    desk = sample()
    assert main([], client=desk, confirm=lambda prompt: "yes") == 0
    assert all(len(desk.comments[tid]) == 1 for tid in [1, 2, 3, 4])


def test_main_custom_tag():
    desk = sample()
    assert main(["--yes", "--tag", "export-followup-2"], client=desk) == 0
    assert all("export-followup-2" in desk.tickets[tid]["tags"] for tid in [1, 2, 3, 4])


# ---------- the real client, read-only, against your local server ----------

def server_running():
    try:
        return requests.get(export_followup.API + "/api/v1/health", timeout=1).ok
    except requests.ConnectionError:
        return False


@pytest.mark.skipif(not server_running(), reason="course server isn't running (npm start)")
def test_live_search_finds_the_export_tickets():
    client = HelpdeskClient("hd_test_support_team")
    ids = {t["id"] for t in client.search("export", "open,pending,solved")}
    assert {1152, 1154} <= ids


@pytest.mark.skipif(not server_running(), reason="course server isn't running (npm start)")
def test_live_bad_token_raises_helpdesk_error():
    client = HelpdeskClient("hd_wrong")
    with pytest.raises(HelpdeskError) as caught:
        client.search("export", "open")
    assert "401" in str(caught.value)
