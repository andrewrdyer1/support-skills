"""Overdue invoice report, from the Paperkite API.

Fetches every overdue invoice for the account that owns the API key (all pages),
works out how many days overdue each one is, prints a summary and saves a CSV a
customer success manager can use to plan follow-ups.

Set your key first:   export PAPERKITE_API_KEY=pk_test_harbor_reporting_7d2f
Run it:               python lesson13/overdue_report.py
Test it:              python -m pytest lesson13
"""
import csv
import os
import sys
import time
from datetime import date
from pathlib import Path

import requests

API = os.environ.get("PAPERKITE_API", "http://localhost:4747")

# Worth retrying: rate limits and server-side failures, which are often temporary.
# Not worth retrying: every other 4xx. The request itself is wrong, and sending it
# again will get the same answer.
RETRY_STATUSES = {429, 500, 502, 503, 504}


class ApiError(Exception):
    """The API refused the request in a way that retrying won't fix."""


def make_session(api_key):
    """A requests Session that sends the API key with every request."""
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {api_key}"
    return session


def error_message(response):
    """The API's own error message from a response, or the start of the raw body."""
    try:
        return response.json()["error"]["message"]
    except (ValueError, KeyError, TypeError):
        return response.text[:200]


def request_with_retry(session, method, url, params=None, json=None, max_tries=3, sleep=time.sleep):
    """Send a request and return the response if it succeeds (status below 400).

    Retry statuses in RETRY_STATUSES, up to max_tries attempts in total. Before
    retrying, wait the number of seconds in the Retry-After header if there is
    one, otherwise 2 ** attempt seconds (2, then 4...).

    For any other failure, or when out of tries, raise ApiError with the status
    and the API's error message.

    `sleep` is a parameter so tests can pass a fake one and not actually wait.
    """
    # TODO: loop attempt from 1 to max_tries: for attempt in range(1, max_tries + 1):
    #   send it:  response = session.request(method, url, params=params, json=json, timeout=10)
    #   success (status below 400)?  return it
    #   retryable status and attempts left?  sleep(...) then continue
    #   otherwise:  raise ApiError(f"{response.status_code} from {method} {url}: {error_message(response)}")
    pass


def fetch_all(session, path, params=None, page_size=100, sleep=time.sleep):
    """GET every page of a Paperkite list endpoint and return all the items in one list.

    Send `limit` (page_size) and `page` (starting at 1) along with any other
    params. Keep asking for the next page while the response says has_more.
    """
    items = []
    page = 1
    # TODO: loop forever (while True:), and each time:
    #   build the query: {**(params or {}), "limit": page_size, "page": page}
    #   body = request_with_retry(session, "GET", API + path, params=query, sleep=sleep).json()
    #   add body["data"] to items; return items if not body["has_more"]; otherwise page += 1
    return items


def days_overdue(due_at, today):
    """Whole days between a due date ('YYYY-MM-DD') and today (a date)."""
    # TODO: date.fromisoformat("2026-10-09") turns text into a date.
    # Subtracting two dates gives a timedelta, which has .days
    pass


def build_rows(invoices, today):
    """Turn API invoices into report rows, most overdue first.

    Each row is a dict with: number, client, amount (dollars, as a string with
    2 decimals like "1521.99"), currency, due_at, days_overdue.
    """
    # TODO: one dict per invoice (the API's fields are number, client_name,
    # amount_cents, currency, due_at), then sort by days_overdue, biggest first.
    pass


def write_report(rows, path):
    """Write the rows to a CSV file with a header, creating the folder if needed."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["number", "client", "amount", "currency", "due_at", "days_overdue"]
    # TODO: like Lesson 12's write_csv, but with csv.DictWriter(f, fieldnames=fields),
    # .writeheader() and .writerows(rows), because each row is a dict.


def main(today=None, out_dir="out"):
    """Run the report. Returns an exit code: 0 worked, 1 the API failed, 2 setup problem."""
    api_key = os.environ.get("PAPERKITE_API_KEY")
    if not api_key:
        print("Set PAPERKITE_API_KEY first, e.g.  export PAPERKITE_API_KEY=pk_test_...", file=sys.stderr)
        return 2

    session = make_session(api_key)
    try:
        invoices = fetch_all(session, "/api/v1/invoices", {"status": "overdue"})
    except ApiError as e:
        print(f"Couldn't fetch invoices: {e}", file=sys.stderr)
        return 1
    except requests.ConnectionError:
        print(f"Can't reach the API at {API}. Is the course server running (npm start)?", file=sys.stderr)
        return 1

    rows = build_rows(invoices, today or date.today())
    if not rows:
        print("No overdue invoices.")
        return 0

    total = sum(float(r["amount"]) for r in rows)
    oldest = rows[0]
    print(f"{len(rows)} overdue invoices, {total:,.2f} {oldest['currency']} in total.")
    print(f"Oldest: {oldest['number']} ({oldest['client']}), {oldest['days_overdue']} days overdue.")

    out = Path(out_dir) / "overdue.csv"
    write_report(rows, out)
    print(f"Saved {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
