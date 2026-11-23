// Runs Python from the lesson pages with the course's own Python (.venv), in a
// throwaway folder, with the working directory set to workspace/ so relative
// paths like "data/history.log" work the same as in your own scripts.
//
// For an exercise, your code is saved as your_code.py and a hidden check file
// imports it and runs assertions against it.
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { HELPDESK_TOKEN } from "../src/helpdesk.mjs"

const ROOT = path.join(import.meta.dirname, "..")
const PYTHON = path.join(ROOT, ".venv", "bin", "python")
const WORKSPACE = path.join(ROOT, "workspace")
const TIMEOUT_MS = 15_000
const MAX_OUTPUT = 20_000

const CHECK_PRELUDE = `import io, contextlib, sys
_buf = io.StringIO()
with contextlib.redirect_stdout(_buf):
    from your_code import *
    import your_code as _mod
OUTPUT = _buf.getvalue()
sys.stdout.write(OUTPUT)
`

export async function runPython(code, tests = null, success = "Correct.") {
  if (!code || !code.trim()) return { ok: false, message: "Write some code first." }
  // realpath: on a Mac the temp folder is reached through a symlink, and Python
  // prints the real path, so tracebacks only tidy up against that one.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "paperkite-py-")))
  try {
    fs.writeFileSync(path.join(dir, "your_code.py"), code)
    let entry = "your_code.py"
    if (tests) {
      fs.writeFileSync(path.join(dir, "_check.py"), CHECK_PRELUDE + "\n" + tests + "\nprint('\\n__PASS__')\n")
      entry = "_check.py"
    }
    const run = await exec(path.join(dir, entry))
    const tidy = (s) => s.split(dir + path.sep).join("").slice(0, MAX_OUTPUT)
    const stdout = tidy(run.stdout)
    const stderr = tidy(run.stderr)

    if (!tests) return { ok: run.code === 0, stdout, stderr, ms: run.ms, timedOut: run.timedOut }

    const passed = run.code === 0 && stdout.includes("__PASS__")
    return {
      ok: passed,
      message: passed ? success : explainFailure(stderr, run.timedOut),
      stdout: stdout.replace(/\n?__PASS__\n?/, ""),
      stderr,
      ms: run.ms,
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

// Turn the end of a traceback into one sentence.
function explainFailure(stderr, timedOut) {
  if (timedOut) return `Stopped after ${TIMEOUT_MS / 1000} seconds. Is there a loop that never ends?`
  const lines = stderr.trim().split("\n")
  const last = lines[lines.length - 1] || ""
  const frames = lines.filter((l) => l.includes('File "your_code.py"'))
  const inYourCode = frames.length > 0
  if (last.startsWith("AssertionError")) {
    const why = last.replace(/^AssertionError:?\s*/, "")
    return why ? `Not yet: ${why}` : "Not yet: one of the checks failed."
  }
  if (inYourCode) {
    const line = frames[frames.length - 1].match(/line (\d+)/)
    return `Your code stopped with an error${line ? ` on line ${line[1]}` : ""}: ${last}`
  }
  return `The check couldn't run your code: ${last}`
}

function exec(file) {
  return new Promise((resolve) => {
    const started = Date.now()
    const child = spawn(PYTHON, [file], {
      cwd: WORKSPACE,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONUNBUFFERED: "1",
        PAPERKITE_API: "http://localhost:4747",
        PAPERKITE_API_KEY: "pk_test_harbor_reporting_7d2f",
        HELPDESK_TOKEN,
      },
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (d) => (stdout += d))
    child.stderr.on("data", (d) => (stderr += d))
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGKILL")
    }, TIMEOUT_MS)
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr, ms: Date.now() - started, timedOut })
    })
  })
}
