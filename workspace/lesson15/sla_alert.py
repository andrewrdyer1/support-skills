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
    raise NotImplementedError("TODO")


def fetch_active_tickets(token):
    """Every open or pending ticket from the help desk API (all pages)."""
    raise NotImplementedError("TODO")


def breaches(tickets, now):
    """Tickets past their target with no reply, oldest first.

    Each result is the ticket dict plus "hours_waiting" (a float, 1 decimal).
    Only priorities in TARGET_HOURS count.
    """
    raise NotImplementedError("TODO")


def format_alert(found):
    """The Slack message. Empty string when there's nothing to report."""
    raise NotImplementedError("TODO")


def main(now=NOW):
    """Read HELPDESK_TOKEN from the environment (return 2 with a message if missing),
    fetch active tickets, and print the alert. Return 1 if there are breaches, so a
    scheduler can alert on it; otherwise print an all-clear and return 0."""
    raise NotImplementedError("TODO")


if __name__ == "__main__":
    sys.exit(main())
