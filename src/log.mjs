// Every API request writes one line of JSON to logs/app.log.
// One line per event, one JSON object per line, is the most common log format
// you will meet in a support job: easy for machines to search, readable by people.
import fs from "node:fs"
import path from "node:path"

export const LOG_DIR = path.join(import.meta.dirname, "..", "logs")
export const LIVE_LOG = path.join(LOG_DIR, "app.log")

export function log(entry) {
  const line = JSON.stringify({ time: new Date().toISOString(), ...entry })
  fs.appendFileSync(LIVE_LOG, line + "\n")
}
