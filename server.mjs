// One local server, two jobs:
//
//   /api/v1/*   the Paperkite product API (src/), which you will call with curl
//   /course/*   the course's own helpers: run SQL, check answers, read logs
//   everything else: the lesson pages in public/
//
// Start it with `npm start`, then open http://localhost:4747
import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { handleApi } from "./src/api.mjs"
import { log, LOG_DIR, LIVE_LOG } from "./src/log.mjs"
import { learnerDb, sandboxDb } from "./src/db.mjs"
import { EXERCISES } from "./course/exercises.mjs"
import { PY_EXERCISES } from "./course/py_exercises.mjs"
import { resetHelpdesk, helpdeskState } from "./src/helpdesk.mjs"
import { runPython } from "./course/python.mjs"

export const PORT = 4747
const ROOT = import.meta.dirname
const PUBLIC = path.join(ROOT, "public")
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json" }
const READABLE_SOURCE = ["src/api.mjs", "src/auth.mjs", "src/exports.mjs", "src/db.mjs", "src/log.mjs", "src/CHANGELOG.md"]

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  try {
    req.rawBody = await readBody(req)
    if (url.pathname.startsWith("/api/")) return await serveApi(req, res, url)
    if (url.pathname.startsWith("/course/")) return await serveCourse(req, res, url)
    return serveStatic(res, url)
  } catch (err) {
    console.error(err)
    if (!res.headersSent) sendJson(res, 500, { error: { message: String(err.message || err) } })
  }
})

// ---------- the product API ----------
async function serveApi(req, res, url) {
  const started = Date.now()
  const requestId = "req_" + crypto.randomBytes(9).toString("base64url").toLowerCase().replace(/[-_]/g, "x").slice(0, 12)
  const ctx = {}
  let result
  let failure = null
  try {
    result = await handleApi(req, url, ctx)
  } catch (err) {
    failure = err
    result = {
      status: 500,
      body: { error: { type: "api_error", message: "Something went wrong. If this keeps happening, contact support with the request id.", request_id: requestId } },
    }
  }

  const headers = { "X-Request-Id": requestId, ...(result.headers || {}) }
  if (result.csv !== undefined) {
    res.writeHead(result.status, { ...headers, "Content-Type": "text/csv; charset=utf-8" })
    res.end(result.csv)
  } else {
    sendJson(res, result.status, result.body, headers)
  }

  // Note what is NOT logged: the API key itself. Logs get copied around;
  // secrets in them leak. The key's label is enough to identify it.
  log({
    level: result.status >= 500 ? "error" : result.status >= 400 ? "warn" : "info",
    request_id: requestId,
    method: req.method,
    path: url.pathname,
    query: url.search || undefined,
    auth: req.headers["authorization"] ? "api_key" : "none",
    account_id: ctx.accountId,
    key_label: ctx.keyLabel,
    status: result.status,
    ms: Date.now() - started,
    rows: result.rows,
    error: failure ? { message: failure.message, stack: failure.stack.split("\n").filter((l, i) => i === 0 || !l.includes("node:")).join("\n") } : undefined,
  })
}

