// Shared behavior for every lesson page: the SQL editor, exercises, the HTTP
// request builder, the HTML/CSS playground, the log viewer and the source viewer.
// Each widget is a plain element in the lesson HTML that this file brings to life.

const LESSONS = [
  { n: 1, file: "lesson-1-sql-basics.html", title: "Finding a customer", sub: "SQL basics: select, filter, sort, join", mins: 45 },
  { n: 2, file: "lesson-2-sql-counting.html", title: "Counting things", sub: "SQL aggregates, grouping, dates and CASE", mins: 45 },
  { n: 3, file: "lesson-3-sql-writes.html", title: "Changing data safely", sub: "INSERT, UPDATE, DELETE, transactions and the checklist", mins: 45 },
  { n: 4, file: "lesson-4-html-css.html", title: "What a web page is made of", sub: "HTML, CSS and the browser's DevTools", mins: 45 },
  { n: 5, file: "lesson-5-http-apis.html", title: "Talking to an API", sub: "HTTP, status codes, JSON, curl and API keys", mins: 50 },
  { n: 6, file: "lesson-6-debugging.html", title: "Working a real incident", sub: "Logs, stack traces, impact, and the bug ticket", mins: 60 },
  { n: 7, file: "lesson-7-python-from-zero.html", title: "Python from zero", sub: "Where Python runs at work, the terminal, values, text and numbers", mins: 50 },
  { n: 8, file: "lesson-8-python-collections.html", title: "Lists, dicts and loops", sub: "Working with many things at once, and the shape of API data", mins: 50 },
  { n: 9, file: "lesson-9-python-functions.html", title: "Functions and errors", sub: "Writing and calling functions, return, and reading a traceback", mins: 60 },
  { n: 10, file: "lesson-10-python-files.html", title: "Files and your first script", sub: "CSV and JSON files, the shape of a script, and a notebook", mins: 60 },
  { n: 11, file: "lesson-11-python-fast.html", title: "Python, fast", sub: "A recap after Lessons 7 to 10, or the quick route if you know another language", mins: 40 },
  { n: 12, file: "lesson-12-log-report.html", title: "Script: a log triage report", sub: "Files, JSON lines, counting, CSV, and your first tests", mins: 60 },
  { n: 13, file: "lesson-13-api-report.html", title: "Script: an API report", sub: "requests, pagination, errors, secrets, retries", mins: 60 },
  { n: 14, file: "lesson-14-bulk-followup.html", title: "Script: a safe bulk update", sub: "Command-line options, dry runs, idempotency, testing with fakes", mins: 75 },
  { n: 15, file: "lesson-15-script-cases.html", title: "Script cases", sub: "Four real support tasks, a spec and tests each, you build them", mins: 120 },
]

// Lesson pages define their non-SQL checks in an inline script as
// window.COURSE_CHECKS, which runs before this deferred file does.
const Course = (window.Course = { checks: window.COURSE_CHECKS || {} })

