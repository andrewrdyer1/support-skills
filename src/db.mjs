// The two ways into the database.
//
// - `appDb` is the Paperkite app itself. It can read and write.
// - `learnerDb` is you. It can only read, and any query is stopped after 5 seconds,
//   so nothing you type in a lesson can change or break the data.
// - `sandboxDb` is you practicing writes (Lesson 3). It may insert, update and
//   delete, but every run is rolled back, and a trigger refuses to commit anything
//   it changed, so nothing it does is ever saved.
import pg from "pg"

export const DB_PORT = 5488
export const DB_NAME = "paperkite"

// Postgres `date` columns (no time part) come back as plain 'YYYY-MM-DD' strings
// instead of being turned into a JavaScript Date at local midnight.
pg.types.setTypeParser(1082, (value) => value)

export const appDb = new pg.Pool({
  host: "localhost",
  port: DB_PORT,
  database: DB_NAME,
  user: "paperkite_app",
  max: 4,
})

export const learnerDb = new pg.Pool({
  host: "localhost",
  port: DB_PORT,
  database: DB_NAME,
  user: "learner",
  max: 2,
  statement_timeout: 5000,
})

export const sandboxDb = new pg.Pool({
  host: "localhost",
  port: DB_PORT,
  database: DB_NAME,
  user: "learner_sandbox",
  max: 2,
  statement_timeout: 5000,
  lock_timeout: 2000,
})
