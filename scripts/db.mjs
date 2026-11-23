// Runs the course's own Postgres, inside this folder (data/pg), on port 5488.
// It never touches any other database on this machine.
//
//   node scripts/db.mjs start   start it (creating and seeding it the first time)
//   node scripts/db.mjs stop    stop it
//   node scripts/db.mjs reset   wipe the data and seed it again from scratch
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import pg from "pg"
import { DB_PORT, DB_NAME } from "../src/db.mjs"

const ROOT = path.join(import.meta.dirname, "..")
const DATA = path.join(ROOT, "data", "pg")
const SEED_STATE = path.join(DATA, ".paperkite-seed")
const LOG = path.join(ROOT, "data", "postgres.log")
const ADMIN = { host: "localhost", port: DB_PORT, database: "postgres", user: "postgres" }

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

function isRunning() {
  try {
    run("pg_ctl", ["-D", DATA, "status"])
    return true
  } catch {
    return false
  }
}

function initCluster() {
  const versionFile = path.join(DATA, "PG_VERSION")
  if (fs.existsSync(versionFile)) return

  fs.mkdirSync(path.dirname(DATA), { recursive: true })
  const staging = fs.mkdtempSync(path.join(path.dirname(DATA), "pg-init-"))
  try {
    run("initdb", ["-D", staging, "-U", "postgres", "--auth=trust", "--encoding=UTF8", "--locale=C"])
    try {
      fs.renameSync(staging, DATA)
    } catch (err) {
      // Another start may have published its initialized cluster first.
      if (!fs.existsSync(versionFile)) throw err
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true })
  }
}

// Before the seed marker existed, the final SQL step installed the practice
// trigger, then the seed script wrote the logs and Python lesson files.
async function hasLegacySeed() {
  const files = ["logs/history.log", "workspace/data/history.log", "workspace/data/harbor_invoices.csv", "workspace/data/contacts_import.csv"]
  if (!files.every((file) => fs.existsSync(path.join(ROOT, file)))) return false

  const course = new pg.Client({ ...ADMIN, database: DB_NAME })
  await course.connect()
  try {
    const { rows } = await course.query("select to_regprocedure('public.never_save_practice()') is not null as seeded")
    return rows[0].seeded
  } finally {
    await course.end()
  }
}

async function prepareCourse(reset) {
  const admin = new pg.Client(ADMIN)
  await admin.connect()
  try {
    const { rows } = await admin.query("show data_directory")
    if (fs.realpathSync(rows[0].data_directory) !== fs.realpathSync(DATA)) {
      throw new Error(`Port ${DB_PORT} is connected to a different Postgres instance.`)
    }
    // Serialize setup and reset for this cluster until all seed files are written.
    await admin.query("select pg_advisory_lock($1, 1)", [DB_PORT])
    const state = fs.existsSync(SEED_STATE) ? fs.readFileSync(SEED_STATE, "utf8") : null
    if (!reset && state === "ready") return

    const database = await admin.query("select 1 from pg_database where datname = $1", [DB_NAME])
    if (!reset && state === null && database.rowCount && await hasLegacySeed()) {
      fs.writeFileSync(SEED_STATE, "ready")
      return
    }

    fs.writeFileSync(SEED_STATE, "pending")
    await admin.query(`
      do $$
      begin
        if not exists (select from pg_roles where rolname = 'paperkite_app') then
          create role paperkite_app login;
        end if;
        if not exists (select from pg_roles where rolname = 'learner') then
          create role learner login;
        end if;
        if not exists (select from pg_roles where rolname = 'learner_sandbox') then
          create role learner_sandbox login;
        end if;
      end $$;
      alter role learner set default_transaction_read_only = on;
      alter role learner set statement_timeout = '5s';
      alter role learner_sandbox set statement_timeout = '5s';
    `)
    if (!database.rowCount) await admin.query(`create database ${DB_NAME}`)
    await admin.query(`alter database ${DB_NAME} set timezone to 'UTC'`)
    seed()
    fs.writeFileSync(SEED_STATE, "ready")
  } finally {
    await admin.end()
  }
}

export async function start({ reset = false } = {}) {
  initCluster()
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
  await prepareCourse(reset)
}

export function seed() {
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "seed.mjs")], { stdio: "inherit", env })
}

function stop() {
  if (isRunning()) run("pg_ctl", ["-D", DATA, "-m", "fast", "stop"])
}

const command = process.argv[2]
if (command === "start") await start()
else if (command === "stop") stop()
else if (command === "reset") await start({ reset: true })
else if (command) {
  console.error(`Unknown command: ${command}`)
  process.exit(1)
}
