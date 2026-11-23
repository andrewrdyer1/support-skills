// Builds the Paperkite database from nothing: schema, data, and the log history.
//
// Everything is generated from a fixed random seed, so every reset produces the
// exact same rows. "Today" in this world is 2026-10-30.
import fs from "node:fs"
import path from "node:path"
import pg from "pg"
import { DB_PORT, DB_NAME } from "../src/db.mjs"

const ROOT = path.join(import.meta.dirname, "..")
const TODAY = new Date("2026-10-30T17:00:00Z")
const DEPLOY_AT = new Date("2026-10-28T15:02:11Z")
const DAY = 86_400_000
const HOUR = 3_600_000

// ---------- deterministic randomness ----------
let seed = 20261030
function rand() {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (min, max) => min + Math.floor(rand() * (max - min + 1))
const pick = (list) => list[Math.floor(rand() * list.length)]
const chance = (p) => rand() < p
function weighted(pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [value, w] of pairs) if ((r -= w) < 0) return value
  return pairs[pairs.length - 1][0]
}
const between = (a, b) => new Date(a.getTime() + rand() * (b.getTime() - a.getTime()))
const ymd = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * DAY)
const reqId = () => "req_" + Array.from({ length: 12 }, () => pick("abcdefghijkmnpqrstuvwxyz23456789")).join("")

// ---------- name material ----------
const FIRST = ["Ava", "Ben", "Chloe", "Diego", "Elena", "Farah", "Gabe", "Hana", "Isaac", "Jade", "Kofi", "Lena", "Marco", "Nadia", "Omar", "Paige", "Quinn", "Rosa", "Sanjay", "Tess", "Umar", "Vera", "Wes", "Xin", "Yara", "Zane", "Iris", "Leo", "Mia", "Noah", "Olu", "Ruth", "Theo", "June", "Kai", "Lucia", "Felix", "Grace", "Hugo", "Ines"]
const LAST = ["Abbott", "Banerjee", "Castillo", "Dubois", "Eze", "Fischer", "Garcia", "Haddad", "Ito", "Jensen", "Kowalski", "Lindqvist", "Moreau", "Nakamura", "Oduya", "Petrov", "Quist", "Rahman", "Silva", "Tanaka", "Ueda", "Varga", "Walsh", "Xu", "Yilmaz", "Zimmer", "Brooks", "Chen", "Doyle", "Ellis", "Flores", "Gupta", "Holt", "Iqbal", "Kim", "Lopez", "Murphy", "Novak", "Ortiz", "Park"]
const BIZ_A = ["Blue", "Copper", "Maple", "North", "Juniper", "Harvest", "Lantern", "Quarry", "Willow", "Granite", "Saffron", "Tidal", "Cedar", "Orchard", "Ember", "Meadow", "Summit", "Hollow", "Fern", "Atlas", "Kestrel", "Bramble", "Marigold", "Pebble", "Rowan", "Sable", "Thistle", "Wren"]
const BIZ_B = ["Studio", "Plumbing", "Design Co", "Landscaping", "Bakery", "Consulting", "Electric", "Photography", "Cleaning", "Tutoring", "Catering", "Carpentry", "Dental", "Fitness", "Florist", "Print Shop", "Accounting", "Veterinary", "Coffee", "Architects", "Painting", "Media", "Roofing", "Translation"]
const CLIENT_A = ["Riverside", "Oak & Ash", "Brightline", "Kingsley", "Parkview", "Hillcrest", "Lakeshore", "Northgate", "Sunset", "Westfield", "Eastwood", "Silverleaf", "Redwood", "Stonebridge", "Clearwater", "Greenway"]
const CLIENT_B = ["Holdings", "Hotel", "School", "Clinic", "Realty", "Partners", "Cafe", "Gym", "Church", "Library", "Motors", "Foods", "Group", "Apartments", "Salon", "Farms"]
const COUNTRIES = [["US", 55], ["CA", 12], ["GB", 12], ["AU", 8], ["DE", 5], ["NZ", 4], ["IE", 4]]
const CURRENCY = { US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", DE: "EUR", NZ: "NZD", IE: "EUR" }
const AGENTS = ["Alex", "Bea", "Chen", "Dani", "Eli"]

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "")

