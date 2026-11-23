// Who is calling? Every /api/v1 request (except /health) must send
//   Authorization: Bearer <api key>
// This file turns that header into an account, or into the right error.
import { appDb } from "./db.mjs"

// key -> timestamps (ms) of that key's requests in the last minute
const recentRequests = new Map()

export async function authenticate(req) {
  const header = req.headers["authorization"] || ""
  const match = header.match(/^Bearer\s+(\S+)$/i)

  if (!match) {
    return fail(401, "authentication_error", "Missing API key. Send it as: Authorization: Bearer <key>")
  }

  const { rows } = await appDb.query(
    `select k.id, k.key, k.label, k.scopes, k.rate_limit_per_min, k.revoked_at,
            a.id as account_id, a.name as account_name, a.plan_id, a.status as account_status,
            p.api_access
       from api_keys k
       join accounts a on a.id = k.account_id
       join plans p on p.id = a.plan_id
      where k.key = $1`,
    [match[1]],
  )
  const key = rows[0]

  if (!key) return fail(401, "authentication_error", "Invalid API key.")
  if (key.revoked_at) return fail(401, "authentication_error", "This API key was revoked.")
  if (!key.api_access) {
    return fail(403, "permission_error", `The ${key.plan_id} plan does not include API access.`, {}, key)
  }

  // Rate limit: at most rate_limit_per_min requests in any 60-second window.
  const now = Date.now()
  const recent = (recentRequests.get(key.key) || []).filter((t) => now - t < 60_000)
  if (recent.length >= key.rate_limit_per_min) {
    const retryAfter = Math.ceil((60_000 - (now - recent[0])) / 1000)
    return fail(429, "rate_limit_error", `Too many requests. This key allows ${key.rate_limit_per_min} per minute.`, {
      "Retry-After": String(retryAfter),
    }, key)
  }
  recent.push(now)
  recentRequests.set(key.key, recent)

  return { ok: true, key }
}

export function hasScope(key, scope) {
  return key.scopes.includes(scope)
}

// `key` is passed when we know who is calling but must still refuse them,
// so the log line can say which key it was.
function fail(status, type, message, headers = {}, key = null) {
  return { ok: false, status, type, message, headers, key }
}