// ---------- progress (per browser; the page works fine without it) ----------
const STORE = "paperkite-course-v1"
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || { done: {}, counts: {}, drafts: {} }
  } catch {
    return { done: {}, counts: {}, drafts: {} }
  }
}
function saveProgress(p) {
  try {
    localStorage.setItem(STORE, JSON.stringify(p))
  } catch {
    /* private window: progress just isn't remembered */
  }
}
const progress = loadProgress()
progress.drafts ||= {}
// Lessons were renumbered when Lessons 3 and 7-9 were added, and again when Lesson 9
// was split in two. The per-lesson counts are keyed by number, so drop the old ones;
// each page writes its own again when opened. (Finished exercises are keyed by
// exercise id and are kept.)
if (progress.layout !== 4) {
  progress.counts = {}
  progress.layout = 4
  delete progress.v2
  saveProgress(progress)
}
function markDone(id) {
  progress.done[id] = true
  saveProgress(progress)
  updateTopbar()
}
Course.progress = progress
Course.LESSONS = LESSONS

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
function el(tag, attrs = {}, html = "") {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  node.innerHTML = html
  return node
}
async function postJson(url, body) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Course": "1" }, body: JSON.stringify(body) })
  return res.json()
}
// Cmd/Ctrl+Enter runs; Tab indents instead of leaving the box.
// Python mode indents by 4 spaces and keeps the indent on Enter (adding a level
// after a line ending in a colon), since indentation is Python's syntax.
function wireEditor(textarea, onRun, { python = false } = {}) {
  textarea.spellcheck = false
  const indent = python ? "    " : "  "
  const insert = (text) => {
    const { selectionStart: s, selectionEnd: t, value } = textarea
    textarea.value = value.slice(0, s) + text + value.slice(t)
    textarea.selectionStart = textarea.selectionEnd = s + text.length
    textarea.dispatchEvent(new Event("input"))
  }
  textarea.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      onRun()
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault()
      insert(indent)
    } else if (python && e.key === "Enter" && !e.shiftKey) {
      const { selectionStart: s, value } = textarea
      const line = value.slice(value.lastIndexOf("\n", s - 1) + 1, s)
      const current = line.match(/^ */)[0]
      e.preventDefault()
      insert("\n" + current + (/:\s*$/.test(line) ? indent : ""))
    } else if (python && e.key === "Backspace") {
      // Delete a whole indent level at once.
      const { selectionStart: s, selectionEnd: t, value } = textarea
      const before = value.slice(value.lastIndexOf("\n", s - 1) + 1, s)
      if (s === t && before.length > 0 && /^ +$/.test(before) && before.length % 4 === 0) {
        e.preventDefault()
        textarea.value = value.slice(0, s - 4) + value.slice(s)
        textarea.selectionStart = textarea.selectionEnd = s - 4
      }
    }
  })
  const fit = () => {
    textarea.style.height = "auto"
    textarea.style.height = Math.max(textarea.scrollHeight + 2, 60) + "px"
  }
  textarea.addEventListener("input", fit)
  requestAnimationFrame(fit)
}
const RUN_NOTE = navigator.platform.includes("Mac") ? "⌘ Enter to run" : "Ctrl Enter to run"

// ---------- SQL results ----------
function renderSqlResult(out, result, sql) {
  out.innerHTML = ""
  if (result.error) {
    let text = "ERROR: " + result.error
    if (result.position && sql) {
      // Show the line Postgres complained about, with a caret under the spot.
      const before = sql.slice(0, result.position - 1)
      const lineStart = before.lastIndexOf("\n") + 1
      const lineEnd = sql.indexOf("\n", result.position - 1)
      const line = sql.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
      text += "\n\n  " + line + "\n  " + " ".repeat(result.position - 1 - lineStart) + "^"
    }
    if (result.hint) text += "\nHINT: " + result.hint
    out.append(el("div", { class: "err" }, esc(text)))
    return
  }
  if (result.columns && result.columns.length) {
    const head = result.columns.map((c) => `<th>${esc(c)}</th>`).join("")
    const body = result.rows
      .map((r) => "<tr>" + r.map((v) => (v === null ? '<td class="null">null</td>' : `<td>${esc(v)}</td>`)).join("") + "</tr>")
      .join("")
    out.append(el("div", { class: "results" }, `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`))
  }
  const n = result.rowCount
  const note = result.truncated ? ` (showing the first 500)` : ""
  out.append(el("div", { class: "status" }, `${n} row${n === 1 ? "" : "s"}${note} · ${result.ms} ms`))
}

// Practice writes (Lesson 3): one block per statement, then a reminder that it
// was all rolled back.
function renderWriteResult(out, result, sql) {
  if (result.error) return renderSqlResult(out, result, sql)
  out.innerHTML = ""
  for (const st of result.statements) {
    const tag = ["INSERT", "UPDATE", "DELETE", "SELECT"].includes(st.command) ? `${st.command} ${st.rowCount}` : st.command
    out.append(el("div", { class: "cmd" }, esc(tag)))
    if (st.columns.length) {
      const sub = el("div")
      renderSqlResult(sub, { ...st, rowCount: st.rows.length, ms: result.ms }, sql)
      sub.lastChild.remove()
      out.append(...sub.childNodes)
    }
  }
  out.append(el("div", { class: "status" }, `Rolled back: nothing was saved · ${result.ms} ms`))
}

