// Paperkite's help desk API: everything under /api/v1/helpdesk.
//
// This is the tool the support team itself uses, the way a real team uses the
// Zendesk or Intercom API. Ticket details come from the database; replies,
// tags and status changes are kept in memory, so restarting the server (or
// pressing Reset in Lesson 14) puts every ticket back the way it was.
import { appDb } from "./db.mjs"

export const HELPDESK_TOKEN = "hd_test_support_team"
const STATUSES = ["open", "pending", "solved", "closed"]
const RATE_LIMIT = 120

// ticket id -> { status?, tags: Set, comments: [] }
const changes = new Map()
let nextCommentId = 1
let recent = []

export function resetHelpdesk() {
  changes.clear()
  nextCommentId = 1
  recent = []
}

export function helpdeskState() {
  return [...changes.entries()].map(([id, c]) => ({
    id,
    status: c.status ?? null,
    tags: [...c.tags],
    comments: c.comments,
  }))
}

function changesFor(id) {
  if (!changes.has(id)) changes.set(id, { tags: new Set(), comments: [] })
  return changes.get(id)
}

export async function handleHelpdesk(req, url, ctx) {
  const match = (req.headers["authorization"] || "").match(/^Bearer\s+(\S+)$/i)
  if (!match) return error(401, "authentication_error", "Missing token. Send it as: Authorization: Bearer <token>")
  if (match[1] !== HELPDESK_TOKEN) return error(401, "authentication_error", "Invalid help desk token.")
  ctx.keyLabel = "help desk token"

  const now = Date.now()
  recent = recent.filter((t) => now - t < 60_000)
  if (recent.length >= RATE_LIMIT) {
    return error(429, "rate_limit_error", `Too many requests. The help desk API allows ${RATE_LIMIT} per minute.`, {
      "Retry-After": String(Math.ceil((60_000 - (now - recent[0])) / 1000)),
    })
  }
  recent.push(now)

  const path = url.pathname
  if (path === "/api/v1/helpdesk/tickets") {
    if (req.method !== "GET") return methodNotAllowed(["GET"])
    return listTickets(url)
  }

  const one = path.match(/^\/api\/v1\/helpdesk\/tickets\/(\d+)$/)
  if (one) {
    const id = Number(one[1])
    if (req.method === "GET") return getTicket(id)
    if (req.method === "PATCH") return updateTicket(req, id)
    return methodNotAllowed(["GET", "PATCH"])
  }

  const comments = path.match(/^\/api\/v1\/helpdesk\/tickets\/(\d+)\/comments$/)
  if (comments) {
    if (req.method !== "POST") return methodNotAllowed(["POST"])
    return addComment(req, Number(comments[1]))
  }

  return error(404, "not_found", `No such endpoint: ${req.method} ${path}`)
}

async function loadTickets(where = "true", params = []) {
  const { rows } = await appDb.query(
    `select t.id, t.subject, t.status, t.priority, t.category, u.email as requester_email,
            a.name as account_name, t.account_id, t.created_at, t.first_response_at
       from tickets t
       join users u on u.id = t.requester_id
       join accounts a on a.id = t.account_id
      where ${where}
      order by t.created_at desc, t.id desc`,
    params,
  )
  return rows.map(withChanges)
}

function withChanges(row) {
  const c = changes.get(row.id)
  return {
    ...row,
    status: c?.status ?? row.status,
    tags: c ? [...c.tags] : [],
    comment_count: c ? c.comments.length : 0,
  }
}