// ---------- the tables, as arrays of row objects ----------
const plans = [
  { id: "free", name: "Free", monthly_price_cents: 0, seat_limit: 1, api_access: false },
  { id: "starter", name: "Starter", monthly_price_cents: 1500, seat_limit: 3, api_access: false },
  { id: "pro", name: "Pro", monthly_price_cents: 4900, seat_limit: 10, api_access: true },
  { id: "business", name: "Business", monthly_price_cents: 14900, seat_limit: 50, api_access: true },
]
const accounts = []
const users = []
const clients = []
const invoices = []
const tickets = []
const apiKeys = []
const events = []

// ---------- story accounts (the lessons depend on these exact rows) ----------
function addAccount(fields) {
  const account = { id: accounts.length + 1, trial_ends_at: null, canceled_at: null, ...fields }
  accounts.push(account)
  return account
}
function addUser(fields) {
  const user = { id: users.length + 1, ...fields }
  users.push(user)
  return user
}

const harbor = addAccount({
  name: "Harbor & Pine Bakery",
  plan_id: "pro",
  status: "active",
  country: "US",
  created_at: new Date("2025-03-14T16:20:00Z"),
})
const maya = addUser({ account_id: harbor.id, email: "maya@harborandpine.com", full_name: "Maya Okafor", role: "owner", created_at: new Date("2025-03-14T16:20:00Z"), last_login_at: new Date("2026-10-29T14:05:00Z") })
addUser({ account_id: harbor.id, email: "Priya.Shah@HarborAndPine.com", full_name: "Priya Shah", role: "admin", created_at: new Date("2025-06-02T10:00:00Z"), last_login_at: new Date("2026-10-27T09:12:00Z") })
addUser({ account_id: harbor.id, email: "tom@harborandpine.com", full_name: "Tom Becker", role: "member", created_at: new Date("2025-09-21T13:30:00Z"), last_login_at: new Date("2026-08-02T11:45:00Z") })
// The typo: the invite went to .co, not .com, so Sam never received it.
addUser({ account_id: harbor.id, email: "sam@harborandpine.co", full_name: "Sam Reyes", role: "member", created_at: new Date("2026-10-20T15:40:00Z"), last_login_at: null })

const sprout = addAccount({
  name: "Sprout Tutoring",
  plan_id: "starter",
  status: "active",
  country: "CA",
  created_at: new Date("2026-02-09T18:00:00Z"),
})
addUser({ account_id: sprout.id, email: "lin@sprouttutoring.ca", full_name: "Lin Zhao", role: "owner", created_at: new Date("2026-02-09T18:00:00Z"), last_login_at: new Date("2026-10-30T08:30:00Z") })

// ---------- everyone else ----------
const usedNames = new Set(accounts.map((a) => a.name))
while (accounts.length < 240) {
  const name = `${pick(BIZ_A)} ${pick(BIZ_B)}`
  if (usedNames.has(name)) continue
  usedNames.add(name)

  const created_at = between(new Date("2025-01-05T00:00:00Z"), addDays(TODAY, -1))
  const ageDays = (TODAY - created_at) / DAY
  let status
  let plan_id
  let trial_ends_at = null
  let canceled_at = null
  if (ageDays < 14) {
    status = "trialing"
    plan_id = pick(["pro", "pro", "business", "starter"])
    trial_ends_at = addDays(created_at, 14)
  } else {
    plan_id = weighted([["free", 30], ["starter", 30], ["pro", 28], ["business", 12]])
    status = plan_id === "free" ? "active" : weighted([["active", 82], ["past_due", 7], ["canceled", 11]])
    if (status === "canceled") canceled_at = between(addDays(created_at, 20), TODAY)
  }
  addAccount({ name, plan_id, status, country: weighted(COUNTRIES), created_at, trial_ends_at, canceled_at })
}