// ---------- free SQL editor:  <div class="sql"><textarea>…</textarea></div> ----------
// data-mode="write" runs it in the practice sandbox instead (always rolled back).
function initSql(box) {
  const start = box.querySelector("textarea")?.value.trim() || ""
  const write = box.dataset.mode === "write"
  box.className = "widget sql" + (write ? " write" : "")
  box.innerHTML = `<div class="head"><span class="title">${esc(box.dataset.title || "Try it")}</span><span class="spacer"></span><span>paperkite database · ${write ? "practice writes, always rolled back" : "read-only"}</span></div>`
  const ta = el("textarea")
  ta.value = start
  const btns = el("div", { class: "btns" }, `<button class="primary">Run</button><button class="reset">Reset</button><span class="note">${RUN_NOTE}</span>`)
  const out = el("div", { class: "out" })
  box.append(ta, btns, out)
  const run = async () => {
    out.innerHTML = '<div class="status">Running…</div>'
    if (write) renderWriteResult(out, await postJson("/course/write", { sql: ta.value }), ta.value)
    else renderSqlResult(out, await postJson("/course/sql", { sql: ta.value }), ta.value)
  }
  wireEditor(ta, run)
  btns.querySelector(".primary").onclick = run
  btns.querySelector(".reset").onclick = () => {
    ta.value = start
    ta.dispatchEvent(new Event("input"))
    out.innerHTML = ""
  }
}

// ---------- Python output ----------
function renderPyResult(out, r) {
  out.innerHTML = ""
  if (r.stdout) out.append(el("pre", { class: "resp-body" }, esc(r.stdout)))
  if (r.stderr) out.append(el("div", { class: "err" }, esc(r.stderr.trim())))
  if (!r.stdout && !r.stderr && r.ok !== undefined && r.message === undefined) out.append(el("div", { class: "status" }, "(no output: add a print() to see something)"))
  if (r.timedOut) out.append(el("div", { class: "err" }, "Stopped after 15 seconds. Is there a loop that never ends?"))
  if (r.ms !== undefined) out.append(el("div", { class: "status" }, `ran in ${r.ms} ms`))
}

// ---------- free Python editor:  <div class="py"><textarea>…</textarea></div> ----------
function initPy(box) {
  const start = box.querySelector("textarea")?.value.replace(/^\n+|\s+$/g, "") || ""
  box.className = "widget py"
  box.innerHTML = `<div class="head"><span class="title">${esc(box.dataset.title || "Try it")}</span><span class="spacer"></span><span>Python 3 · runs in workspace/</span></div>`
  const ta = el("textarea")
  ta.value = start
  const btns = el("div", { class: "btns" }, `<button class="primary">Run</button><button class="reset">Reset</button><span class="note">${RUN_NOTE}</span>`)
  const out = el("div", { class: "out" })
  box.append(ta, btns, out)
  const run = async () => {
    out.innerHTML = '<div class="status">Running…</div>'
    renderPyResult(out, await postJson("/course/python", { code: ta.value }))
  }
  wireEditor(ta, run, { python: true })
  btns.querySelector(".primary").onclick = run
  btns.querySelector(".reset").onclick = () => {
    ta.value = start
    ta.dispatchEvent(new Event("input"))
    out.innerHTML = ""
  }
}

// ---------- exercise frame, shared by all exercise kinds ----------
function exerciseFrame(box, def) {
  const number = box.dataset.num
  box.className = "widget exercise" + (progress.done[def.id] ? " done" : "")
  box.innerHTML = `<div class="head"><span class="badge">${progress.done[def.id] ? "Done" : "Exercise " + number}</span><span class="spacer"></span><span>${esc(def.kind || "")}</span></div><div class="prompt">${def.prompt}</div>`
  const hints = el("div", { class: "hints" })
  let shown = 0
  const hintBtn = el("button", {}, "Hint")
  hintBtn.onclick = () => {
    if (shown < (def.hints || []).length) hints.append(el("p", {}, def.hints[shown++]))
    if (shown >= (def.hints || []).length) hintBtn.disabled = true
  }
  if (!def.hints || !def.hints.length) hintBtn.style.display = "none"
  const solBtn = el("button", {}, "Show answer")
  let solShown = false
  const sol = el("pre", { class: "solution" })
  sol.style.display = "none"
  sol.textContent = def.solutionText || def.solution || ""
  solBtn.onclick = () => {
    solShown = !solShown
    sol.style.display = solShown ? "block" : "none"
    solBtn.textContent = solShown ? "Hide answer" : "Show answer"
  }
  if (!sol.textContent) solBtn.style.display = "none"
  const pass = () => {
    box.classList.add("done")
    box.querySelector(".badge").textContent = "Done"
    markDone(def.id)
  }
  return { hints, hintBtn, solBtn, sol, pass }
}