async function listTickets(url) {
  const q = url.searchParams.get("q")
  const statusParam = url.searchParams.get("status")
  const tag = url.searchParams.get("tag")
  const limit = Number(url.searchParams.get("limit") ?? 25)
  const page = Number(url.searchParams.get("page") ?? 1)

  const statuses = statusParam ? statusParam.split(",") : null
  if (statuses && statuses.some((s) => !STATUSES.includes(s))) {
    return error(400, "invalid_request_error", `status must be one or more of: ${STATUSES.join(", ")} (comma-separated)`)
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return error(400, "invalid_request_error", "limit must be a whole number from 1 to 100")
  }
  if (!Number.isInteger(page) || page < 1) {
    return error(400, "invalid_request_error", "page must be a whole number, 1 or more")
  }

  // The search matches the subject, ignoring capital letters, like ilike.
  let tickets = q ? await loadTickets("t.subject ilike $1", [`%${q}%`]) : await loadTickets()
  if (statuses) tickets = tickets.filter((t) => statuses.includes(t.status))
  if (tag) tickets = tickets.filter((t) => t.tags.includes(tag))

  const start = (page - 1) * limit
  return {
    status: 200,
    body: { data: tickets.slice(start, start + limit), page, limit, total: tickets.length, has_more: start + limit < tickets.length },
  }
}

async function getTicket(id) {
  const [ticket] = await loadTickets("t.id = $1", [id])
  if (!ticket) return error(404, "not_found", `No ticket with id ${id}`)
  return { status: 200, body: { data: { ...ticket, comments: changes.get(id)?.comments ?? [] } } }
}

function readJson(req) {
  const type = req.headers["content-type"] || ""
  if (!type.startsWith("application/json")) {
    return { fail: error(415, "invalid_request_error", "Send the body as JSON, with the header Content-Type: application/json") }
  }
  try {
    const body = JSON.parse(req.rawBody || "")
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error()
    return { body }
  } catch {
    return { fail: error(400, "invalid_request_error", "The request body must be a JSON object.") }
  }
}

async function addComment(req, id) {
  const { body, fail } = readJson(req)
  if (fail) return fail
  const [ticket] = await loadTickets("t.id = $1", [id])
  if (!ticket) return error(404, "not_found", `No ticket with id ${id}`)

  if (typeof body.body !== "string" || !body.body.trim()) {
    return { status: 422, body: { error: { type: "validation_error", message: "Some fields are invalid.", fields: { body: "required, the text of the reply" } } } }
  }
  if (body.public !== undefined && typeof body.public !== "boolean") {
    return { status: 422, body: { error: { type: "validation_error", message: "Some fields are invalid.", fields: { public: "true (the customer sees it) or false (an internal note)" } } } }
  }

  const comment = { id: nextCommentId++, body: body.body, public: body.public ?? true, created_at: new Date().toISOString() }
  changesFor(id).comments.push(comment)
  return { status: 201, body: { data: comment } }
}

async function updateTicket(req, id) {
  const { body, fail } = readJson(req)
  if (fail) return fail
  const [ticket] = await loadTickets("t.id = $1", [id])
  if (!ticket) return error(404, "not_found", `No ticket with id ${id}`)

  const fields = {}
  if (body.status !== undefined && !STATUSES.includes(body.status)) fields.status = `one of: ${STATUSES.join(", ")}`
  for (const name of ["add_tags", "remove_tags"]) {
    const v = body[name]
    if (v !== undefined && (!Array.isArray(v) || v.some((t) => typeof t !== "string" || !/^[a-z0-9-]+$/.test(t)))) {
      fields[name] = "a list of tags, each lowercase letters, numbers and dashes"
    }
  }
  if (Object.keys(fields).length) return { status: 422, body: { error: { type: "validation_error", message: "Some fields are invalid.", fields } } }

  const c = changesFor(id)
  if (body.status) c.status = body.status
  for (const t of body.add_tags || []) c.tags.add(t)
  for (const t of body.remove_tags || []) c.tags.delete(t)
  return getTicket(id)
}

function methodNotAllowed(allowed) {
  return error(405, "invalid_request_error", `Use ${allowed.join(" or ")} here.`, { Allow: allowed.join(", ") })
}

function error(status, type, message, headers = {}) {
  return { status, body: { error: { type, message } }, headers }
}