// Users for generated accounts.
for (const account of accounts.slice(2)) {
  const domain = slug(account.name) + pick([".com", ".com", ".co", ".io", ".net"])
  const extra = account.plan_id === "free" ? 0 : account.plan_id === "business" ? int(2, 8) : int(0, 3)
  const used = new Set()
  for (let i = 0; i <= extra; i++) {
    let first
    do first = pick(FIRST)
    while (used.has(first))
    used.add(first)
    const last = pick(LAST)
    const role = i === 0 ? "owner" : chance(0.25) ? "admin" : "member"
    let email = `${first.toLowerCase()}@${domain}`
    if (chance(0.04)) email = `${first}.${last}@${domain.replace(/^./, (c) => c.toUpperCase())}`
    const created_at = i === 0 ? account.created_at : between(account.created_at, TODAY)
    const neverLoggedIn = chance(i === 0 ? 0.02 : 0.14)
    const lastLoginFloor = account.status === "canceled" ? created_at : new Date(Math.max(created_at, TODAY - 40 * DAY))
    const lastLoginCeil = account.status === "canceled" ? account.canceled_at : TODAY
    addUser({
      account_id: account.id,
      email,
      full_name: chance(0.05) ? null : `${first} ${last}`,
      role,
      created_at,
      last_login_at: neverLoggedIn ? null : between(lastLoginFloor, lastLoginCeil),
    })
  }
}

// ---------- clients and invoices ----------
const voidUnpaidRate = 0.35
for (const account of accounts) {
  const nClients = account.id === harbor.id ? 8 : account.plan_id === "free" ? int(1, 3) : int(3, 12)
  const accountClients = []
  const usedClient = new Set()
  while (accountClients.length < nClients) {
    const name = `${pick(CLIENT_A)} ${pick(CLIENT_B)}`
    if (usedClient.has(name)) continue
    usedClient.add(name)
    const client = { id: clients.length + 1, account_id: account.id, name, email: chance(0.85) ? `billing@${slug(name)}.com` : null }
    clients.push(client)
    accountClients.push(client)
  }

  const nInvoices = account.id === harbor.id ? 46 : account.plan_id === "free" ? int(0, 6) : int(8, 45)
  const start = new Date(Math.max(account.created_at, TODAY - 365 * DAY))
  const end = account.status === "canceled" ? account.canceled_at : TODAY
  const dates = Array.from({ length: nInvoices }, () => between(start, end)).sort((a, b) => a - b)
  dates.forEach((issued, n) => {
    const due = addDays(issued, pick([14, 30, 30, 45]))
    let status
    let paid_at = null
    const roll = rand()
    if (roll < 0.02) {
      status = "void"
      if (!chance(voidUnpaidRate)) paid_at = between(issued, new Date(Math.min(addDays(due, 10), TODAY)))
    } else if (TODAY - issued < 2 * DAY && chance(0.5)) {
      status = "draft"
    } else if (chance(0.78) && TODAY - issued > 3 * DAY) {
      status = "paid"
      paid_at = between(addDays(issued, 1), new Date(Math.min(addDays(due, 20), TODAY)))
    } else {
      status = due < TODAY ? "overdue" : "sent"
    }
    invoices.push({
      id: invoices.length + 1,
      account_id: account.id,
      client_id: pick(accountClients).id,
      number: `INV-${String(n + 1).padStart(4, "0")}`,
      status,
      amount_cents: int(40, 4800) * 100 + pick([0, 0, 50, 25, 99]),
      currency: CURRENCY[account.country],
      issued_at: ymd(issued),
      due_at: ymd(due),
      paid_at,
    })
  })
}

// Harbor & Pine's own invoice history needs two specific rows for the incident.
{
  const hp = invoices.filter((i) => i.account_id === harbor.id)
  // Clear any random voids so only these two exist.
  for (const inv of hp) {
    if (inv.status === "void") {
      inv.status = "paid"
      inv.paid_at = addDays(new Date(inv.issued_at + "T12:00:00Z"), 5)
    }
  }
  // An old void that WAS paid then refunded: it has a paid_at, so it exports fine.
  const refunded = hp[20]
  refunded.status = "void"
  refunded.paid_at = addDays(new Date(refunded.issued_at + "T12:00:00Z"), 6)
  // A duplicate voided before anyone paid it: paid_at is null. This one breaks the export.
  const duplicate = hp[hp.length - 1]
  duplicate.issued_at = "2026-10-27"
  duplicate.due_at = "2026-11-26"
  duplicate.status = "void"
  duplicate.paid_at = null
  hp[hp.length - 2].issued_at = "2026-10-27"
  hp[hp.length - 2].due_at = "2026-11-26"
  hp[hp.length - 2].status = "sent"
  hp[hp.length - 2].paid_at = null
  hp[hp.length - 2].amount_cents = duplicate.amount_cents
  hp[hp.length - 2].client_id = duplicate.client_id
}