// ---------- SQL exercise:  <div class="exercise" data-id="…"></div> ----------
async function initSqlExercises(boxes) {
  if (!boxes.length) return
  const ids = boxes.map((b) => b.dataset.id)
  const defs = await (await fetch("/course/exercises?ids=" + ids.join(","))).json()
  for (const box of boxes) {
    const def = defs[box.dataset.id]
    if (!def) {
      box.textContent = "Missing exercise " + box.dataset.id
      continue
    }
    def.kind = def.lang === "python" ? "Python" : def.write ? "SQL · practice write, rolled back" : "SQL"
    const f = exerciseFrame(box, def)
    if (def.lang === "python") {
      initPyExercise(box, def, f)
      continue
    }
    const ta = el("textarea")
    ta.value = def.starter || ""
    const btns = el("div", { class: "btns" }, `<button class="primary">Check</button><button class="run">Just run</button><span class="note">${RUN_NOTE.replace("to run", "to check")}</span>`)
    btns.append(f.hintBtn, f.solBtn)
    const out = el("div", { class: "out" })
    box.append(ta, btns, f.hints, f.sol, out)
    const check = async () => {
      out.innerHTML = '<div class="status">Checking…</div>'
      const r = await postJson("/course/check", { id: def.id, sql: ta.value })
      out.innerHTML = ""
      const tmp = el("div")
      if (r.result) (def.write ? renderWriteResult : renderSqlResult)(tmp, r.result, ta.value)
      out.append(el("div", { class: "verdict " + (r.ok ? "ok" : "no") }, (r.ok ? "✓ " : "") + esc(r.message)))
      if (r.result && !r.result.error) out.append(...tmp.childNodes)
      if (r.ok) f.pass()
    }
    const run = async () => {
      out.innerHTML = '<div class="status">Running…</div>'
      if (def.write) renderWriteResult(out, await postJson("/course/write", { sql: ta.value }), ta.value)
      else renderSqlResult(out, await postJson("/course/sql", { sql: ta.value }), ta.value)
    }
    wireEditor(ta, check)
    btns.querySelector(".primary").onclick = check
    btns.querySelector(".run").onclick = run
  }
}

function initPyExercise(box, def, f) {
  const ta = el("textarea")
  ta.value = progress.drafts[def.id] || def.starter || ""
  ta.addEventListener("input", () => {
    progress.drafts[def.id] = ta.value
    saveProgress(progress)
  })
  const btns = el("div", { class: "btns" }, `<button class="primary">Check</button><button class="run">Just run</button><button class="reset">Start over</button><span class="note">${RUN_NOTE.replace("to run", "to check")}</span>`)
  btns.append(f.hintBtn, f.solBtn)
  const out = el("div", { class: "out" })
  box.append(ta, btns, f.hints, f.sol, out)
  const check = async () => {
    out.innerHTML = '<div class="status">Checking…</div>'
    const r = await postJson("/course/pycheck", { id: def.id, code: ta.value })
    renderPyResult(out, r)
    out.prepend(el("div", { class: "verdict " + (r.ok ? "ok" : "no") }, (r.ok ? "✓ " : "") + esc(r.message)))
    if (r.ok) f.pass()
  }
  const run = async () => {
    out.innerHTML = '<div class="status">Running…</div>'
    renderPyResult(out, await postJson("/course/python", { code: ta.value }))
  }
  wireEditor(ta, check, { python: true })
  btns.querySelector(".primary").onclick = check
  btns.querySelector(".run").onclick = run
  btns.querySelector(".reset").onclick = () => {
    ta.value = def.starter || ""
    ta.dispatchEvent(new Event("input"))
    out.innerHTML = ""
  }
}