// ---------- course helpers ----------
async function serveCourse(req, res, url) {
  const route = `${req.method} ${url.pathname}`

  // These routes run code on this computer, so only this page may call them.
  // The Host check stops other websites that point a domain at 127.0.0.1;
  // the custom header can't be sent cross-site without a CORS preflight,
  // which this server never approves.
  const host = req.headers.host || ""
  if (host !== `localhost:${PORT}` && host !== `127.0.0.1:${PORT}`) return sendJson(res, 403, { error: "bad host" })
  if (req.method !== "GET" && req.headers["x-course"] !== "1") return sendJson(res, 403, { error: "missing X-Course header" })

  if (route === "POST /course/sql") {
    const { sql } = JSON.parse(req.rawBody || "{}")
    return sendJson(res, 200, await runLearnerSql(sql))
  }

  if (route === "POST /course/write") {
    const { sql } = JSON.parse(req.rawBody || "{}")
    return sendJson(res, 200, await runSandboxSql(sql))
  }

  if (route === "POST /course/check") {
    const { id, sql } = JSON.parse(req.rawBody || "{}")
    return sendJson(res, 200, await checkExercise(id, sql))
  }

  if (route === "GET /course/exercises") {
    const ids = (url.searchParams.get("ids") || "").split(",")
    const out = {}
    for (const id of ids) {
      if (EXERCISES[id]) out[id] = { id, ...EXERCISES[id] }
      if (PY_EXERCISES[id]) out[id] = { id, lang: "python", ...PY_EXERCISES[id], tests: undefined }
    }
    return sendJson(res, 200, out)
  }

  if (route === "POST /course/python") {
    const { code } = JSON.parse(req.rawBody || "{}")
    return sendJson(res, 200, await runPython(code))
  }

  if (route === "POST /course/pycheck") {
    const { id, code } = JSON.parse(req.rawBody || "{}")
    const exercise = PY_EXERCISES[id]
    if (!exercise) return sendJson(res, 200, { ok: false, message: "Unknown exercise." })
    return sendJson(res, 200, await runPython(code, exercise.tests, exercise.success))
  }

  if (route === "POST /course/helpdesk/reset") {
    resetHelpdesk()
    return sendJson(res, 200, { ok: true })
  }

  if (route === "GET /course/helpdesk/state") return sendJson(res, 200, helpdeskState())

  if (route === "GET /course/logs") return sendJson(res, 200, readLogs(url.searchParams))

  // Look up one request by its id, for exercises that ask you to find one.
  if (route === "GET /course/request") {
    const id = (url.searchParams.get("id") || "").trim()
    const entry = readLogs(new URLSearchParams({ q: id, limit: "1000" })).lines.find((e) => e.request_id === id)
    return sendJson(res, 200, entry ? { found: true, path: entry.path, status: entry.status, time: entry.time } : { found: false })
  }

  if (route === "GET /course/source") {
    const file = url.searchParams.get("file")
    if (!READABLE_SOURCE.includes(file)) return sendJson(res, 404, { error: "not readable" })
    return sendJson(res, 200, { file, text: fs.readFileSync(path.join(ROOT, file), "utf8") })
  }

  return sendJson(res, 404, { error: "unknown course route" })
}

// Everything comes back as text, exactly as Postgres prints it, so what you see
// in the lesson matches what psql shows.
const asText = { getTypeParser: () => (value) => value }

async function runLearnerSql(sql) {
  if (!sql || !sql.trim()) return { error: "Type a query first." }
  const started = Date.now()
  try {
    let result = await learnerDb.query({ text: sql, rowMode: "array", types: asText })
    if (Array.isArray(result)) result = result[result.length - 1]
    const rows = result.rows || []
    return {
      command: result.command,
      columns: (result.fields || []).map((f) => f.name),
      rows: rows.slice(0, 500),
      rowCount: rows.length,
      truncated: rows.length > 500,
      ms: Date.now() - started,
    }
  } catch (err) {
    return { error: err.message, position: err.position ? Number(err.position) : null, hint: err.hint || null }
  }
}

// Lesson 3's practice writes. Your SQL runs for real inside a transaction, then
// `probe` (an exercise's after-the-fact SELECT) runs in the same transaction, and
// everything is rolled back. Each statement's result is returned, so
// `begin; update ...; select ...; rollback;` shows every step.
async function runSandboxSql(sql, probe) {
  if (!sql || !sql.trim()) return { error: "Type a statement first." }
  const started = Date.now()
  const client = await sandboxDb.connect()
  try {
    await client.query("begin")
    let results = await client.query({ text: sql, rowMode: "array", types: asText })
    if (!Array.isArray(results)) results = [results]
    const statements = results.map((r) => ({
      command: r.command,
      rowCount: r.rowCount,
      columns: (r.fields || []).map((f) => f.name),
      rows: (r.rows || []).slice(0, 500),
      truncated: (r.rows || []).length > 500,
    }))
    const after = probe ? await client.query({ text: probe, rowMode: "array", types: asText }) : null
    return { statements, probeRows: after?.rows, ms: Date.now() - started }
  } catch (err) {
    return { error: err.message, position: err.position ? Number(err.position) : null, hint: err.hint || null }
  } finally {
    // Rolled back whatever happened. DISCARD ALL also undoes anything session-wide
    // (a SET after your own ROLLBACK, say) before the connection is reused.
    await client.query("rollback").catch(() => {})
    await client.query("discard all").catch(() => {})
    client.release()
  }
}

const WRITES = ["INSERT", "UPDATE", "DELETE"]

