# Paperkite changelog

## 2026.10.28.1 (deployed 2026-10-28 15:02 UTC)

- exports: add a "Paid on" column to the invoice CSV export. Shows the date money
  arrived for paid invoices, and for void invoices (refunds).
- reminders: fix weekly reminders being sent twice.

## 2026.10.21.2 (deployed 2026-10-21 16:40 UTC)

- dashboard: faster totals query.

## 2026.10.14.1

- api: `GET /api/v1/invoices` accepts `status=overdue`.
