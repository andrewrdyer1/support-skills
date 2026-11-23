// The Paperkite public API: everything under /api/v1.
//
// Each handler returns { status, body } (or { status, csv }) and the server in
// server.mjs turns that into the HTTP response and the log line.
import { appDb } from "./db.mjs"
import { authenticate, hasScope } from "./auth.mjs"
import { exportInvoicesCsv } from "./exports.mjs"
import { handleHelpdesk } from "./helpdesk.mjs"

const INVOICE_STATUSES = ["draft", "sent", "overdue", "paid", "void"]
let nextTestInvoiceId = 900001

export async function handleApi(req, url, ctx) {
  const path = url.pathname

  if (path === "/api/v1/health") {
    if (req.method !== "GET") return methodNotAllowed(["GET"])
    return { status: 200, body: { status: "ok" } }
  }

  if (path.startsWith("/api/v1/helpdesk/") || path === "/api/v1/helpdesk") return handleHelpdesk(req, url, ctx)

  const auth = await authenticate(req)
  if (auth.key) {
    ctx.accountId = auth.key.account_id
    ctx.keyLabel = auth.key.label
  }
  if (!auth.ok) return error(auth.status, auth.type, auth.message, auth.headers)
  const key = auth.key

  if (path === "/api/v1/me") {
    if (req.method !== "GET") return methodNotAllowed(["GET"])
    return {
      status: 200,
      body: {
        account: { id: key.account_id, name: key.account_name, plan: key.plan_id, status: key.account_status },
        api_key: { label: key.label, scopes: key.scopes, rate_limit_per_min: key.rate_limit_per_min },
      },
    }
  }

  if (path === "/api/v1/invoices/export") {
    if (req.method !== "GET") return methodNotAllowed(["GET"])
    if (!hasScope(key, "invoices:read")) return missingScope("invoices:read")
    return exportInvoices(key, url)
  }

  if (path === "/api/v1/invoices") {
    if (req.method === "GET") {
      if (!hasScope(key, "invoices:read")) return missingScope("invoices:read")
      return listInvoices(key, url)
    }
    if (req.method === "POST") {
      if (!hasScope(key, "invoices:write")) return missingScope("invoices:write")
      return createInvoice(req, key)
    }
    return methodNotAllowed(["GET", "POST"])
  }

  const one = path.match(/^\/api\/v1\/invoices\/([^/]+)$/)
  if (one) {
    if (req.method !== "GET") return methodNotAllowed(["GET"])
    if (!hasScope(key, "invoices:read")) return missingScope("invoices:read")
    return getInvoice(key, one[1])
  }

  return error(404, "not_found", `No such endpoint: ${req.method} ${path}`)
}

async function listInvoices(key, url) {
  const status = url.searchParams.get("status")
  const limit = Number(url.searchParams.get("limit") ?? 10)
  const page = Number(url.searchParams.get("page") ?? 1)

  if (status && !INVOICE_STATUSES.includes(status)) {
    return error(400, "invalid_request_error", `status must be one of: ${INVOICE_STATUSES.join(", ")}`)
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return error(400, "invalid_request_error", "limit must be a whole number from 1 to 100")
  }
  if (!Number.isInteger(page) || page < 1) {
    return error(400, "invalid_request_error", "page must be a whole number, 1 or more")
  }

  // Ask for one extra row: if it comes back, there is another page.
  const { rows } = await appDb.query(
    `select i.id, i.number, c.name as client_name, i.status, i.amount_cents, i.currency,
            i.issued_at, i.due_at, i.paid_at
       from invoices i
       join clients c on c.id = i.client_id
      where i.account_id = $1
        and ($2::text is null or i.status = $2)
      order by i.issued_at desc, i.id desc
      limit $3 offset $4`,
    [key.account_id, status, limit + 1, (page - 1) * limit],
  )
  return {
    status: 200,
    body: { data: rows.slice(0, limit), page, limit, has_more: rows.length > limit },
  }
}

async function getInvoice(key, rawId) {
  const id = Number(rawId)
  if (!Number.isInteger(id)) return error(404, "not_found", `No invoice with id ${rawId}`)

  // Scoped to the caller's account. Another account's invoice is a 404, not a
  // 403: saying "forbidden" would confirm that the invoice exists.
  const { rows } = await appDb.query(
    `select i.id, i.number, c.name as client_name, i.status, i.amount_cents, i.currency,
            i.issued_at, i.due_at, i.paid_at
       from invoices i
       join clients c on c.id = i.client_id
      where i.id = $1 and i.account_id = $2`,
    [id, key.account_id],
  )
  if (!rows[0]) return error(404, "not_found", `No invoice with id ${rawId}`)
  return { status: 200, body: { data: rows[0] } }
}

async function createInvoice(req, key) {
  const type = req.headers["content-type"] || ""
  if (!type.startsWith("application/json")) {
    return error(415, "invalid_request_error", "Send the body as JSON, with the header Content-Type: application/json")
  }

  let body
  try {
    body = JSON.parse(req.rawBody || "")
  } catch {
    return error(400, "invalid_request_error", "The request body is not valid JSON.")
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return error(400, "invalid_request_error", "The request body must be a JSON object.")
  }

  const fields = {}
  if (!Number.isInteger(body.client_id)) {
    fields.client_id = "required, a whole number"
  } else {
    const { rows } = await appDb.query(`select 1 from clients where id = $1 and account_id = $2`, [
      body.client_id,
      key.account_id,
    ])
    if (!rows[0]) fields.client_id = `no client ${body.client_id} on this account`
  }
  if (!Number.isInteger(body.amount_cents) || body.amount_cents <= 0) {
    fields.amount_cents = "required, a whole number of cents above 0 (1250 means 12.50)"
  }
  if (typeof body.due_at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.due_at)) {
    fields.due_at = "required, a date written YYYY-MM-DD"
  }
  if (Object.keys(fields).length > 0) {
    return {
      status: 422,
      body: { error: { type: "validation_error", message: "Some fields are invalid.", fields } },
    }
  }

  // Test mode: the invoice is checked and echoed back, never saved, so the
  // lesson data stays the same however many you create.
  return {
    status: 201,
    body: {
      data: {
        id: nextTestInvoiceId++,
        status: "draft",
        client_id: body.client_id,
        amount_cents: body.amount_cents,
        currency: body.currency || "USD",
        due_at: body.due_at,
      },
      test_mode: true,
    },
  }
}

async function exportInvoices(key, url) {
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  for (const [name, value] of [["from", from], ["to", to]]) {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return error(400, "invalid_request_error", `${name} must be a date written YYYY-MM-DD`)
    }
  }

  const { rows } = await appDb.query(
    `select i.number, c.name as client_name, i.status, i.amount_cents, i.currency,
            i.issued_at, i.due_at, i.paid_at
       from invoices i
       join clients c on c.id = i.client_id
      where i.account_id = $1
        and ($2::date is null or i.issued_at >= $2::date)
        and ($3::date is null or i.issued_at <= $3::date)
      order by i.issued_at, i.id`,
    [key.account_id, from, to],
  )
  return { status: 200, csv: exportInvoicesCsv(rows), rows: rows.length }
}

function missingScope(scope) {
  return error(403, "permission_error", `This API key is missing the ${scope} scope.`)
}

function methodNotAllowed(allowed) {
  return error(405, "invalid_request_error", `Use ${allowed.join(" or ")} here.`, { Allow: allowed.join(", ") })
}

function error(status, type, message, headers = {}) {
  return { status, body: { error: { type, message } }, headers }
}