const hasUnpaidVoid = new Set(invoices.filter((i) => i.status === "void" && i.paid_at === null).map((i) => i.account_id))

// ---------- API keys ----------
const harborKeys = [
  { label: "Reporting script", key: "pk_test_harbor_reporting_7d2f", scopes: ["invoices:read"], rate_limit_per_min: 60, created_at: new Date("2025-11-03T10:00:00Z"), revoked_at: null },
  { label: "Bookkeeping sync", key: "pk_test_harbor_bookkeeping_4k9m", scopes: ["invoices:read", "invoices:write"], rate_limit_per_min: 60, created_at: new Date("2026-01-15T10:00:00Z"), revoked_at: null },
  { label: "Old Zapier connection", key: "pk_test_harbor_zapier_old_1q8w", scopes: ["invoices:read", "invoices:write"], rate_limit_per_min: 60, created_at: new Date("2025-05-01T10:00:00Z"), revoked_at: new Date("2026-09-01T12:00:00Z") },
  { label: "Wall dashboard", key: "pk_test_harbor_dashboard_3x5v", scopes: ["invoices:read"], rate_limit_per_min: 3, created_at: new Date("2026-04-10T10:00:00Z"), revoked_at: null },
]
for (const k of harborKeys) apiKeys.push({ id: apiKeys.length + 1, account_id: harbor.id, ...k })
apiKeys.push({ id: apiKeys.length + 1, account_id: sprout.id, label: "Website form", key: "pk_test_sprout_site_8n2c", scopes: ["invoices:read"], rate_limit_per_min: 60, created_at: new Date("2026-03-01T10:00:00Z"), revoked_at: null })
for (const account of accounts.slice(2)) {
  if (!["pro", "business"].includes(account.plan_id) || account.status === "canceled" || !chance(0.45)) continue
  const n = int(1, 2)
  for (let i = 0; i < n; i++) {
    apiKeys.push({
      id: apiKeys.length + 1,
      account_id: account.id,
      label: pick(["Zapier", "Accounting sync", "Website", "Reporting", "CRM connector", "Internal tool"]),
      key: "pk_test_" + Array.from({ length: 24 }, () => pick("abcdefghijklmnopqrstuvwxyz0123456789")).join(""),
      scopes: chance(0.5) ? ["invoices:read"] : ["invoices:read", "invoices:write"],
      rate_limit_per_min: pick([60, 60, 120, 600]),
      created_at: between(account.created_at, TODAY),
      revoked_at: chance(0.12) ? between(account.created_at, TODAY) : null,
    })
  }
}