// ---------- HTTP request builder ----------
//   <div class="req" data-method="GET" data-path="/api/v1/me" data-headers="Authorization: Bearer …" data-check="id"></div>
function initReq(box) {
  const def = box.dataset.check ? { id: box.dataset.check, ...Course.checks[box.dataset.check] } : null
  const f = def ? exerciseFrame(box, { ...def, kind: "HTTP" }) : null
  if (!def) {
    box.className = "widget req"
    box.innerHTML = `<div class="head"><span class="title">${esc(box.dataset.title || "Send a request")}</span><span class="spacer"></span><span>to your local Paperkite API</span></div>`
  } else box.classList.add("req")

  const methods = ["GET", "POST", "PUT", "DELETE"]
  const line = el("div", { class: "line" })
  const method = el("select", {}, methods.map((m) => `<option>${m}</option>`).join(""))
  method.value = box.dataset.method || "GET"
  const urlIn = el("input", { type: "text", value: box.dataset.path || "/api/v1/health", spellcheck: "false" })
  line.append(method, urlIn)
  const headers = el("textarea", { placeholder: "Headers, one per line:  Name: value" })
  headers.value = (box.dataset.headers || "").replace(/\\n/g, "\n")
  const body = el("textarea", { placeholder: "Body (for POST)" })
  body.value = (box.dataset.body || "").replace(/\\n/g, "\n")
  const curl = el("div", { class: "curl" })
  const btns = el("div", { class: "btns" }, `<button class="primary">Send</button>`)
  if (f) {
    btns.append(f.hintBtn, f.solBtn)
  }
  btns.append(el("span", { class: "note" }, "The same request as curl is shown above"))
  const out = el("div", { class: "out" })
  box.append(line, el("div", { class: "label" }, "Headers"), headers, el("div", { class: "label" }, "Body"), body, curl, btns)
  if (f) box.append(f.hints, f.sol)
  box.append(out)

  const parseHeaders = () => {
    const h = {}
    for (const raw of headers.value.split("\n")) {
      const i = raw.indexOf(":")
      if (i > 0) h[raw.slice(0, i).trim()] = raw.slice(i + 1).trim()
    }
    return h
  }
  const q = (s) => "'" + s.replace(/'/g, "'\\''") + "'"
  const showCurl = () => {
    const parts = [`<b>curl -i</b>`]
    if (method.value !== "GET" && !(method.value === "POST" && body.value)) parts.push(`-X ${method.value}`)
    parts.push(esc(q("http://localhost:4747" + urlIn.value)))
    for (const [k, v] of Object.entries(parseHeaders())) parts.push(`\\\n  -H ${esc(q(k + ": " + v))}`)
    if (body.value && method.value !== "GET") parts.push(`\\\n  -d ${esc(q(body.value))}`)
    curl.innerHTML = parts.join(" ")
  }
  for (const input of [method, urlIn, headers, body]) input.addEventListener("input", showCurl)
  method.addEventListener("change", showCurl)
  showCurl()

  const send = async () => {
    out.innerHTML = '<div class="status">Sending…</div>'
    const opts = { method: method.value, headers: parseHeaders() }
    if (body.value && method.value !== "GET") opts.body = body.value
    let res
    try {
      res = await fetch(urlIn.value, opts)
    } catch (err) {
      out.innerHTML = `<div class="err">${esc(err.message)}</div>`
      return
    }
    const text = await res.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      /* not JSON, e.g. a CSV */
    }
    const hdrs = {}
    res.headers.forEach((v, k) => (hdrs[k] = v))
    const shown = ["content-type", "x-request-id", "retry-after", "allow"].filter((k) => hdrs[k]).map((k) => `${k}: ${hdrs[k]}`)
    out.innerHTML = ""
    out.append(el("div", { class: "statusline s" + String(res.status)[0] }, `${res.status} ${esc(res.statusText)}`))
    out.append(el("pre", { class: "resp-headers" }, esc(shown.join("\n"))))
    out.append(el("pre", { class: "resp-body" }, esc(text)))
    if (def) {
      const ok = def.check({ status: res.status, headers: hdrs, text, json, method: method.value, path: urlIn.value, sent: parseHeaders(), body: body.value })
      out.prepend(el("div", { class: "verdict " + (ok ? "ok" : "no") }, ok ? "✓ " + esc(def.success || "That's it.") : esc(def.retry || "Not quite. Read the response and try again.")))
      if (ok) f.pass()
    }
  }
  btns.querySelector(".primary").onclick = send
  wireEditor(body, send)
}

