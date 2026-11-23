"""Case D: response-time alert.

Checks the help desk for urgent and high priority tickets that are still open or
pending, have had no reply at all, and have waited longer than their target:
urgent 1 hour, high 4 hours. Prints a message ready to paste into Slack, and
exits with code 1 if there are any, so a scheduler can alert on it.

Run:   python lesson15/sla_alert.py
Test:  python -m pytest lesson15/test_sla_alert.py
"""
import os
import sys
from datetime import datetime, timezone

import requests

API = os.environ.get("PAPERKITE_API", "http://localhost:4747")
TARGET_HOURS = {"urgent": 1, "high": 4}
NOW = datetime(2026, 10, 30, 17, 0, tzinfo=timezone.utc)  # "now" in Paperkite's world


def parse_time(text):
    """'2026-10-29T13:21:13.325Z' -> a timezone-aware datetime."""
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


def fetch_active_tickets(token):
    """Every open or pending ticket from the help desk API (all pages)."""
    tickets, page = [], 1
    headers = {"Authorization": f"Bearer {token}"}
    while True:
        r = requests.get(f"{API}/api/v1/helpdesk/tickets", headers=headers,
                         params={"status": "open,pending", "limit": 100, "page": page}, timeout=10)
        r.raise_for_status()
        body = r.json()
        tickets.extend(body["data"])
        if not body["has_more"]:
            return tickets
        page += 1


def breaches(tickets, now):
    """Tickets past their target with no reply, oldest first.

    Each result is the ticket dict plus "hours_waiting" (a float, 1 decimal).
    Only priorities in TARGET_HOURS count.
    """
    found = []
    for t in tickets:
        target = TARGET_HOURS.get(t["priority"])
        if target is None or t.get("first_response_at"):
            continue
        hours = (now - parse_time(t["created_at"])).total_seconds() / 3600
        if hours > target:
            found.append({**t, "hours_waiting": round(hours, 1)})
    return sorted(found, key=lambda t: t["hours_waiting"], reverse=True)


def format_alert(found):
    """The Slack message. Empty string when there's nothing to report."""
    if not found:
        return ""
    lines = [f":rotating_light: {len(found)} ticket{'s' if len(found) != 1 else ''} past the reply target with no response:"]
    for t in found:
        lines.append(f"• #{t['id']} [{t['priority']}] {t['account_name']}: {t['subject']} ({t['hours_waiting']}h waiting)")
    return "\n".join(lines)


def main(now=NOW):
    token = os.environ.get("HELPDESK_TOKEN")
    if not token:
        print("Set HELPDESK_TOKEN first.", file=sys.stderr)
        return 2
    message = format_alert(breaches(fetch_active_tickets(token), now))
    if not message:
        print("All urgent and high tickets have a reply or are within target.")
        return 0
    print(message)
    return 1


if __name__ == "__main__":
    sys.exit(main())