// ---------- tickets ----------
const SUBJECTS = {
  billing: ["Charged twice this month?", "How do I get a receipt for my subscription", "Card declined but I updated it", "Can I switch to annual billing", "Refund for unused seats", "Why did my price go up", "Update billing address", "VAT number on invoices"],
  bug: ["Invoice PDF shows wrong logo", "Reminder emails went out twice", "Dashboard totals don't match", "Page won't load on Safari", "Client list sorting is broken", "Tax line rounding is off by a cent", "Duplicate invoice numbers"],
  how_to: ["How do I add a late fee", "Can I invoice in two currencies", "How do I add my logo", "Recurring invoices setup", "How do I mark an invoice paid manually", "Can I customize the reminder email", "How do I void an invoice"],
  account_access: ["Can't log in", "Password reset email never arrives", "Need to transfer ownership", "Teammate never got their invite", "Locked out after 2FA phone change", "Remove a former employee"],
  integrations: ["Zapier zap stopped working", "API returns 401", "QuickBooks sync missing invoices", "Webhook not firing", "Stripe payments not marking invoices paid", "API rate limit questions"],
}
const ticketAccounts = accounts.filter((a) => a.id > 2)
function addTicket(fields) {
  tickets.push({ id: tickets.length + 1, ...fields })
}
function responseHours(priority) {
  const base = { urgent: 0.6, high: 2.5, normal: 7, low: 20 }[priority]
  return base * Math.exp((rand() - 0.5) * 1.6)
}
for (let i = 0; i < 1150; i++) {
  const account = pick(ticketAccounts)
  const requesters = users.filter((u) => u.account_id === account.id)
  const requester = pick(requesters)
  const category = weighted([["billing", 26], ["bug", 18], ["how_to", 30], ["account_access", 14], ["integrations", 12]])
  const priority = weighted([["low", 22], ["normal", 55], ["high", 17], ["urgent", 6]])
  const created_at = between(new Date("2026-08-01T00:00:00Z"), addDays(TODAY, -0.05))
  const ageHours = (TODAY - created_at) / HOUR
  const rh = responseHours(priority)
  const responded = rh < ageHours && !(ageHours < 30 && chance(0.25))
  const first_response_at = responded ? new Date(created_at.getTime() + rh * HOUR) : null
  let status
  let solved_at = null
  if (!responded) status = "open"
  else {
    const solveHours = rh + 2 + rand() * 70
    if (solveHours < ageHours && chance(0.93)) {
      solved_at = new Date(created_at.getTime() + solveHours * HOUR)
      status = ageHours > 24 * 10 ? "closed" : "solved"
    } else status = chance(0.5) ? "pending" : "open"
  }
  addTicket({
    account_id: account.id,
    requester_id: requester.id,
    subject: pick(SUBJECTS[category]),
    category,
    priority,
    status,
    assignee: !responded && chance(0.6) ? null : pick(AGENTS),
    created_at,
    first_response_at,
    solved_at,
  })
}

// Harbor & Pine's tickets: the invite (Lesson 1) and the export (Lesson 6).
addTicket({ account_id: harbor.id, requester_id: maya.id, subject: "Our new bookkeeper never got his invite", category: "account_access", priority: "normal", status: "open", assignee: null, created_at: new Date("2026-10-30T13:12:00Z"), first_response_at: null, solved_at: null })
addTicket({ account_id: harbor.id, requester_id: maya.id, subject: "CSV export says Something went wrong", category: "bug", priority: "high", status: "open", assignee: "Bea", created_at: new Date("2026-10-29T14:21:00Z"), first_response_at: new Date("2026-10-29T15:02:00Z"), solved_at: null })
addTicket({ account_id: harbor.id, requester_id: maya.id, subject: "How do I void an invoice", category: "how_to", priority: "low", status: "closed", assignee: "Chen", created_at: new Date("2026-05-11T09:00:00Z"), first_response_at: new Date("2026-05-11T16:40:00Z"), solved_at: new Date("2026-05-11T17:05:00Z") })

// ---------- events, export traffic and the log history ----------
// Logins.
for (const user of users) {
  if (!user.last_login_at) continue
  const floor = new Date(Math.max(user.created_at, user.last_login_at - 45 * DAY))
  const n = int(0, 8)
  const times = Array.from({ length: n }, () => between(floor, user.last_login_at))
  times.push(user.last_login_at)
  for (const t of times) events.push({ account_id: user.account_id, user_id: user.id, name: "login", created_at: t })
}
// Invoice activity in the last 45 days.
for (const inv of invoices) {
  const issued = new Date(inv.issued_at + "T15:00:00Z")
  const owner = users.find((u) => u.account_id === inv.account_id && u.role === "owner")
  if (TODAY - issued < 45 * DAY) {
    events.push({ account_id: inv.account_id, user_id: owner.id, name: "invoice_created", created_at: issued })
    if (inv.status !== "draft") events.push({ account_id: inv.account_id, user_id: owner.id, name: "invoice_sent", created_at: new Date(issued.getTime() + int(5, 300) * 60_000) })
  }
  if (inv.paid_at && TODAY - inv.paid_at < 45 * DAY) events.push({ account_id: inv.account_id, user_id: null, name: "payment_received", created_at: inv.paid_at })
}

