// Runs the course's own Postgres, inside this folder (data/pg), on port 5488.
// It never touches any other database on this machine.
//
//   node scripts/db.mjs start   start it (creating and seeding it the first time)
//   node scripts/db.mjs stop    stop it
//   node scripts/db.mjs reset   wipe the data and seed it again from scratch
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { DB_PORT, DB_NAME } from "../src/db.mjs"

const ROOT = path.join(import.meta.dirname, "..")
const DATA = path.join(ROOT, "data", "pg")
const LOG = path.join(ROOT, "data", "postgres.log")

// Postgres refuses to start on macOS without a valid locale in the environment.
// Linux machines don't always have en_US, but they do have C.UTF-8.
const locale = process.platform === "darwin" ? "en_US.UTF-8" : "C.UTF-8"
const env = { ...process.env, LC_ALL: locale, LANG: locale }

// Find Postgres's own programs. Homebrew puts them on PATH, but Linux packages keep initdb and
// pg_ctl in a versioned folder (like /usr/lib/postgresql/16/bin) that isn't.
function findPostgres() {
  const onPath = (name) => {
    try {
      execFileSync("sh", ["-c", `command -v ${name}`], { stdio: "pipe" })
      return true
    } catch {
      return false
    }
  }
  if (["initdb", "pg_ctl", "psql"].every(onPath)) return null
  const places = [
    ["/opt/homebrew/opt", /^postgresql(@\d+)?$/],
    ["/usr/local/opt", /^postgresql(@\d+)?$/],
    ["/usr/lib/postgresql", /^\d+$/],
    ["/usr", /^pgsql-\d+$/],
    ["/Applications/Postgres.app/Contents/Versions", /^(latest|\d+)$/],
  ]
  const found = []
  for (const [dir, pattern] of places) {
    let names = []
    try {
      names = fs.readdirSync(dir)
    } catch {
      continue
    }
    for (const name of names.filter((n) => pattern.test(n))) {
      const bin = path.join(dir, name, "bin")
      if (["initdb", "pg_ctl", "psql"].every((t) => fs.existsSync(path.join(bin, t)))) {
        found.push({ bin, version: name === "latest" ? 999 : Number(name.match(/\d+/)?.[0] ?? 100) })
      }
    }
  }
  if (!found.length) {
    console.error(`
The course needs Postgres, and it isn't installed (or its programs aren't where expected).

  macOS:          brew install postgresql@16
  Ubuntu/Debian:  sudo apt install postgresql

Then run npm start again.
`)
    process.exit(1)
  }
  return found.sort((a, b) => b.version - a.version)[0].bin
}
const PG_BIN = findPostgres()
const tool = (name) => (PG_BIN ? path.join(PG_BIN, name) : name)

const run = (cmd, args, opts = {}) => execFileSync(tool(cmd), args, { stdio: "pipe", encoding: "utf8", env, ...opts })
const psql = (sql, db = "postgres") => run("psql", ["-h", "localhost", "-p", String(DB_PORT), "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-qc", sql])

function isRunning() {
  try {
    run("pg_ctl", ["-D", DATA, "status"])
    return true
  } catch {
    return false
  }
}

export function start() {
  const fresh = !fs.existsSync(path.join(DATA, "PG_VERSION"))
  if (fresh) {
    fs.mkdirSync(path.dirname(DATA), { recursive: true })
    run("initdb", ["-D", DATA, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--locale=C"])
  }
  if (!isRunning()) {
    // Connections are over localhost TCP only (-k '' turns off the Unix socket), so the folder
    // path can be any length and contain spaces; socket paths max out at 103 bytes.
    try {
      run("pg_ctl", ["-D", DATA, "-l", LOG, "-o", `-p ${DB_PORT} -c listen_addresses=localhost -k ''`, "-w", "start"])
    } catch {
      const tail = fs.existsSync(LOG) ? fs.readFileSync(LOG, "utf8").trim().split("\n").slice(-8).join("\n") : "(no log yet)"
      console.error(`\nThe course's database didn't start. The end of its log (data/postgres.log):\n\n${tail}\n`)
      console.error(`If port ${DB_PORT} is in use by something else, stop that and try again.\n`)
      process.exit(1)
    }
  }
  if (fresh) {
    psql(`create role paperkite_app login; create role learner login; create role learner_sandbox login;`)
    psql(`create database ${DB_NAME};`)
    // Show every timestamp in UTC, the way production logs and databases usually do.
    psql(`alter database ${DB_NAME} set timezone to 'UTC';`)
    // The learner role can never write: every transaction it opens is read-only.
    psql(`alter role learner set default_transaction_read_only = on; alter role learner set statement_timeout = '5s';`)
    psql(`alter role learner_sandbox set statement_timeout = '5s';`)
    seed()
  }
}

export function seed() {
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "seed.mjs")], { stdio: "inherit", env })
}

function stop() {
  if (isRunning()) run("pg_ctl", ["-D", DATA, "-m", "fast", "stop"])
}

const command = process.argv[2]
if (command === "start") start()
else if (command === "stop") stop()
else if (command === "reset") {
  start()
  seed()
} else if (command) {
  console.error(`Unknown command: ${command}`)
  process.exit(1)
}
