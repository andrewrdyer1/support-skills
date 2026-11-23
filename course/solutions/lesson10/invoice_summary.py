"""Lesson 10: your first real script. (Finished version.)

Maya's export (data/harbor_invoices.csv) has one row per invoice. This script
prints a short summary of it, like this:

    44 invoices
      paid        36
      overdue      6
      sent         1
      void         1
    Outstanding (sent + overdue): $15,993.50
    Biggest unpaid: INV-0044, Lakeshore Group, $4,171.00

Run it from the workspace folder:   python lesson10/invoice_summary.py data/harbor_invoices.csv
"""
import csv
import sys


def read_invoices(path):
    """Return the CSV's rows as a list of dicts."""
    with open(path) as f:
        return list(csv.DictReader(f))


def count_by_status(invoices):
    """Return a dict like {"paid": 36, "overdue": 6, ...}."""
    counts = {}
    for invoice in invoices:
        status = invoice["Status"]
        counts[status] = counts.get(status, 0) + 1
    return counts


def unpaid(invoices):
    """Return only the invoices whose Status is sent or overdue."""
    result = []
    for invoice in invoices:
        if invoice["Status"] in ("sent", "overdue"):
            result.append(invoice)
    return result


def total(invoices):
    """Add up the Amount column. Remember: values from a CSV are text."""
    amount = 0
    for invoice in invoices:
        amount += float(invoice["Amount"])
    return amount


def main():
    if len(sys.argv) != 2:
        print("Usage: python lesson10/invoice_summary.py <csv file>")
        return 1

    invoices = read_invoices(sys.argv[1])
    print(f"{len(invoices)} invoices")

    counts = count_by_status(invoices)
    # Most common status first; ties in alphabetical order.
    for status, n in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        print(f"  {status:<10} {n:>3}")

    owed = unpaid(invoices)
    print(f"Outstanding (sent + overdue): ${total(owed):,.2f}")
    if owed:
        biggest = max(owed, key=lambda row: float(row["Amount"]))
        print(f"Biggest unpaid: {biggest['Number']}, {biggest['Client']}, ${float(biggest['Amount']):,.2f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
