// `npm start`: make sure the course database and Python are ready, then start the server.
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { start } from "./db.mjs"

const ROOT = path.join(import.meta.dirname, "..")
if (!fs.existsSync(path.join(ROOT, ".venv", "bin", "python"))) {
  console.log("Setting up Python for the course (one time)...")
  execFileSync("python3", ["-m", "venv", ".venv"], { cwd: ROOT, stdio: "inherit" })
  execFileSync(".venv/bin/pip", ["install", "-q", "-r", "requirements.txt"], { cwd: ROOT, stdio: "inherit" })
}

start()
await import("../server.mjs")