async function checkWrite(exercise, sql) {
  const mine = await runSandboxSql(sql, exercise.probe)
  if (mine.error) return { ok: false, message: `Postgres says: ${mine.error}`, result: mine }
  const commands = mine.statements.map((s) => s.command)
  if (commands.some((c) => ["BEGIN", "COMMIT", "ROLLBACK"].includes(c))) {
    return { ok: false, message: "Leave out BEGIN and ROLLBACK here: the checker wraps your statement in its own transaction, looks at the result, then rolls it back.", result: mine }
  }
  const expected = await runSandboxSql(exercise.solution, exercise.probe)
  if (expected.error) return { ok: false, message: `The checker's own statement failed: ${expected.error}` }
  const changed = (r) => r.statements.filter((s) => WRITES.includes(s.command)).reduce((n, s) => n + s.rowCount, 0)
  const verb = expected.statements.find((s) => WRITES.includes(s.command)).command
  let message
  if (!commands.some((c) => WRITES.includes(c))) {
    message = `That only reads. This one needs an ${verb}.`
  } else if (changed(mine) !== changed(expected)) {
    const n = changed(mine)
    message = `Your statement changed ${n} row${n === 1 ? "" : "s"}; the ticket needs ${changed(expected)}. Check your WHERE.`
  } else if (JSON.stringify(mine.probeRows) !== JSON.stringify(expected.probeRows)) {
    message = "Right number of rows changed, but the values they ended up with differ."
  }
  const ok = !message
  return { ok, message: ok ? exercise.success || "Correct." : message, result: mine }
}

async function checkExercise(id, sql) {
  const exercise = EXERCISES[id]
  if (!exercise) return { ok: false, message: "Unknown exercise." }
  if (exercise.write) return await checkWrite(exercise, sql)
  const mine = await runLearnerSql(sql)
  if (mine.error) return { ok: false, message: `Postgres says: ${mine.error}`, result: mine }
  const expected = await runLearnerSql(exercise.solution)
  if (expected.error) return { ok: false, message: `The checker's own query failed: ${expected.error}` }

  // Numbers are compared by value, to 2 decimal places, so 12, 12.0 and 12.00
  // all count as the same answer.
  const norm = (v) => (v !== null && v !== "" && !isNaN(Number(v)) ? Number(v).toFixed(2) : v)
  const key = (row) => JSON.stringify(row.map(norm))
  const a = mine.rows.map(key)
  const b = expected.rows.map(key)
  let ok
  let message
  if (mine.columns.length !== expected.columns.length) {
    ok = false
    message = `You returned ${mine.columns.length} column${mine.columns.length === 1 ? "" : "s"}; this asks for ${expected.columns.length}.`
  } else if (a.length !== b.length) {
    ok = false
    message = `You got ${a.length} row${a.length === 1 ? "" : "s"}; the answer has ${b.length}.`
  } else if (exercise.ordered) {
    ok = a.every((row, i) => row === b[i])
    if (!ok) {
      const sameSet = [...a].sort().every((row, i) => row === [...b].sort()[i])
      message = sameSet ? "Right rows, wrong order. Check your ORDER BY." : "Right number of rows, but some values differ."
    }
  } else {
    const sa = [...a].sort()
    const sb = [...b].sort()
    ok = sa.every((row, i) => row === sb[i])
    if (!ok) message = "Right number of rows, but some values differ."
  }
  return { ok, message: ok ? exercise.success || "Correct." : message, result: mine }
}

function readLogs(params) {
  const q = (params.get("q") || "").toLowerCase()
  const level = params.get("level")
  const limit = Math.min(Number(params.get("limit") || 200), 1000)
  const lines = []
  const files = params.get("source") === "live" ? ["app.log"] : ["history.log", "app.log"]
  for (const file of files) {
    const full = path.join(LOG_DIR, file)
    if (!fs.existsSync(full)) continue
    for (const raw of fs.readFileSync(full, "utf8").split("\n")) {
      if (!raw) continue
      if (q && !raw.toLowerCase().includes(q)) continue
      const entry = JSON.parse(raw)
      if (level && entry.level !== level) continue
      lines.push(entry)
    }
  }
  lines.sort((x, y) => x.time.localeCompare(y.time))
  return { total: lines.length, lines: lines.slice(-limit) }
}

// ---------- plumbing ----------
function serveStatic(res, url) {
  let file = decodeURIComponent(url.pathname)
  if (file === "/") file = "/index.html"
  const full = path.join(PUBLIC, file)
  if (!full.startsWith(PUBLIC) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" })
    return res.end("Not found")
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream", "Cache-Control": "no-store" })
  fs.createReadStream(full).pipe(res)
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers })
  res.end(JSON.stringify(body, null, 2) + "\n")
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ""
    req.on("data", (chunk) => {
      data += chunk
      if (data.length > 100_000) reject(new Error("body too large"))
    })
    req.on("end", () => resolve(data))
    req.on("error", reject)
  })
}

fs.mkdirSync(LOG_DIR, { recursive: true })
if (!fs.existsSync(LIVE_LOG)) fs.writeFileSync(LIVE_LOG, "")

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Paperkite course running at http://localhost:${PORT}\n`)
})
