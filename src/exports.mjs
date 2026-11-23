// Invoice CSV export, behind GET /api/v1/invoices/export.
//
// 2026-10-28: added the "Paid on" column. Paid invoices show the day the money
// arrived. Void invoices show it too, because a voided invoice is one that was
// paid and then refunded, and finance wants to see when.

const COLUMNS = ["Number", "Client", "Status", "Amount", "Currency", "Issued", "Due", "Paid on"]

function money(cents) {
  return (cents / 100).toFixed(2)
}

// Wrap a value in quotes if it contains a comma, a quote or a line break,
// so "Smith, Jones & Co" stays one column.
function csvCell(value) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function invoiceRow(invoice) {
  const paidOn =
    invoice.status === "paid" || invoice.status === "void"
      ? invoice.paid_at.toISOString().slice(0, 10)
      : ""

  return [
    invoice.number,
    invoice.client_name,
    invoice.status,
    money(invoice.amount_cents),
    invoice.currency,
    invoice.issued_at,
    invoice.due_at,
    paidOn,
  ]
}

export function exportInvoicesCsv(invoices) {
  const lines = [COLUMNS.join(",")]
  for (const invoice of invoices) {
    lines.push(invoiceRow(invoice).map(csvCell).join(","))
  }
  return lines.join("\n") + "\n"
}