// Export attempts. Before the deploy they all work. After it, any account with a
// voided-but-never-paid invoice gets a 500 every time.
const exportAttempts = []
const exporters = accounts.filter((a) => a.status !== "canceled" && invoices.some((i) => i.account_id === a.id))
for (let i = 0; i < 150; i++) {
  exportAttempts.push({ account: pick(exporters), at: between(new Date("2026-10-01T00:00:00Z"), DEPLOY_AT) })
}
const postDeploy = []
for (let i = 0; i < 34; i++) postDeploy.push({ account: pick(exporters), at: between(DEPLOY_AT, addDays(TODAY, -0.02)) })
// Harbor & Pine tried three times on the 29th before writing in.
for (const t of ["2026-10-29T13:58:40Z", "2026-10-29T14:03:12Z", "2026-10-29T14:17:55Z"]) {
  postDeploy.push({ account: harbor, at: new Date(t), user: maya })
}
// Make sure a few other affected accounts hit it too, so it's visibly not just one customer.
const affectedOthers = [...hasUnpaidVoid].filter((id) => id !== harbor.id).map((id) => accounts[id - 1]).filter((a) => a.status !== "canceled").slice(0, 4)
for (const a of affectedOthers) {
  const first = between(DEPLOY_AT, addDays(TODAY, -0.2))
  postDeploy.push({ account: a, at: first })
  if (chance(0.7)) postDeploy.push({ account: a, at: new Date(first.getTime() + int(1, 9) * 60_000) })
}
exportAttempts.push(...postDeploy)
exportAttempts.sort((a, b) => a.at - b.at)

// Two more tickets about the export from other affected customers.
{
  const [a1, a2] = affectedOthers
  const u1 = users.find((u) => u.account_id === a1.id && u.role === "owner")
  const u2 = users.find((u) => u.account_id === a2.id && u.role === "owner")
  addTicket({ account_id: a1.id, requester_id: u1.id, subject: "Export to CSV broken?", category: "bug", priority: "normal", status: "open", assignee: null, created_at: new Date("2026-10-29T19:44:00Z"), first_response_at: null, solved_at: null })
  addTicket({ account_id: a2.id, requester_id: u2.id, subject: "Can't download my invoices", category: "bug", priority: "normal", status: "pending", assignee: "Dani", created_at: new Date("2026-10-30T10:03:00Z"), first_response_at: new Date("2026-10-30T11:20:00Z"), solved_at: null })
}

// ---------- write the database ----------
const lit = (v) => {
  if (v === null || v === undefined) return "null"
  if (v instanceof Date) return `'${v.toISOString()}'`
  if (Array.isArray(v)) return `array[${v.map(lit).join(",")}]::text[]`
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}
function insertSql(table, cols, rows) {
  const out = []
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => `(${cols.map((c) => lit(r[c])).join(",")})`)
    out.push(`insert into ${table} (${cols.join(",")}) values\n${chunk.join(",\n")};`)
  }
  return out.join("\n")
}

const admin = new pg.Client({ host: "localhost", port: DB_PORT, database: DB_NAME, user: "postgres" })
await admin.connect()
await admin.query(fs.readFileSync(path.join(ROOT, "db", "schema.sql"), "utf8"))

events.sort((a, b) => a.created_at - b.created_at)

const sql = [
  insertSql("plans", ["id", "name", "monthly_price_cents", "seat_limit", "api_access"], plans),
  insertSql("accounts", ["id", "name", "plan_id", "status", "country", "created_at", "trial_ends_at", "canceled_at"], accounts),
  insertSql("users", ["id", "account_id", "email", "full_name", "role", "created_at", "last_login_at"], users),
  insertSql("clients", ["id", "account_id", "name", "email"], clients),
  insertSql("invoices", ["id", "account_id", "client_id", "number", "status", "amount_cents", "currency", "issued_at", "due_at", "paid_at"], invoices),
  insertSql("tickets", ["id", "account_id", "requester_id", "subject", "category", "priority", "status", "assignee", "created_at", "first_response_at", "solved_at"], tickets),
  insertSql("api_keys", ["id", "account_id", "label", "key", "scopes", "rate_limit_per_min", "created_at", "revoked_at"], apiKeys),
].join("\n")
await admin.query(sql)

