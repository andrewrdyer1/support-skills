// Every in-page Python exercise. `tests` is hidden Python that runs after your
// code is imported; each assert's message is what you see when it fails.
//
// The foundation lessons' exercises (Lessons 7-9) live in py_foundations.mjs and
// are merged in at the bottom. Ids keep the lesson number they were written under:
// `p6-*` is now Lesson 11, `p7-*` Lesson 12, and so on.
import { PY_FOUNDATIONS } from "./py_foundations.mjs"

export const PY_EXERCISES = {
  // ---------- Lesson 11 ----------
  "p6-summary": {
    prompt: "<p>Write <code>summary(ticket)</code>. Given a ticket dict, return a string like <code>#1152 [high] CSV export says Something went wrong</code>: the id after a <code>#</code>, the priority in square brackets, then the subject.</p>",
    starter: 'def summary(ticket):\n    return ""\n\n\nprint(summary({"id": 1152, "priority": "high", "subject": "CSV export says Something went wrong"}))\n',
    hints: ["Use an f-string: <code>f\"#{ticket['id']} …\"</code>. Inside double quotes, use single quotes for the keys."],
    solution: 'def summary(ticket):\n    return f"#{ticket[\'id\']} [{ticket[\'priority\']}] {ticket[\'subject\']}"\n',
    tests: `
got = summary({"id": 1152, "priority": "high", "subject": "CSV export says Something went wrong"})
assert got == "#1152 [high] CSV export says Something went wrong", f"for ticket 1152 you returned {got!r}"
got = summary({"id": 7, "priority": "low", "subject": "Logo"})
assert got == "#7 [low] Logo", f"for a second ticket you returned {got!r}"
`,
    success: "Correct. You'll write lines like this in every script that prints a report.",
  },
  "p6-clean-email": {
    prompt: "<p>Write <code>clean_email(raw)</code>: remove spaces around the email and lowercase it. If the result has no <code>@</code>, return <code>None</code>.</p>",
    starter: "def clean_email(raw):\n    pass\n\n\nprint(clean_email('  Priya.Shah@HarborAndPine.com '))\nprint(clean_email('not-an-email'))\n",
    hints: ["<code>email = raw.strip().lower()</code>", "<code>if \"@\" not in email: return None</code>, then return the email."],
    solution: 'def clean_email(raw):\n    email = raw.strip().lower()\n    if "@" not in email:\n        return None\n    return email\n',
    tests: `
cases = [("  Priya.Shah@HarborAndPine.com ", "priya.shah@harborandpine.com"), ("sam@harborandpine.co", "sam@harborandpine.co"), ("not-an-email", None), ("   ", None)]
for raw, want in cases:
    got = clean_email(raw)
    assert got == want, f"clean_email({raw!r}) returned {got!r}, expected {want!r}"
`,
    success: "Correct. Lesson 15 has a whole messy import file that needs exactly this.",
  },
  "p6-open-ids": {
    prompt: "<p>Write <code>open_ids(tickets)</code>: return a list of the ids of tickets whose status is <code>open</code> <em>or</em> <code>pending</code>, in the order they appear. Try a list comprehension.</p>",
    starter: "def open_ids(tickets):\n    pass\n\n\ntickets = [\n    {\"id\": 1, \"status\": \"open\"},\n    {\"id\": 2, \"status\": \"solved\"},\n    {\"id\": 3, \"status\": \"pending\"},\n]\nprint(open_ids(tickets))\n",
    hints: ["<code>[t[\"id\"] for t in tickets if …]</code>", "The condition: <code>t[\"status\"] in (\"open\", \"pending\")</code>"],
    solution: 'def open_ids(tickets):\n    return [t["id"] for t in tickets if t["status"] in ("open", "pending")]\n',
    tests: `
t = [{"id": 1, "status": "open"}, {"id": 2, "status": "solved"}, {"id": 3, "status": "pending"}, {"id": 4, "status": "closed"}, {"id": 5, "status": "open"}]
got = open_ids(t)
assert got == [1, 3, 5], f"expected [1, 3, 5], got {got!r}"
assert open_ids([]) == [], "an empty list should give an empty list"
`,
    success: "Correct. Select, from, where, in one line.",
  },
  "p6-count-by": {
    prompt: "<p>Write <code>count_by(items, field)</code>: return a dict counting how many items have each value of <code>field</code>. <code>count_by(tickets, \"status\")</code> might return <code>{\"open\": 2, \"pending\": 1}</code>. It's SQL's <code>group by</code> with <code>count(*)</code>.</p>",
    starter: "def count_by(items, field):\n    counts = {}\n    # loop over items and add 1 to counts[...]\n    return counts\n\n\nprint(count_by([{\"s\": \"a\"}, {\"s\": \"b\"}, {\"s\": \"a\"}], \"s\"))\n",
    hints: ["Inside the loop: <code>value = item[field]</code>", "<code>counts[value] = counts.get(value, 0) + 1</code>", "(Or, the shortcut: <code>from collections import Counter</code> and <code>return dict(Counter(i[field] for i in items))</code>.)"],
    solution: "def count_by(items, field):\n    counts = {}\n    for item in items:\n        value = item[field]\n        counts[value] = counts.get(value, 0) + 1\n    return counts\n",
    tests: `
got = count_by([{"s": "open"}, {"s": "pending"}, {"s": "open"}, {"s": "open"}], "s")
assert dict(got) == {"open": 3, "pending": 1}, f"got {got!r}"
got = count_by([{"p": "high", "s": "x"}, {"p": "low", "s": "x"}], "p")
assert dict(got) == {"high": 1, "low": 1}, f"counting by another field gave {got!r}"
assert dict(count_by([], "s")) == {}, "no items should give an empty dict"
`,
    success: "Correct. This little pattern is in half the reports you'll ever write.",
  },
  "p6-sla": {
    prompt: "<p>Write <code>sla_status(priority, hours_to_reply)</code>. Targets are in <code>TARGET_HOURS</code>. Return <code>\"no reply\"</code> if <code>hours_to_reply</code> is <code>None</code>, <code>\"met\"</code> if it's at or under the target, otherwise <code>\"missed\"</code>.</p>",
    starter: 'TARGET_HOURS = {"urgent": 1, "high": 4, "normal": 12, "low": 24}\n\n\ndef sla_status(priority, hours_to_reply):\n    pass\n\n\nprint(sla_status("high", 2.5), sla_status("urgent", 3), sla_status("low", None))\n',
    hints: ["Check for None first: <code>if hours_to_reply is None: return \"no reply\"</code>", "Then compare with <code>TARGET_HOURS[priority]</code> using <code>&lt;=</code>."],
    solution: 'TARGET_HOURS = {"urgent": 1, "high": 4, "normal": 12, "low": 24}\n\n\ndef sla_status(priority, hours_to_reply):\n    if hours_to_reply is None:\n        return "no reply"\n    if hours_to_reply <= TARGET_HOURS[priority]:\n        return "met"\n    return "missed"\n',
    tests: `
cases = [("high", 2.5, "met"), ("high", 4, "met"), ("high", 4.01, "missed"), ("urgent", 3, "missed"), ("low", None, "no reply"), ("normal", 0, "met")]
for p, h, want in cases:
    got = sla_status(p, h)
    assert got == want, f"sla_status({p!r}, {h!r}) returned {got!r}, expected {want!r}"
`,
    success: "Correct, including the edge cases: exactly on target counts as met, and 0 hours isn't the same as no reply.",
  },
  "p6-oldest": {
    prompt: "<p>Write <code>oldest(tickets, n)</code>: return the <strong>subjects</strong> of the <code>n</code> oldest tickets, oldest first. Each ticket has a <code>created_at</code> like <code>\"2026-10-29T14:21:00Z\"</code>. (Dates written this way sort correctly as plain text.)</p>",
    starter: "def oldest(tickets, n):\n    pass\n\n\ntickets = [\n    {\"subject\": \"B\", \"created_at\": \"2026-10-29T14:21:00Z\"},\n    {\"subject\": \"A\", \"created_at\": \"2026-10-28T09:00:00Z\"},\n    {\"subject\": \"C\", \"created_at\": \"2026-10-30T10:03:00Z\"},\n]\nprint(oldest(tickets, 2))\n",
    hints: ["<code>sorted(tickets, key=lambda t: t[\"created_at\"])</code> sorts oldest first.", "Take the first n with a slice, <code>[:n]</code>, then pull out the subjects with a comprehension."],
    solution: 'def oldest(tickets, n):\n    ordered = sorted(tickets, key=lambda t: t["created_at"])\n    return [t["subject"] for t in ordered[:n]]\n',
    tests: `
t = [{"subject": "B", "created_at": "2026-10-29T14:21:00Z"}, {"subject": "A", "created_at": "2026-10-28T09:00:00Z"}, {"subject": "C", "created_at": "2026-10-30T10:03:00Z"}, {"subject": "Z", "created_at": "2026-09-01T00:00:00Z"}]
got = oldest(t, 2)
assert got == ["Z", "A"], f"oldest(tickets, 2) returned {got!r}, expected ['Z', 'A']"
got = oldest(t, 10)
assert got == ["Z", "A", "B", "C"], f"asking for more than there are should return them all, got {got!r}"
assert t[0]["subject"] == "B", "your function changed the original list; sorted() returns a new one, .sort() changes it in place"
`,
    success: "Correct. sorted() with a key, a slice, and a comprehension: three tools, one line each.",
  },
  "p6-parse-amount": {
    prompt: "<p>Customers paste amounts in every format. Write <code>parse_amount(text)</code> that turns <code>\"$1,234.50\"</code> into <strong>cents</strong> as an int (<code>123450</code>). Allow an optional <code>$</code>, commas and spaces. If it isn't a number, return <code>None</code> instead of crashing.</p>",
    starter: "def parse_amount(text):\n    pass\n\n\nfor t in [\"$1,234.50\", \"12\", \" 0.99 \", \"twelve\"]:\n    print(repr(t), parse_amount(t))\n",
    hints: ["Clean first: <code>text.replace(\"$\", \"\").replace(\",\", \"\").strip()</code>", "<code>float(cleaned)</code> raises <code>ValueError</code> for text that isn't a number. Wrap it in <code>try</code> / <code>except ValueError</code>.", "Cents: <code>round(value * 100)</code>. (<code>int(19.99 * 100)</code> gives 1998 because of how computers store decimals; <code>round</code> avoids that.)"],
    solution: 'def parse_amount(text):\n    cleaned = text.replace("$", "").replace(",", "").strip()\n    try:\n        return round(float(cleaned) * 100)\n    except ValueError:\n        return None\n',
    tests: `
cases = [("$1,234.50", 123450), ("12", 1200), (" 0.99 ", 99), ("19.99", 1999), ("$ 5", 500), ("twelve", None), ("", None)]
for text, want in cases:
    got = parse_amount(text)
    assert got == want and (got is None or isinstance(got, int)), f"parse_amount({text!r}) returned {got!r}, expected {want!r}"
`,
    success: "Correct, including the 19.99 trap. Money in cents as whole numbers is how payment systems avoid rounding bugs.",
  },

  // ---------- Lesson 12 ----------
  "p7-count-500s": {
    prompt: "<p>Write <code>count_matching(path, text)</code>: open the file at <code>path</code> and return how many lines contain <code>text</code>. Then <code>count_matching(\"data/history.log\", '\"status\":500')</code> counts the server errors, like <code>grep -c</code>.</p>",
    starter: "def count_matching(path, text):\n    count = 0\n    # open the file and loop over its lines\n    return count\n\n\nprint(count_matching(\"data/history.log\", '\"status\":500'))\n",
    hints: ["<code>with open(path) as f:</code> then <code>for line in f:</code>", "<code>if text in line: count += 1</code>"],
    solution: "def count_matching(path, text):\n    count = 0\n    with open(path) as f:\n        for line in f:\n            if text in line:\n                count += 1\n    return count\n",
    tests: `
got = count_matching("data/history.log", '"status":500')
assert got == 16, f"expected 16 lines with a 500, got {got!r}"
got = count_matching("data/history.log", '"msg":"deploy"')
assert got == 2, f"counting a different text (deploys) gave {got!r}, expected 2"
`,
    success: "Correct: 16. with open(...) closes the file for you when the block ends, even if something fails.",
  },
  "p7-status-counts": {
    prompt: "<p>Write <code>status_counts(path)</code>: read the log, parse each line with <code>json.loads</code>, and return a dict of how many requests got each status code. Skip lines without a <code>\"status\"</code> (the deploys).</p>",
    starter: "import json\nfrom collections import Counter\n\n\ndef status_counts(path):\n    counts = Counter()\n    # for each line: entry = json.loads(line); if it has a status, count it\n    return dict(counts)\n\n\nprint(status_counts(\"data/history.log\"))\n",
    hints: ["A Counter starts at zero for anything: <code>counts[entry[\"status\"]] += 1</code>", "Check <code>if \"status\" in entry:</code> before counting."],
    solution: "import json\nfrom collections import Counter\n\n\ndef status_counts(path):\n    counts = Counter()\n    with open(path) as f:\n        for line in f:\n            entry = json.loads(line)\n            if \"status\" in entry:\n                counts[entry[\"status\"]] += 1\n    return dict(counts)\n",
    tests: `
got = status_counts("data/history.log")
want = {200: 953, 401: 58, 404: 30, 422: 25, 500: 16, 429: 12}
assert dict(got) == want, f"got {dict(got)!r}"
`,
    success: "Correct. 953 of 1,094 requests worked. Note the keys are numbers, because JSON numbers become Python ints.",
  },
  "p7-csv-overdue": {
    prompt: "<p><code>data/harbor_invoices.csv</code> is Maya's export from Lesson 6. Write <code>overdue_total(path)</code>: return the total of the <code>Amount</code> column for rows whose <code>Status</code> is <code>overdue</code>, as a number rounded to 2 decimals.</p>",
    starter: "import csv\n\n\ndef overdue_total(path):\n    total = 0\n    with open(path, newline=\"\") as f:\n        for row in csv.DictReader(f):\n            pass  # each row is a dict keyed by the header: row[\"Status\"], row[\"Amount\"]\n    return round(total, 2)\n\n\nprint(overdue_total(\"data/harbor_invoices.csv\"))\n",
    hints: ["CSV values are always text. <code>float(row[\"Amount\"])</code> turns \"1521.99\" into a number.", "<code>if row[\"Status\"] == \"overdue\": total += float(row[\"Amount\"])</code>"],
    solution: "import csv\n\n\ndef overdue_total(path):\n    total = 0\n    with open(path, newline=\"\") as f:\n        for row in csv.DictReader(f):\n            if row[\"Status\"] == \"overdue\":\n                total += float(row[\"Amount\"])\n    return round(total, 2)\n",
    tests: `
got = overdue_total("data/harbor_invoices.csv")
assert got == 11822.5, f"expected 11822.5, got {got!r}"
`,
    success: "Correct: $11,822.50 across 6 overdue invoices. csv.DictReader turns each row into a dict, so you use column names, not positions.",
  },

  // ---------- Lesson 13 ----------
  "p8-me": {
    prompt: "<p>Write <code>account_name()</code>: call <code>GET /api/v1/me</code> with the key from the <code>PAPERKITE_API_KEY</code> environment variable, and return the account's name from the JSON.</p>",
    starter: "import os\nimport requests\n\nAPI = os.environ[\"PAPERKITE_API\"]          # http://localhost:4747\nKEY = os.environ[\"PAPERKITE_API_KEY\"]\n\n\ndef account_name():\n    response = requests.get(f\"{API}/api/v1/me\", headers={})\n    return None\n\n\nprint(account_name())\n",
    hints: ["The header dict: <code>{\"Authorization\": f\"Bearer {KEY}\"}</code>", "<code>response.json()</code> gives you the body as a dict. The name is at <code>[\"account\"][\"name\"]</code>."],
    solution: "import os\nimport requests\n\nAPI = os.environ[\"PAPERKITE_API\"]\nKEY = os.environ[\"PAPERKITE_API_KEY\"]\n\n\ndef account_name():\n    response = requests.get(f\"{API}/api/v1/me\", headers={\"Authorization\": f\"Bearer {KEY}\"})\n    return response.json()[\"account\"][\"name\"]\n",
    tests: `
got = account_name()
assert got == "Harbor & Pine Bakery", f"expected 'Harbor & Pine Bakery', got {got!r}"
`,
    success: "Correct. Same request as your curl in Lesson 5, in three lines of Python.",
  },
  "p8-try-key": {
    prompt: "<p>Write <code>try_key(key)</code>: call <code>GET /api/v1/me</code> with that key and return a tuple <code>(status_code, message)</code>. <code>message</code> is the API's error message for a failure, or <code>None</code> for a success.</p>",
    starter: "import os\nimport requests\n\nAPI = os.environ[\"PAPERKITE_API\"]\n\n\ndef try_key(key):\n    pass\n\n\nfor key in [\"pk_test_harbor_reporting_7d2f\", \"pk_test_sprout_site_8n2c\", \"pk_test_typo\"]:\n    print(key, try_key(key))\n",
    hints: ["<code>response.status_code</code> is the number. <code>response.ok</code> is True for anything under 400.", "For a failure: <code>response.json()[\"error\"][\"message\"]</code>"],
    solution: "import os\nimport requests\n\nAPI = os.environ[\"PAPERKITE_API\"]\n\n\ndef try_key(key):\n    response = requests.get(f\"{API}/api/v1/me\", headers={\"Authorization\": f\"Bearer {key}\"})\n    if response.ok:\n        return (response.status_code, None)\n    return (response.status_code, response.json()[\"error\"][\"message\"])\n",
    tests: `
got = try_key("pk_test_harbor_reporting_7d2f")
assert got == (200, None), f"a good key should give (200, None), got {got!r}"
got = try_key("pk_test_sprout_site_8n2c")
assert got[0] == 403 and "starter plan" in (got[1] or ""), f"Lin's key should give a 403 about the starter plan, got {got!r}"
got = try_key("pk_test_typo")
assert got == (401, "Invalid API key."), f"a made-up key should give (401, 'Invalid API key.'), got {got!r}"
`,
    success: "Correct. That's a key-checker a support team could run when a customer says 'my key doesn't work.'",
  },
  "p8-params": {
    prompt: "<p>Write <code>invoice_numbers(status)</code>: list Harbor &amp; Pine's invoices with that status (up to 100) and return just their <code>number</code>s. Pass the query string with <code>params=</code> instead of building it by hand.</p>",
    starter: "import os\nimport requests\n\nAPI = os.environ[\"PAPERKITE_API\"]\nHEADERS = {\"Authorization\": f\"Bearer {os.environ['PAPERKITE_API_KEY']}\"}\n\n\ndef invoice_numbers(status):\n    pass\n\n\nprint(invoice_numbers(\"overdue\"))\n",
    hints: ["<code>requests.get(f\"{API}/api/v1/invoices\", headers=HEADERS, params={\"status\": status, \"limit\": 100})</code>", "The invoices are in <code>response.json()[\"data\"]</code>; a comprehension pulls out the numbers."],
    solution: "import os\nimport requests\n\nAPI = os.environ[\"PAPERKITE_API\"]\nHEADERS = {\"Authorization\": f\"Bearer {os.environ['PAPERKITE_API_KEY']}\"}\n\n\ndef invoice_numbers(status):\n    response = requests.get(f\"{API}/api/v1/invoices\", headers=HEADERS, params={\"status\": status, \"limit\": 100})\n    return [inv[\"number\"] for inv in response.json()[\"data\"]]\n",
    tests: `
got = invoice_numbers("overdue")
assert isinstance(got, list) and len(got) == 6, f"expected 6 overdue invoice numbers, got {got!r}"
assert sorted(invoice_numbers("void")) == ["INV-0021", "INV-0046"], f"void should be INV-0021 and INV-0046, got {invoice_numbers('void')!r}"
`,
    success: "Correct. requests builds ?status=overdue&limit=100 for you, including escaping anything unusual.",
  },

  // ---------- Lesson 14 ----------
  "p9-argparse": {
    prompt: "<p>Finish <code>parse_args(argv)</code> so a script accepts <code>--dry-run</code> (a flag, off unless given) and <code>--limit</code> (a whole number, default <code>50</code>). <code>parse_args([\"--dry-run\", \"--limit\", \"10\"])</code> should give <code>args.dry_run == True</code> and <code>args.limit == 10</code>.</p>",
    starter: "import argparse\n\n\ndef parse_args(argv):\n    parser = argparse.ArgumentParser(description=\"Example script.\")\n    # add the two options here\n    return parser.parse_args(argv)\n\n\nprint(parse_args([\"--dry-run\", \"--limit\", \"10\"]))\nprint(parse_args([]))\n",
    hints: ["A flag: <code>parser.add_argument(\"--dry-run\", action=\"store_true\")</code>. The dash becomes an underscore: <code>args.dry_run</code>.", "A number: <code>parser.add_argument(\"--limit\", type=int, default=50)</code>"],
    solution: "import argparse\n\n\ndef parse_args(argv):\n    parser = argparse.ArgumentParser(description=\"Example script.\")\n    parser.add_argument(\"--dry-run\", action=\"store_true\", help=\"show what would happen\")\n    parser.add_argument(\"--limit\", type=int, default=50, help=\"most tickets to touch\")\n    return parser.parse_args(argv)\n",
    tests: `
a = parse_args(["--dry-run", "--limit", "10"])
assert a.dry_run is True and a.limit == 10, f"with --dry-run --limit 10 you got {a}"
b = parse_args([])
assert b.dry_run is False and b.limit == 50, f"with no options you got {b}; defaults should be dry_run=False, limit=50"
assert isinstance(parse_args(["--limit", "7"]).limit, int), "limit should be an int, not the text '7' (use type=int)"
`,
    success: "Correct. argparse also gives you --help for free: it lists every option with its help text.",
  },
  "p9-dedupe": {
    prompt: "<p>Two searches returned overlapping tickets. Write <code>merge(*lists)</code>: combine any number of lists of ticket dicts into one list with each <code>id</code> once, sorted by id.</p>",
    starter: "def merge(*lists):\n    pass\n\n\nexport_hits = [{\"id\": 1154}, {\"id\": 1152}, {\"id\": 1160}]\ndownload_hits = [{\"id\": 1155}, {\"id\": 1160}]\nprint(merge(export_hits, download_hits))\n",
    hints: ["<code>*lists</code> means \"any number of arguments, as a tuple.\" Loop over it, then over each list.", "Use a dict keyed by id: <code>found[t[\"id\"]] = t</code>. Then <code>[found[i] for i in sorted(found)]</code>."],
    solution: "def merge(*lists):\n    found = {}\n    for tickets in lists:\n        for t in tickets:\n            found[t[\"id\"]] = t\n    return [found[i] for i in sorted(found)]\n",
    tests: `
got = merge([{"id": 1154}, {"id": 1152}, {"id": 1160}], [{"id": 1155}, {"id": 1160}])
assert [t["id"] for t in got] == [1152, 1154, 1155, 1160], f"got ids {[t['id'] for t in got]}"
assert merge() == [], "no lists should give []"
assert [t["id"] for t in merge([{"id": 3}], [{"id": 1}], [{"id": 2}, {"id": 3}])] == [1, 2, 3], "three lists should work too"
`,
    success: "Correct. Keying by id is the standard way to de-duplicate records, and it's exactly what find_tickets needs.",
  },

  // ---------- Lesson 15 ----------
  "p10-psycopg": {
    prompt: "<p>Write <code>team_emails(account_name)</code>: return the emails of every user on the account with that exact name, sorted alphabetically. Pass the name as a <strong>parameter</strong> (<code>%s</code>), never by pasting it into the SQL text.</p>",
    starter: "import psycopg\n\nDATABASE_URL = \"postgresql://learner@localhost:5488/paperkite\"\n\n\ndef team_emails(account_name):\n    with psycopg.connect(DATABASE_URL) as conn:\n        with conn.cursor() as cur:\n            cur.execute(\"select 1\")\n            rows = cur.fetchall()\n    return rows\n\n\nprint(team_emails(\"Harbor & Pine Bakery\"))\n",
    hints: ["The SQL is Lesson 1's join: users joined to accounts, filtered on <code>a.name = %s</code>, ordered by <code>u.email</code>.", "Parameters go in a tuple as the second argument: <code>cur.execute(sql, (account_name,))</code>. The trailing comma makes it a one-item tuple.", "<code>fetchall()</code> returns a list of tuples like <code>[(\"maya@…\",), …]</code>. Take the first item of each: <code>[row[0] for row in rows]</code>."],
    solution: "import psycopg\n\nDATABASE_URL = \"postgresql://learner@localhost:5488/paperkite\"\n\n\ndef team_emails(account_name):\n    with psycopg.connect(DATABASE_URL) as conn:\n        with conn.cursor() as cur:\n            cur.execute(\n                \"select u.email from users u join accounts a on a.id = u.account_id where a.name = %s order by u.email\",\n                (account_name,),\n            )\n            rows = cur.fetchall()\n    return [row[0] for row in rows]\n",
    tests: `
got = team_emails("Harbor & Pine Bakery")
assert got == ["Priya.Shah@HarborAndPine.com", "maya@harborandpine.com", "sam@harborandpine.co", "tom@harborandpine.com"], f"got {got!r}"
got = team_emails("Robert'); drop table users;--")
assert got == [], f"a hostile name should just match nothing, got {got!r}"
import inspect
assert "%s" in inspect.getsource(team_emails), "use a %s parameter instead of putting the name into the SQL text"
`,
    success: "Correct. Note the order: capital letters sort before lowercase. And the hostile name matched nothing instead of running, because parameters are never treated as SQL.",
  },
}

Object.assign(PY_EXERCISES, PY_FOUNDATIONS)
