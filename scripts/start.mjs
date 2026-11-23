// `npm start`: make sure the course database and Python are ready, then start the server.
import { execFileSync } from "node:child_process"
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { start } from "./db.mjs"

const ROOT = path.join(import.meta.dirname, "..")
const VENV = path.join(ROOT, ".venv")
// Written only after every package installed, so a setup that stopped halfway
// (a network blip, Ctrl-C) is redone on the next start instead of left broken.
const READY = path.join(VENV, ".course-ready")
const wanted = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, "requirements.txt"))).digest("hex")
const ready = fs.existsSync(path.join(VENV, "bin", "python")) && fs.existsSync(READY) && fs.readFileSync(READY, "utf8") === wanted

if (!ready) {
  console.log("Setting up Python for the course (one time)...")
  fs.rmSync(VENV, { recursive: true, force: true })
  try {
    execFileSync("python3", ["-m", "venv", ".venv"], { cwd: ROOT, stdio: "inherit" })
    execFileSync(".venv/bin/pip", ["install", "-q", "-r", "requirements.txt"], { cwd: ROOT, stdio: "inherit" })
  } catch {
    console.error("\nPython setup didn't finish. Check your internet connection and run npm start again;")
    console.error("it starts the setup over. The course needs Python 3.11 or newer (python3 --version).\n")
    process.exit(1)
  }
  fs.writeFileSync(READY, wanted)
}

start()
await import("../server.mjs")