// ---------- HTML/CSS playground ----------
//   <div class="play" data-check="id"><textarea class="html">…</textarea><textarea class="css">…</textarea></div>
function initPlay(box) {
  const startHtml = box.querySelector("textarea.html")?.value.trim() || ""
  const startCss = box.querySelector("textarea.css")?.value.trim() || ""
  const def = box.dataset.check ? { id: box.dataset.check, ...Course.checks[box.dataset.check] } : null
  const f = def ? exerciseFrame(box, { ...def, kind: "HTML & CSS" }) : null
  if (!def) {
    box.className = "widget play"
    box.innerHTML = `<div class="head"><span class="title">${esc(box.dataset.title || "Playground")}</span><span class="spacer"></span><span>edits show up live</span></div>`
  } else box.classList.add("play")
  const html = el("textarea")
  html.value = startHtml
  const css = el("textarea")
  css.value = startCss
  const panes = el("div", { class: "panes" })
  const left = el("div", {}, `<div class="label" style="font-size:12px;color:var(--muted);padding:6px 14px 0;background:var(--code-bg)">HTML</div>`)
  const right = el("div", {}, `<div class="label" style="font-size:12px;color:var(--muted);padding:6px 14px 0;background:var(--code-bg)">CSS</div>`)
  left.append(html)
  right.append(css)
  panes.append(left, right)
  const frame = el("iframe", { title: "Preview" })
  const btns = el("div", { class: "btns" })
  if (f) btns.append(el("button", { class: "primary" }, "Check"), f.hintBtn, f.solBtn)
  btns.append(el("button", { class: "reset" }, "Reset"))
  const out = el("div", { class: "out" })
  box.append(panes, frame, btns)
  if (f) box.append(f.hints, f.sol)
  box.append(out)
  const base = "body{font-family:-apple-system,system-ui,sans-serif;margin:16px;color:#1d1f23;background:#fff}"
  let timer
  const render = () => {
    clearTimeout(timer)
    timer = setTimeout(() => (frame.srcdoc = `<!doctype html><html><head><style>${base}</style><style>${css.value}</style></head><body>${html.value}</body></html>`), 150)
  }
  for (const t of [html, css]) {
    t.spellcheck = false
    t.addEventListener("input", render)
  }
  frame.srcdoc = `<!doctype html><html><head><style>${base}</style><style>${css.value}</style></head><body>${html.value}</body></html>`
  btns.querySelector(".reset").onclick = () => {
    html.value = startHtml
    css.value = startCss
    render()
    out.innerHTML = ""
  }
  if (f) {
    btns.querySelector(".primary").onclick = async () => {
      // Render the latest code first, so a check right after typing sees it.
      clearTimeout(timer)
      await new Promise((resolve) => {
        frame.addEventListener("load", resolve, { once: true })
        frame.srcdoc = `<!doctype html><html><head><style>${base}</style><style>${css.value}</style></head><body>${html.value}</body></html>`
      })
      const doc = frame.contentDocument
      let ok = false
      try {
        ok = def.check(doc, frame.contentWindow, { html: html.value, css: css.value })
      } catch {
        ok = false
      }
      out.innerHTML = ""
      out.append(el("div", { class: "verdict " + (ok ? "ok" : "no") }, ok ? "✓ " + esc(def.success || "That's it.") : esc(def.retry || "Not yet. Look at the preview and try again.")))
      if (ok) f.pass()
    }
  }
}

