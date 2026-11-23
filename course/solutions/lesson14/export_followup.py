"""Bulk follow-up for the October 28 export incident.

Finds every open or pending ticket about the broken CSV export, posts one
public reply explaining the workaround, tags the ticket, and sets it to pending.

Safe by design:
  - --dry-run shows exactly what would happen and changes nothing.
  - It asks for confirmation before changing anything (skip with --yes).
  - Running it twice is harmless: tickets that already have the tag are skipped.
  - One ticket failing doesn't stop the rest; failures are listed at the end.

Set the token:  export HELPDESK_TOKEN=hd_test_support_team
Try it:         python lesson14/export_followup.py --dry-run
Test it:        python -m pytest lesson14
"""
import argparse
import os
import sys

import requests

API = os.environ.get("PAPERKITE_API", "http://localhost:4747")
SEARCH_TERMS = ["export", "download"]
ACTIVE_STATUSES = "open,pending"
DEFAULT_TAG = "export-bug-oct28"

REPLY = """Hi {account} team,

Thanks for your patience with the CSV export. We found the cause: a change we made on
October 28 breaks the export when an account has a voided invoice that was never paid.
It's a bug on our side, and the fix is on its way.

Until then, you can export in two parts with a date range that skips the day of that
voided invoice. Reply here and we'll send the exact dates to use for your account.

We'll update this ticket as soon as the fix is live.
"""


class HelpdeskError(Exception):
    """The help desk API refused a request."""


class HelpdeskClient:
    """A small wrapper around the help desk API, so the rest of the script never
    deals with URLs, headers or status codes."""

    def __init__(self, token, base=API, session=None):
        self.base = base
        self.session = session or requests.Session()
        self.session.headers["Authorization"] = f"Bearer {token}"

    def _call(self, method, path, **kwargs):
        response = self.session.request(method, self.base + path, timeout=10, **kwargs)
        if response.status_code >= 400:
            try:
                message = response.json()["error"]["message"]
            except (ValueError, KeyError, TypeError):
                message = response.text[:200]
            raise HelpdeskError(f"{response.status_code} from {method} {path}: {message}")
        return response.json()

    def search(self, q, status):
        """Every ticket whose subject contains q, with one of the given statuses (all pages)."""
        tickets = []
        page = 1
        while True:
            body = self._call("GET", "/api/v1/helpdesk/tickets", params={"q": q, "status": status, "limit": 100, "page": page})
            tickets.extend(body["data"])
            if not body["has_more"]:
                return tickets
            page += 1

    def add_comment(self, ticket_id, body, public=True):
        return self._call("POST", f"/api/v1/helpdesk/tickets/{ticket_id}/comments", json={"body": body, "public": public})

    def update(self, ticket_id, status=None, add_tags=None):
        changes = {}
        if status:
            changes["status"] = status
        if add_tags:
            changes["add_tags"] = add_tags
        return self._call("PATCH", f"/api/v1/helpdesk/tickets/{ticket_id}", json=changes)


def find_tickets(client, terms, statuses):
    """Search for each term and combine the results.

    A ticket that matches more than one term must appear only once. Return the
    tickets sorted by id.
    """
    found = {}
    for term in terms:
        for ticket in client.search(term, statuses):
            found[ticket["id"]] = ticket
    return [found[i] for i in sorted(found)]


def reply_for(ticket):
    """The reply text for one ticket, addressed to its account."""
    return REPLY.format(account=ticket["account_name"])


def follow_up(client, tickets, tag, new_status="pending", dry_run=False, log=print):
    """Reply to, tag, and update each ticket that doesn't already have the tag.

    For each ticket:
      - already tagged: skip it (this is what makes re-running safe)
      - dry run: log what would happen, change nothing
      - otherwise: post the reply, then add the tag and set the status in one update

    If one ticket fails, record it and carry on with the rest.
    Return a dict: {"done": [ids], "skipped": [ids], "failed": [(id, message)]}.
    """
    result = {"done": [], "skipped": [], "failed": []}
    for ticket in tickets:
        tid = ticket["id"]
        if tag in ticket["tags"]:
            log(f"#{tid}: already tagged {tag}, skipping")
            result["skipped"].append(tid)
            continue
        if dry_run:
            log(f"#{tid}: would reply, tag {tag}, set {new_status}  ({ticket['account_name']}: {ticket['subject']})")
            result["done"].append(tid)
            continue
        try:
            client.add_comment(tid, reply_for(ticket))
            client.update(tid, status=new_status, add_tags=[tag])
            log(f"#{tid}: replied, tagged {tag}, set {new_status}")
            result["done"].append(tid)
        except HelpdeskError as e:
            log(f"#{tid}: FAILED: {e}")
            result["failed"].append((tid, str(e)))
    return result


def parse_args(argv):
    parser = argparse.ArgumentParser(description="Follow up on every open ticket about the Oct 28 export bug.")
    parser.add_argument("--dry-run", action="store_true", help="show what would happen without changing anything")
    parser.add_argument("--yes", action="store_true", help="don't ask for confirmation")
    parser.add_argument("--tag", default=DEFAULT_TAG, help=f"tag to add (default: {DEFAULT_TAG})")
    parser.add_argument("--status", default="pending", choices=["open", "pending", "solved"], help="status to set (default: pending)")
    return parser.parse_args(argv)


def main(argv=None, client=None, confirm=input):
    """Returns an exit code: 0 all good, 1 something failed or was canceled, 2 setup problem."""
    args = parse_args(argv)

    if client is None:
        token = os.environ.get("HELPDESK_TOKEN")
        if not token:
            print("Set HELPDESK_TOKEN first, e.g.  export HELPDESK_TOKEN=hd_test_...", file=sys.stderr)
            return 2
        client = HelpdeskClient(token)

    tickets = find_tickets(client, SEARCH_TERMS, ACTIVE_STATUSES)
    todo = [t for t in tickets if args.tag not in t["tags"]]
    print(f"Found {len(tickets)} active export tickets; {len(todo)} need a follow-up.")

    if todo and not args.dry_run and not args.yes:
        answer = confirm(f"Reply to, tag and update {len(todo)} tickets? Type yes to continue: ")
        if answer.strip().lower() != "yes":
            print("Canceled. Nothing was changed.")
            return 1

    result = follow_up(client, tickets, args.tag, args.status, dry_run=args.dry_run)

    verb = "Would update" if args.dry_run else "Updated"
    print(f"\n{verb} {len(result['done'])}, skipped {len(result['skipped'])}, failed {len(result['failed'])}.")
    for tid, message in result["failed"]:
        print(f"  #{tid}: {message}")
    return 1 if result["failed"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