// Run each export through the REAL export code, so the stack traces in the log
// history are exactly what this code produces.
const { exportInvoicesCsv } = await import("../src/exports.mjs")
const logLines = []
const exportEvents = []
function owner(accountId) {
  return users.find((u) => u.account_id === accountId && u.role === "owner")
}
for (const attempt of exportAttempts) {
  const user = attempt.user || pick(users.filter((u) => u.account_id === attempt.account.id && u.last_login_at)) || owner(attempt.account.id)
  const { rows } = await admin.query(
    `select i.number, c.name as client_name, i.status, i.amount_cents, i.currency,
            i.issued_at::text as issued_at, i.due_at::text as due_at, i.paid_at
       from invoices i join clients c on c.id = i.client_id
      where i.account_id = $1 and i.issued_at <= $2::date
      order by i.issued_at, i.id`,
    [attempt.account.id, ymd(attempt.at)],
  )
  const entry = {
    time: attempt.at.toISOString(),
    level: "info",
    request_id: reqId(),
    method: "GET",
    path: "/api/v1/invoices/export",
    auth: "session",
    account_id: attempt.account.id,
    user_id: user.id,
  }
  exportEvents.push({ account_id: attempt.account.id, user_id: user.id, name: "export_started", created_at: attempt.at })
  try {
    // Before the deploy the export had no "Paid on" column and could not fail this way.
    if (attempt.at >= DEPLOY_AT) exportInvoicesCsv(rows)
    Object.assign(entry, { status: 200, ms: int(40, 420), rows: rows.length })
  } catch (err) {
    const stack = err.stack
      .split("\n")
      .filter((line, i) => i === 0 || line.includes("/src/"))
      .join("\n")
    Object.assign(entry, { level: "error", status: 500, ms: int(30, 160), error: { message: err.message, stack } })
    exportEvents.push({ account_id: attempt.account.id, user_id: user.id, name: "export_failed", created_at: new Date(attempt.at.getTime() + entry.ms) })
  }
  logLines.push(entry)
}

// Background API traffic from accounts with keys, for realism.
const PATHS = ["/api/v1/invoices", "/api/v1/invoices", "/api/v1/invoices", "/api/v1/me"]
for (let i = 0; i < 900; i++) {
  const k = pick(apiKeys)
  const at = between(new Date("2026-10-25T00:00:00Z"), TODAY)
  let p = pick(PATHS)
  let status = 200
  let level = "info"
  let method = "GET"
  if (k.revoked_at && k.revoked_at < at) status = 401
  else if (chance(0.04)) {
    p = `/api/v1/invoices/${int(1, 7000)}`
    status = 404
  } else if (chance(0.03)) {
    method = "POST"
    status = 422
  } else if (k.rate_limit_per_min <= 60 && chance(0.02)) status = 429
  if (status >= 400) level = "warn"
  logLines.push({
    time: at.toISOString(),
    level,
    request_id: reqId(),
    method,
    path: p,
    auth: "api_key",
    account_id: k.account_id,
    key_label: k.label,
    status,
    ms: int(8, 140),
  })
}
logLines.push({ time: DEPLOY_AT.toISOString(), level: "info", msg: "deploy", version: "2026.10.28.1", changes: ["exports: add Paid on column to invoice CSV", "reminders: fix double send for weekly schedule"] })
logLines.push({ time: "2026-10-21T16:40:03.000Z", level: "info", msg: "deploy", version: "2026.10.21.2", changes: ["dashboard: faster totals query"] })
logLines.sort((a, b) => a.time.localeCompare(b.time))

const allEvents = [...events, ...exportEvents].sort((a, b) => a.created_at - b.created_at)
await admin.query(insertSql("events", ["account_id", "user_id", "name", "created_at"], allEvents))

// Explicit ids above, so move the sequences past them.
for (const t of ["accounts", "users", "clients", "invoices", "tickets", "api_keys"]) {
  await admin.query(`select setval(pg_get_serial_sequence('${t}', 'id'), (select max(id) from ${t}))`)
}

// Who may do what.
await admin.query(`
  grant usage on schema public to paperkite_app, learner;
  grant select, insert, update, delete on all tables in schema public to paperkite_app;
  grant usage, select on all sequences in schema public to paperkite_app;
  grant select on all tables in schema public to learner;
  analyze;
`)