// ---------- log viewer:  <div class="logs" data-q="export"></div> ----------
function initLogs(box) {
  box.className = "widget logs"
  box.innerHTML = `<div class="head"><span class="title">${esc(box.dataset.title || "Paperkite logs")}</span><span class="spacer"></span><span>${box.dataset.source === "live" ? "logs/app.log" : "logs/history.log + logs/app.log"}</span></div>`
  const filters = el("div", { class: "filters" })
  const q = el("input", { type: "text", placeholder: "Search (any text in the line: a request id, account_id, path…)", value: box.dataset.q || "" })
  const level = el("select", {}, `<option value="">all levels</option><option>info</option><option>warn</option><option>error</option>`)
  level.value = box.dataset.level || ""
  filters.append(q, level)
  const list = el("div", { class: "list" })
  const count = el("div", { class: "count" })
  box.append(filters, list, count)
  const load = async () => {
    const params = new URLSearchParams({ q: q.value, level: level.value, limit: 300, source: box.dataset.source || "" })
    const data = await (await fetch("/course/logs?" + params)).json()
    list.innerHTML = ""
    for (const e of data.lines) {
      const bits = [e.time.replace("T", " ").slice(0, 19), e.level.toUpperCase().padEnd(5)]
      if (e.msg) bits.push(e.msg, e.version || "")
      else bits.push(e.status, `${e.method} ${e.path}${e.query || ""}`, e.account_id != null ? `account=${e.account_id}` : "", e.request_id, e.error ? "· " + e.error.message : "")
      const d = el("details", { class: "entry lv-" + e.level })
      d.append(el("summary", {}, esc(bits.filter((b) => b !== "").join("  "))))
      const pretty = JSON.stringify(e, null, 2).replace(/\\n/g, "\n")
      d.append(el("pre", {}, esc(pretty)))
      list.append(d)
    }
    count.textContent = data.total > data.lines.length ? `${data.total} matching lines; showing the latest ${data.lines.length}` : `${data.total} matching line${data.total === 1 ? "" : "s"}`
    list.scrollTop = list.scrollHeight
  }
  let timer
  q.addEventListener("input", () => {
    clearTimeout(timer)
    timer = setTimeout(load, 250)
  })
  level.addEventListener("change", load)
  load()
}

// ---------- source viewer:  <div class="source" data-file="src/exports.mjs" data-hl="20-24"></div> ----------
async function initSource(box) {
  const file = box.dataset.file
  box.className = "widget source"
  box.innerHTML = `<div class="head"><span class="title">${esc(file)}</span><span class="spacer"></span><span>read-only</span></div>`
  const data = await (await fetch("/course/source?file=" + encodeURIComponent(file))).json()
  const [a, b] = (box.dataset.hl || "0-0").split("-").map(Number)
  const code = el("div", { class: "code" })
  data.text.replace(/\n$/, "").split("\n").forEach((line, i) => {
    const n = i + 1
    code.append(el("div", { class: "ln" + (n >= a && n <= (b || a) ? " hl" : "") }, `<span class="n">${n}</span><span class="t">${esc(line) || " "}</span>`))
  })
  box.append(code)
}

// ---------- ticket writer:  <div class="writer" data-id="…"></div> ----------
function initWriter(box) {
  const def = { id: box.dataset.id, ...Course.checks[box.dataset.id] }
  const f = exerciseFrame(box, { ...def, kind: "Writing" })
  box.classList.add("writer")
  const ta = el("textarea", { placeholder: def.placeholder || "" })
  ta.value = progress.drafts[def.id] || def.starter || ""
  ta.addEventListener("input", () => {
    progress.drafts[def.id] = ta.value
    saveProgress(progress)
  })
  const rubric = el("div", { class: "rubric" }, "<strong>Check your ticket against this list:</strong>")
  for (const item of def.rubric) {
    const label = el("label")
    label.append(el("input", { type: "checkbox" }), el("span", {}, item))
    rubric.append(label)
  }
  const btns = el("div", { class: "btns" }, `<button class="primary">Done</button>`)
  btns.append(f.solBtn)
  const out = el("div", { class: "out" })
  box.append(ta, rubric, btns, f.sol, out)
  btns.querySelector(".primary").onclick = () => {
    const boxes = [...rubric.querySelectorAll("input")]
    const missing = boxes.filter((b) => !b.checked).length
    out.innerHTML = ""
    if (ta.value.trim().length < 200) out.append(el("div", { class: "verdict no" }, "Write the ticket first. A useful one is usually 150 to 300 words."))
    else if (missing) out.append(el("div", { class: "verdict no" }, `${missing} item${missing === 1 ? "" : "s"} on the list still unchecked.`))
    else {
      out.append(el("div", { class: "verdict ok" }, "✓ Now compare yours with the example answer."))
      f.pass()
    }
  }
}

