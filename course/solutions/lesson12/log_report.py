"""Log triage report.

Reads Paperkite's request log (one JSON object per line) and answers the
questions an on-call support engineer asks first:

  - How many requests were there, and how many failed?
  - Which endpoints are failing, with which status codes?
  - Which accounts are hitting a given error most?

Run it from the workspace folder:   python lesson12/log_report.py data/history.log
Test it:                            python -m pytest lesson12
"""
import csv
import json
import sys
from collections import Counter
from pathlib import Path


def parse_line(line):
    """Turn one log line into a dict.

    Return None for blank lines and for lines that aren't valid JSON, so one
    bad line can't stop the whole report.
    """
    line = line.strip()
    if not line:
        return None
    try:
        return json.loads(line)
    except json.JSONDecodeError:
        return None


def read_requests(path):
    """Read a log file and return a list of request entries.

    A request entry is a dict with a "status" key. Skip blank and broken lines,
    and skip other events (like deploys) that have no status.
    """
    entries = []
    with open(path) as f:
        for line in f:
            entry = parse_line(line)
            if entry is not None and "status" in entry:
                entries.append(entry)
    return entries


def normalize_path(path):
    """Group individual invoices together, so the report counts them as one endpoint.

    /api/v1/invoices/123 becomes /api/v1/invoices/:id. Every other path comes
    back unchanged, including /api/v1/invoices/export.
    """
    prefix = "/api/v1/invoices/"
    if path.startswith(prefix) and path[len(prefix):].isdigit():
        return prefix + ":id"
    return path


def failures_by_endpoint(entries):
    """Count failed requests (status 400 or higher) by endpoint and status.

    Return a list of (path, status, count) tuples, biggest count first. Use
    normalize_path so every single-invoice URL counts as one endpoint.
    """
    counts = Counter(
        (normalize_path(e["path"]), e["status"]) for e in entries if e["status"] >= 400
    )
    return [(path, status, count) for (path, status), count in counts.most_common()]


def top_accounts(entries, status, n=5):
    """The n accounts with the most requests of one status code.

    Return (account_id, count) tuples, biggest count first.
    """
    counts = Counter(e["account_id"] for e in entries if e["status"] == status)
    return counts.most_common(n)


def write_csv(rows, path, header):
    """Write rows (a list of tuples) to a CSV file, with a header row first.

    Create the folder if it doesn't exist yet.
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


def main(log_path, out_dir="out"):
    """Print the report and save the failures table as a CSV. Returns 0 on success."""
    entries = read_requests(log_path)
    failed = [e for e in entries if e["status"] >= 400]
    print(f"{len(entries)} requests, {len(failed)} failed ({100 * len(failed) / len(entries):.1f}%)")

    print("\nFailures by endpoint:")
    failures = failures_by_endpoint(entries)
    for path, status, count in failures:
        print(f"  {count:>5}  {status}  {path}")

    print("\nAccounts with the most 500s:")
    for account_id, count in top_accounts(entries, 500):
        print(f"  account {account_id}: {count}")

    out = Path(out_dir) / "failures.csv"
    write_csv(failures, out, ["path", "status", "count"])
    print(f"\nSaved {out}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python lesson12/log_report.py <log file>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