// The Lesson 3 sandbox writes for real, inside a transaction the course always
// rolls back. In case anything ever tries to COMMIT, a deferred trigger on every
// table fails the commit for any row this role touched, so its changes can never
// be saved. (Databases made before Lesson 3 existed get the role here too.)
const tables = ["plans", "accounts", "users", "clients", "invoices", "tickets", "api_keys", "events"]
await admin.query(`
  do $$ begin
    if not exists (select from pg_roles where rolname = 'learner_sandbox') then
      create role learner_sandbox login;
      alter role learner_sandbox set statement_timeout = '5s';
    end if;
  end $$;
  grant usage on schema public to learner_sandbox;
  grant select, insert, update, delete on all tables in schema public to learner_sandbox;
  grant usage, select on all sequences in schema public to learner_sandbox;
  create function never_save_practice() returns trigger language plpgsql as $f$
  begin
    raise exception 'This is the practice database: changes are never saved, so COMMIT is refused. Use ROLLBACK.';
  end $f$;
  ${tables.map((t) => `create constraint trigger never_save_practice after insert or update or delete on ${t}
    deferrable initially deferred for each row when (current_user = 'learner_sandbox')
    execute function never_save_practice();`).join("\n  ")}
`)
await admin.end()

fs.mkdirSync(path.join(ROOT, "logs"), { recursive: true })
fs.writeFileSync(path.join(ROOT, "logs", "history.log"), logLines.map((l) => JSON.stringify(l)).join("\n") + "\n")
fs.writeFileSync(path.join(ROOT, "logs", "app.log"), "")

// ---------- files for the Python lessons (workspace/data) ----------
const DATA = path.join(ROOT, "workspace", "data")
fs.mkdirSync(DATA, { recursive: true })
fs.copyFileSync(path.join(ROOT, "logs", "history.log"), path.join(DATA, "history.log"))

// Maya's invoice export, made with the Lesson 6 workaround (up to Oct 26).
{
  const owner = new pg.Client({ host: "localhost", port: DB_PORT, database: DB_NAME, user: "postgres" })
  await owner.connect()
  const { rows } = await owner.query(
    `select i.number, c.name as client_name, i.status, i.amount_cents, i.currency,
            i.issued_at::text as issued_at, i.due_at::text as due_at, i.paid_at
       from invoices i join clients c on c.id = i.client_id
      where i.account_id = $1 and i.issued_at <= '2026-10-26'
      order by i.issued_at, i.id`,
    [harbor.id],
  )
  await owner.end()
  fs.writeFileSync(path.join(DATA, "harbor_invoices.csv"), exportInvoicesCsv(rows))
}

// A customer's contact list for a bulk import, as messy as real ones are.
{
  const lines = ["name,email,role"]
  const domain = ["copperstudio.com", "copperstudio.com", "copperstudio.com", "gmail.com", "outlook.com"]
  const people = []
  for (let i = 0; i < 46; i++) {
    const first = pick(FIRST)
    const last = pick(LAST)
    people.push({ name: `${first} ${last}`, email: `${first}.${last}@${pick(domain)}`.toLowerCase(), role: pick(["admin", "member", "member", "member"]) })
  }
  const rows = []
  for (const person of people) {
    let { name, email, role } = person
    const roll = rand()
    if (roll < 0.12) email = email.toUpperCase()
    else if (roll < 0.22) email = `  ${email} `
    else if (roll < 0.27) email = email.replace(/^(.)/, (c) => c.toUpperCase())
    if (chance(0.06)) name = ""
    if (chance(0.1)) role = role.toUpperCase()
    rows.push([name, email, role])
    if (chance(0.12)) rows.push([name, person.email.toUpperCase(), role]) // a duplicate, differently cased
  }
  rows.push(["Pat Doyle", "pat.doyle@copperstudio", "member"])
  rows.push(["Sam Quist", "sam.quist.copperstudio.com", "member"])
  rows.push(["Jo Park", "", "admin"])
  rows.push(["Lee Moreau", "lee moreau@copperstudio.com", "member"])
  rows.push(["Ana Silva", "ana.silva@@copperstudio.com", "member"])
  // shuffle deterministically
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
  }
  for (const r of rows) lines.push(r.map((v) => (/[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(","))
  fs.writeFileSync(path.join(DATA, "contacts_import.csv"), lines.join("\n") + "\n")
}

console.log(
  `Seeded: ${accounts.length} accounts, ${users.length} users, ${invoices.length} invoices, ` +
    `${tickets.length} tickets, ${allEvents.length} events, ${logLines.length} log lines.`,
)