// ---------- short answer:  <div class="find" data-check="id"></div> ----------
// def.check(value) may be async and returns true/false, or a string to show as a hint.
function initAnswer(box) {
  const def = { id: box.dataset.check, ...Course.checks[box.dataset.check] }
  const f = exerciseFrame(box, { ...def, kind: def.kind || "Find it" })
  const input = el("input", { type: "text", placeholder: def.placeholder || "Your answer", spellcheck: "false" })
  input.style.padding = "10px 14px"
  input.style.borderTop = "1px solid var(--line)"
  const btns = el("div", { class: "btns" }, `<button class="primary">${esc(def.button || "Check")}</button>`)
  btns.append(f.hintBtn, f.solBtn)
  const out = el("div", { class: "out" })
  // noInput: the check looks at something you did elsewhere, so there's nothing to type.
  if (def.noInput) box.append(btns, f.hints, f.sol, out)
  else box.append(input, btns, f.hints, f.sol, out)
  const check = async () => {
    const value = input.value.trim()
    if (!value && !def.noInput) return
    const r = await def.check(value)
    out.innerHTML = ""
    if (r === true) {
      out.append(el("div", { class: "verdict ok" }, "✓ " + esc(def.success || "That's it.")))
      f.pass()
    } else {
      out.append(el("div", { class: "verdict no" }, esc(typeof r === "string" ? r : def.retry || "Not quite. Look again.")))
    }
  }
  btns.querySelector(".primary").onclick = check
  input.addEventListener("keydown", (e) => e.key === "Enter" && check())
}

// ---------- page chrome ----------
function updateTopbar() {
  const span = document.querySelector(".topbar .progress")
  if (!span) return
  const n = Number(document.body.dataset.lesson)
  const total = document.querySelectorAll(".exercise").length
  const done = [...document.querySelectorAll(".exercise")].filter((b) => b.classList.contains("done")).length
  span.textContent = total ? `${done} of ${total} exercises done` : ""
  if (n) {
    progress.counts[n] = { total, done }
    saveProgress(progress)
  }
}

function chrome() {
  const n = Number(document.body.dataset.lesson)
  const bar = el("div", { class: "topbar" }, `<div class="inner"><a class="home" href="/">Support skills</a>${n ? `<span>Lesson ${n} of ${LESSONS.length}</span>` : ""}<span class="spacer"></span><span class="progress"></span></div>`)
  document.body.prepend(bar)
  if (n) {
    const prev = LESSONS.find((l) => l.n === n - 1)
    const next = LESSONS.find((l) => l.n === n + 1)
    const pager = el("nav", { class: "pager" }, `<span>${prev ? `<a href="${prev.file}">← ${prev.n}. ${esc(prev.title)}</a>` : ""}</span><span>${next ? `<a href="${next.file}">${next.n}. ${esc(next.title)} →</a>` : `<a href="/">Back to the start →</a>`}</span>`)
    document.querySelector("main").append(pager)
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  chrome()
  // Number the exercises in reading order, whatever kind they are.
  document.querySelectorAll(".exercise, .req[data-check], .play[data-check], .writer, .find").forEach((b, i) => (b.dataset.num = i + 1))
  document.querySelectorAll(".sql").forEach(initSql)
  document.querySelectorAll(".py").forEach(initPy)
  document.querySelectorAll(".req").forEach(initReq)
  document.querySelectorAll(".play").forEach(initPlay)
  document.querySelectorAll(".logs").forEach(initLogs)
  document.querySelectorAll(".source").forEach(initSource)
  document.querySelectorAll(".writer").forEach(initWriter)
  document.querySelectorAll(".find").forEach(initAnswer)
  await initSqlExercises([...document.querySelectorAll(".exercise[data-id]")].filter((b) => !b.classList.contains("widget")))
  updateTopbar()
})
