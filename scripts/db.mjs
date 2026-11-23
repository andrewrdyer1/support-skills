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
const env = { ...process.env, LC_ALL: "en_US.UTF-8", LANG: "en_US.UTF-8" }
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "pipe", encoding: "utf8", env, ...opts })
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
    run("pg_ctl", ["-D", DATA, "-l", LOG, "-o", `-p ${DB_PORT} -c listen_addresses=localhost -k ${path.dirname(DATA)}`, "-w", "start"])
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
  run("node", [path.join(ROOT, "scripts", "seed.mjs")], { stdio: "inherit" })
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
