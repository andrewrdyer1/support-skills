// The in-page Python exercises for the foundation lessons (7 to 10). Same
// shape as py_exercises.mjs: `tests` is hidden Python that runs after your code,
// and can see your variables and functions plus OUTPUT, everything you printed.
//
// Python code is in template literals so it reads as written. An f-string that
// starts with a dollar sign has to be written \${ here, or JavaScript would
// treat it as a placeholder.

export const PY_FOUNDATIONS = {
  // ---------- Lesson 7 ----------
  "py1-print": {
    prompt: "<p>Print exactly two lines: <code>Paperkite support</code>, then <code>Open tickets: 71</code>. Make the second line with an f-string that uses the <code>open_tickets</code> variable, so it would still be right if the number changed.</p>",
    starter: `open_tickets = 71

print()
`,
    hints: ["The first line is plain text in quotes: <code>print(\"Paperkite support\")</code>.", "An f-string has an <code>f</code> before the quote and the variable in curly brackets: <code>f\"Open tickets: {open_tickets}\"</code>."],
    solution: `open_tickets = 71

print("Paperkite support")
print(f"Open tickets: {open_tickets}")
`,
    tests: `
lines = OUTPUT.strip().splitlines()
assert lines == ["Paperkite support", "Open tickets: 71"], f"your output was {lines!r}; expected ['Paperkite support', 'Open tickets: 71']"
assert open_tickets == 71, "keep open_tickets = 71 at the top"
`,
    success: "Correct. print plus an f-string is how every report you write will start.",
  },
  "py1-math": {
    prompt: "<p>Harbor &amp; Pine's biggest invoice is <code>amount_cents = 396800</code>. Set <code>dollars</code> to the amount in dollars, <code>discount</code> to 10% of that, and <code>after</code> to the dollars minus the discount. Then print <code>after</code> as money, like <code>$3,571.20</code>.</p>",
    starter: `amount_cents = 396800

dollars =
discount =
after =

print()
`,
    hints: ["Cents to dollars is dividing by 100. 10% is multiplying by <code>0.10</code>.", "To print money: <code>print(f\"\${after:,.2f}\")</code>. The <code>$</code> is just text; <code>:,.2f</code> adds the comma and exactly 2 decimals."],
    solution: `amount_cents = 396800

dollars = amount_cents / 100
discount = dollars * 0.10
after = dollars - discount

print(f"\${after:,.2f}")
`,
    tests: `
assert dollars == 3968, f"dollars is {dollars!r}; it should be 3968.0"
assert abs(discount - 396.8) < 0.001, f"discount is {discount!r}; 10% of 3968 is 396.8"
assert abs(after - 3571.2) < 0.001, f"after is {after!r}; it should be 3571.2"
assert "$3,571.20" in OUTPUT, f"you printed {OUTPUT.strip()!r}; expected $3,571.20"
`,
    success: "Correct. Note dollars came out as 3968.0, not 3968: dividing with / always gives a float in Python.",
  },
  "py1-strings": {
    prompt: "<p>Here's an email the way a customer typed it. Set <code>email</code> to it with the spaces removed and in lowercase, <code>domain</code> to the part after the <code>@</code>, and <code>is_typo</code> to <code>True</code> if the domain ends in <code>.co</code>.</p>",
    starter: `raw = "  SAM@HarborAndPine.co  "

email =
domain =
is_typo =

print(email, domain, is_typo)
`,
    hints: ["Methods chain: <code>raw.strip().lower()</code>.", "<code>email.split(\"@\")</code> gives a list of two parts; the domain is <code>[1]</code>.", "<code>domain.endswith(\".co\")</code> is already <code>True</code> or <code>False</code>. No <code>if</code> needed."],
    solution: `raw = "  SAM@HarborAndPine.co  "

email = raw.strip().lower()
domain = email.split("@")[1]
is_typo = domain.endswith(".co")

print(email, domain, is_typo)
`,
    tests: `
assert email == "sam@harborandpine.co", f"email is {email!r}"
assert domain == "harborandpine.co", f"domain is {domain!r}"
assert is_typo is True, f"is_typo is {is_typo!r}; it should be True"
`,
    success: "Correct. That's Lesson 1's typo, found in three lines of Python.",
  },
  "py1-convert": {
    prompt: "<p>Values read from a CSV are always text, even numbers. Here's one row's seats and price per seat. Set <code>total</code> to seats times price, as a number, and print <code>Total: 37.5</code>.</p>",
    starter: `seats = "3"
price = "12.50"

total = seats * price
print(f"Total: {total}")
`,
    hints: ["Run the starter first and read the error: you can't multiply text by text.", "<code>int(seats)</code> turns <code>\"3\"</code> into <code>3</code>; <code>float(price)</code> turns <code>\"12.50\"</code> into <code>12.5</code>."],
    solution: `seats = "3"
price = "12.50"

total = int(seats) * float(price)
print(f"Total: {total}")
`,
    tests: `
assert total == 37.5, f"total is {total!r}; 3 times 12.50 is 37.5"
assert "Total: 37.5" in OUTPUT, f"you printed {OUTPUT.strip()!r}"
`,
    success: "Correct. \"Why is my number wrong?\" in a script is usually text that was never converted.",
  },
  "py1-slice": {
    prompt: "<p>Invoice numbers look like <code>INV-0046</code>. Set <code>number</code> to the number part as an int (<code>46</code>), and <code>next_invoice</code> to the next invoice number in the same format (<code>INV-0047</code>).</p>",
    starter: `text = "INV-0046"

number =
next_invoice =

print(number, next_invoice)
`,
    hints: ["<code>text[4:]</code> is everything from position 4 on: <code>\"0046\"</code>. Then <code>int(...)</code> it.", "<code>{n:04d}</code> in an f-string pads a whole number to 4 digits with zeros: <code>f\"INV-{number + 1:04d}\"</code>."],
    solution: `text = "INV-0046"

number = int(text[4:])
next_invoice = f"INV-{number + 1:04d}"

print(number, next_invoice)
`,
    tests: `
assert number == 46 and isinstance(number, int), f"number is {number!r}; it should be the int 46"
assert next_invoice == "INV-0047", f"next_invoice is {next_invoice!r}"
`,
    success: "Correct. Slicing and padding: small tools you'll reach for constantly when IDs come in as text.",
  },

  // ---------- Lesson 8 ----------
  "py2-index": {
    prompt: "<p>Using the <code>statuses</code> list, set <code>first</code> to its first item, <code>last</code> to its last item, <code>how_many</code> to how many items it has, and <code>open_count</code> to how many are <code>\"open\"</code>.</p>",
    starter: `statuses = ["open", "pending", "open", "solved", "closed", "open"]

first =
last =
how_many =
open_count =

print(first, last, how_many, open_count)
`,
    hints: ["Positions start at 0, and <code>-1</code> means the last one.", "<code>len(statuses)</code> counts the items; <code>statuses.count(\"open\")</code> counts one value."],
    solution: `statuses = ["open", "pending", "open", "solved", "closed", "open"]

first = statuses[0]
last = statuses[-1]
how_many = len(statuses)
open_count = statuses.count("open")

print(first, last, how_many, open_count)
`,
    tests: `
assert first == "open", f"first is {first!r}"
assert last == "open", f"last is {last!r}; statuses[-1] is the last item"
assert how_many == 6, f"how_many is {how_many!r}"
assert open_count == 3, f"open_count is {open_count!r}"
`,
    success: "Correct.",
  },
  "py2-total-loop": {
    prompt: "<p>Using a <code>for</code> loop, set <code>total</code> to the sum of <code>amounts</code> and <code>biggest</code> to the largest one. (Python has <code>sum()</code> and <code>max()</code>, and you'll use them later. Write the loop once so you know what they do.)</p>",
    starter: `amounts = [713.50, 3968.00, 2260.25, 1663.99]

total = 0
biggest = 0
for amount in amounts:
    # add to total, and update biggest if this amount is larger
    pass

print(round(total, 2), biggest)
`,
    hints: ["Inside the loop: <code>total = total + amount</code> (or the shorthand <code>total += amount</code>).", "<code>if amount &gt; biggest:</code> then <code>biggest = amount</code>, indented one more level."],
    solution: `amounts = [713.50, 3968.00, 2260.25, 1663.99]

total = 0
biggest = 0
for amount in amounts:
    total += amount
    if amount > biggest:
        biggest = amount

print(round(total, 2), biggest)
`,
    tests: `
assert abs(total - 8605.74) < 0.001, f"total is {total!r}; it should be 8605.74"
assert biggest == 3968.0, f"biggest is {biggest!r}"
`,
    success: "Correct. Start with an empty total, update it each time round: that's the shape of most loops you'll write.",
  },
  "py2-filter": {
    prompt: "<p>Write <code>urgent_ids(tickets)</code>: return a list of the <code>id</code>s of tickets whose priority is <code>\"urgent\"</code>, in the order they appear. Build the list with a loop and <code>.append()</code>.</p>",
    starter: `def urgent_ids(tickets):
    ids = []
    # loop, check the priority, append the id
    return ids


tickets = [
    {"id": 1201, "priority": "urgent"},
    {"id": 1202, "priority": "low"},
    {"id": 1203, "priority": "urgent"},
]
print(urgent_ids(tickets))
`,
    hints: ["<code>for ticket in tickets:</code> gives you one dict at a time.", "<code>if ticket[\"priority\"] == \"urgent\":</code> then <code>ids.append(ticket[\"id\"])</code>."],
    solution: `def urgent_ids(tickets):
    ids = []
    for ticket in tickets:
        if ticket["priority"] == "urgent":
            ids.append(ticket["id"])
    return ids
`,
    tests: `
t = [{"id": 1, "priority": "urgent"}, {"id": 2, "priority": "low"}, {"id": 3, "priority": "high"}, {"id": 4, "priority": "urgent"}]
got = urgent_ids(t)
assert got == [1, 4], f"urgent_ids returned {got!r}, expected [1, 4]"
assert urgent_ids([]) == [], "no tickets should give an empty list"
assert urgent_ids([{"id": 9, "priority": "low"}]) == [], "no urgent tickets should give an empty list"
`,
    success: "Correct. Loop, check, collect: SQL's where, written out by hand.",
  },
  "py2-plan-price": {
    prompt: "<p>Write <code>describe(plan)</code> using the <code>PRICES</code> dict (prices in cents). For a known plan return text like <code>pro: $49.00/month</code>; for anything else return <code>unknown plan: gold</code>. Don't let an unknown plan crash it.</p>",
    starter: `PRICES = {"free": 0, "starter": 1500, "pro": 4900, "business": 14900}


def describe(plan):
    price = PRICES[plan]
    return f"{plan}: \${price / 100:.2f}/month"


print(describe("pro"))
print(describe("gold"))
`,
    hints: ["Run it: <code>PRICES[\"gold\"]</code> raises a <code>KeyError</code>.", "<code>PRICES.get(plan)</code> returns <code>None</code> instead of crashing. Then <code>if price is None:</code> return the unknown text."],
    solution: `PRICES = {"free": 0, "starter": 1500, "pro": 4900, "business": 14900}


def describe(plan):
    price = PRICES.get(plan)
    if price is None:
        return f"unknown plan: {plan}"
    return f"{plan}: \${price / 100:.2f}/month"
`,
    tests: `
for plan, want in [("pro", "pro: $49.00/month"), ("starter", "starter: $15.00/month"), ("gold", "unknown plan: gold")]:
    got = describe(plan)
    assert got == want, f"describe({plan!r}) returned {got!r}, expected {want!r}"
got = describe("free")
assert got == "free: $0.00/month", f"describe('free') returned {got!r}. A price of 0 is a real price: test 'is None', not 'if not price'"
`,
    success: "Correct, and the free plan didn't trip you up: 0 is falsy, so 'if not price' would have called it unknown.",
  },
  "py2-nested": {
    prompt: "<p>Help desk APIs return tickets with dicts and lists inside them. Write <code>requester_domain(ticket)</code>, returning the part of the requester's email after the <code>@</code>, and <code>has_tag(ticket, tag)</code>, returning <code>True</code> if the tag is in the ticket's tags.</p>",
    starter: `ticket = {
    "id": 1152,
    "subject": "CSV export says Something went wrong",
    "requester": {"name": "Maya Okafor", "email": "maya@harborandpine.com"},
    "tags": ["export", "bug"],
}


def requester_domain(ticket):
    pass


def has_tag(ticket, tag):
    pass


print(requester_domain(ticket), has_tag(ticket, "export"), has_tag(ticket, "billing"))
`,
    hints: ["Go in one level at a time: <code>ticket[\"requester\"][\"email\"]</code>.", "<code>tag in ticket[\"tags\"]</code> is already True or False."],
    solution: `def requester_domain(ticket):
    return ticket["requester"]["email"].split("@")[1]


def has_tag(ticket, tag):
    return tag in ticket["tags"]
`,
    tests: `
t = {"requester": {"name": "Lin", "email": "lin@sprouttutoring.com"}, "tags": ["api", "billing"]}
assert requester_domain(t) == "sprouttutoring.com", f"requester_domain returned {requester_domain(t)!r}"
assert has_tag(t, "api") is True, "has_tag(ticket, 'api') should be True"
assert has_tag(t, "export") is False, "has_tag(ticket, 'export') should be False"
`,
    success: "Correct. Reading nested JSON is most of the work in any API script.",
  },
  "py2-group-sum": {
    prompt: "<p>Write <code>totals_by_client(invoices)</code>: return a dict of each client's total amount. It's SQL's <code>select client, sum(amount) … group by client</code>.</p>",
    starter: `def totals_by_client(invoices):
    totals = {}
    for invoice in invoices:
        client = invoice["client"]
        # add invoice["amount"] to totals[client]
    return totals


invoices = [
    {"client": "Westfield Motors", "amount": 713.50},
    {"client": "Greenway Farms", "amount": 3968.00},
    {"client": "Westfield Motors", "amount": 450.00},
]
print(totals_by_client(invoices))
`,
    hints: ["The first time you see a client, it isn't in the dict yet, so <code>totals[client] += …</code> raises a KeyError.", "<code>totals[client] = totals.get(client, 0) + invoice[\"amount\"]</code>: start from 0 if it's missing."],
    solution: `def totals_by_client(invoices):
    totals = {}
    for invoice in invoices:
        client = invoice["client"]
        totals[client] = totals.get(client, 0) + invoice["amount"]
    return totals
`,
    tests: `
got = totals_by_client([{"client": "A", "amount": 10}, {"client": "B", "amount": 5}, {"client": "A", "amount": 2.5}])
assert got == {"A": 12.5, "B": 5}, f"got {got!r}"
assert totals_by_client([]) == {}, "no invoices should give an empty dict"
`,
    success: "Correct. You'll use .get(key, 0) + … in nearly every summary script.",
  },

  // ---------- Lesson 9 ----------
  "py3-call": {
    prompt: "<p>The function is already defined, but nothing calls it, so running this prints nothing. Below it, <strong>call</strong> <code>ticket_label</code> for ticket <code>1152</code> with the subject <code>\"CSV export broken\"</code>, store the answer in <code>label</code>, and print <code>label</code>.</p>",
    starter: `def ticket_label(ticket_id, subject):
    return f"#{ticket_id}: {subject}"


label = None
`,
    hints: ["A call is the function's name with the values in brackets: <code>ticket_label(1152, \"CSV export broken\")</code>.", "<code>label = ticket_label(1152, \"CSV export broken\")</code>, then <code>print(label)</code> on the next line."],
    solution: `def ticket_label(ticket_id, subject):
    return f"#{ticket_id}: {subject}"


label = ticket_label(1152, "CSV export broken")
print(label)
`,
    tests: `
assert label is not None, "label is still None. Set it to the result of calling ticket_label(...)."
assert label == "#1152: CSV export broken", f"label is {label!r}; expected '#1152: CSV export broken'. Check the order of the arguments."
assert "#1152: CSV export broken" in OUTPUT, "label is right; now print it too."
`,
    success: "Correct. Define once, call as often as you like: that's the whole point of a function.",
  },
  "py3-params": {
    prompt: "<p>Write <code>reply_subject(ticket_id, subject)</code>. It should <strong>return</strong> the subject line for a reply: <code>Re: CSV export broken [#1152]</code> for ticket 1152.</p>",
    starter: `def reply_subject(ticket_id, subject):
    pass   # replace this line


print(reply_subject(1152, "CSV export broken"))
print(reply_subject(1188, "Card declined"))
`,
    hints: ["<code>pass</code> means \"do nothing\". Replace it with a <code>return</code>.", "Inside the function, <code>ticket_id</code> and <code>subject</code> hold whatever this call passed. Put them in an f-string.", "<code>return f\"Re: {subject} [#{ticket_id}]\"</code>"],
    solution: `def reply_subject(ticket_id, subject):
    return f"Re: {subject} [#{ticket_id}]"
`,
    tests: `
for args, want in [((1152, "CSV export broken"), "Re: CSV export broken [#1152]"), ((7, "Hi"), "Re: Hi [#7]")]:
    got = reply_subject(*args)
    assert got is not None, "reply_subject returned None. Did you print instead of return?"
    assert got == want, f"reply_subject{args!r} returned {got!r}, expected {want!r}"
`,
    success: "Correct. Notice the order: the id comes first in the brackets but last in the text. Parameters are just names you can use anywhere in the body.",
  },
  "py3-return": {
    prompt: "<p>This function looks like it works when you run it, but <code>result</code> ends up <code>None</code>. Fix it so it <strong>returns</strong> the count.</p>",
    starter: `def overdue_count(statuses):
    count = statuses.count("overdue")
    print(count)


result = overdue_count(["paid", "overdue", "sent", "overdue"])
print("result is", result)
`,
    hints: ["<code>print</code> shows a value on screen; <code>return</code> hands it back to whoever called the function. The caller only gets what's returned.", "Replace <code>print(count)</code> with <code>return count</code>."],
    solution: `def overdue_count(statuses):
    count = statuses.count("overdue")
    return count
`,
    tests: `
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    got = overdue_count(["paid", "overdue", "overdue", "overdue"])
assert got is not None, "overdue_count still returns None. It needs a return statement."
assert got == 3, f"overdue_count returned {got!r}, expected 3"
`,
    success: "Correct. Print versus return is the most common beginner bug there is. Functions return; only the main part of a script prints.",
  },
  "py3-bool": {
    prompt: "<p>Write <code>is_paid_plan(plan)</code>: return <code>True</code> for <code>\"starter\"</code>, <code>\"pro\"</code> and <code>\"business\"</code>, and <code>False</code> for anything else. Try returning the condition itself, with no <code>if</code>.</p>",
    starter: `def is_paid_plan(plan):
    pass


print(is_paid_plan("pro"), is_paid_plan("free"))
`,
    hints: ["<code>plan in (\"starter\", \"pro\", \"business\")</code> is already True or False.", "<code>return plan in (\"starter\", \"pro\", \"business\")</code>. An if/else that returns True or False also passes."],
    solution: `def is_paid_plan(plan):
    return plan in ("starter", "pro", "business")
`,
    tests: `
for plan, want in [("starter", True), ("pro", True), ("business", True), ("free", False), ("gold", False), ("", False)]:
    got = is_paid_plan(plan)
    assert got is want, f"is_paid_plan({plan!r}) returned {got!r}, expected {want!r}"
`,
    success: "Correct. A yes/no function can usually be a single return line.",
  },
  "py3-early": {
    prompt: "<p>Write <code>first_name(user)</code> for the greeting in a reply. Return the first word of <code>user[\"name\"]</code>. If the name is missing, <code>None</code>, or empty, return <code>\"there\"</code> instead, so the reply says <em>Hi there</em>. Use a guard at the top.</p>",
    starter: `def first_name(user):
    pass


print("Hi", first_name({"name": "Maya Okafor"}))
print("Hi", first_name({"name": ""}))
print("Hi", first_name({}))
`,
    hints: ["Start with <code>name = user.get(\"name\")</code>, so a missing key gives None instead of a KeyError.", "Here an empty name should count as no name, so <code>if not name: return \"there\"</code> is the right test: it catches None and \"\".", "After the guard: <code>return name.split()[0]</code>. <code>split()</code> with no argument splits on spaces."],
    solution: `def first_name(user):
    name = user.get("name")
    if not name:
        return "there"
    return name.split()[0]
`,
    tests: `
cases = [({"name": "Maya Okafor"}, "Maya"), ({"name": "Sam"}, "Sam"), ({"name": ""}, "there"), ({"name": None}, "there"), ({}, "there")]
for user, want in cases:
    got = first_name(user)
    assert got == want, f"first_name({user!r}) returned {got!r}, expected {want!r}"
`,
    success: "Correct. Here an empty name should count as no name, so if not name is the right test. With a price, where 0 is real, you'd use is None.",
  },
  "py3-default": {
    prompt: "<p>Write <code>format_money(cents, symbol=\"$\")</code>: return the amount as money text, like <code>$1,234.50</code>. The symbol has a <strong>default</strong>, so callers can leave it out, or pass <code>\"€\"</code>.</p>",
    starter: `def format_money(cents, symbol="$"):
    pass


print(format_money(123450))
print(format_money(99, "€"))
`,
    hints: ["Divide by 100 to get dollars, then format with <code>:,.2f</code>.", "<code>return f\"{symbol}{cents / 100:,.2f}\"</code>"],
    solution: `def format_money(cents, symbol="$"):
    return f"{symbol}{cents / 100:,.2f}"
`,
    tests: `
for args, want in [((123450,), "$1,234.50"), ((99, "€"), "€0.99"), ((0,), "$0.00"), ((100000000,), "$1,000,000.00")]:
    got = format_money(*args)
    assert got == want, f"format_money{args!r} returned {got!r}, expected {want!r}"
`,
    success: "Correct. A small, tested helper like this saves you from formatting money five different ways in one script.",
  },
  "py3-plural": {
    prompt: "<p>Write <code>ticket_count(n)</code>: return <code>\"1 ticket\"</code> when <code>n</code> is 1, and <code>\"0 tickets\"</code>, <code>\"5 tickets\"</code> and so on otherwise. Use a one-line if.</p>",
    starter: `def ticket_count(n):
    pass


print(ticket_count(1), "|", ticket_count(5), "|", ticket_count(0))
`,
    hints: ["The shape is: value if true, <code>if</code> condition, <code>else</code> value if false.", "<code>return f\"{n} ticket\" if n == 1 else f\"{n} tickets\"</code>"],
    solution: `def ticket_count(n):
    return f"{n} ticket" if n == 1 else f"{n} tickets"
`,
    tests: `
for n, want in [(1, "1 ticket"), (0, "0 tickets"), (5, "5 tickets"), (21, "21 tickets")]:
    got = ticket_count(n)
    assert got == want, f"ticket_count({n}) returned {got!r}, expected {want!r}"
`,
    success: "Correct. Small, but a report that says \"1 tickets\" is the kind of thing customers notice.",
  },
  "py3-compose": {
    prompt: "<p><code>format_money</code> is written for you. Write <code>balance_line(account)</code> so it returns, for example, <code>Harbor &amp; Pine Bakery owes $713.50</code>, using <code>format_money</code> for the amount. The account's balance is in cents.</p>",
    starter: `def format_money(cents):
    return f"\${cents / 100:,.2f}"


def balance_line(account):
    pass


print(balance_line({"name": "Harbor & Pine Bakery", "balance_cents": 71350}))
`,
    hints: ["You need two values from the dict: <code>account[\"name\"]</code> and <code>account[\"balance_cents\"]</code>.", "Call <code>format_money(account[\"balance_cents\"])</code> to get the money text, then put both into an f-string.", "<code>return f\"{account['name']} owes {format_money(account['balance_cents'])}\"</code>"],
    solution: `def format_money(cents):
    return f"\${cents / 100:,.2f}"


def balance_line(account):
    return f"{account['name']} owes {format_money(account['balance_cents'])}"
`,
    tests: `
cases = [({"name": "Harbor & Pine Bakery", "balance_cents": 71350}, "Harbor & Pine Bakery owes $713.50"), ({"name": "Lakeshore Group", "balance_cents": 1599350}, "Lakeshore Group owes $15,993.50"), ({"name": "Sprout Tutoring", "balance_cents": 0}, "Sprout Tutoring owes $0.00")]
for account, want in cases:
    got = balance_line(account)
    assert got == want, f"balance_line({account!r}) returned {got!r}, expected {want!r}"
`,
    success: "Correct. balance_line doesn't know or care how money is formatted. Change format_money once and every line that uses it follows.",
  },
  "py3-read-csv": {
    prompt: "<p>Write <code>statuses_in(path)</code>: open the CSV at <code>path</code> and return a list of every row's <code>Status</code> value, in order. Try it on <code>data/harbor_invoices.csv</code>.</p>",
    starter: `import csv


def statuses_in(path):
    statuses = []
    with open(path) as f:
        for row in csv.DictReader(f):
            pass
    return statuses


statuses = statuses_in("data/harbor_invoices.csv")
print(len(statuses), statuses[:5])
`,
    hints: ["<code>csv.DictReader</code> gives you each row as a dict, keyed by the header line: <code>row[\"Status\"]</code>.", "<code>statuses.append(row[\"Status\"])</code> inside the loop."],
    solution: `import csv


def statuses_in(path):
    statuses = []
    with open(path) as f:
        for row in csv.DictReader(f):
            statuses.append(row["Status"])
    return statuses
`,
    tests: `
import csv as _csv
with open("data/harbor_invoices.csv") as _f:
    want = [r["Status"] for r in _csv.DictReader(_f)]
got = statuses_in("data/harbor_invoices.csv")
assert got == want, f"you returned {len(got)} statuses starting {got[:3]!r}; the file has {len(want)} starting {want[:3]!r}"
`,
    success: "Correct: 44 rows. Open, loop, collect. Every file-reading script starts like this.",
  },
  "py3-json": {
    prompt: "<p>Each line of a JSON log is one JSON object. Write <code>server_errors(lines)</code>: return how many lines have a <code>status</code> of 500 or more. Lines without a <code>status</code> (like deploy notes) don't count.</p>",
    starter: `import json


def server_errors(lines):
    count = 0
    for line in lines:
        entry = json.loads(line)
        # count it if it has a status of 500 or more
    return count


lines = [
    '{"level": "info", "path": "/api/v1/invoices", "status": 200}',
    '{"level": "error", "path": "/api/v1/invoices/export", "status": 500}',
    '{"level": "info", "msg": "deploy", "version": "2026.10.28.1"}',
]
print(server_errors(lines))
`,
    hints: ["<code>json.loads(line)</code> turns the text into a dict.", "Use <code>entry.get(\"status\")</code>: the deploy line has no status, so <code>entry[\"status\"]</code> would crash.", "<code>None &gt;= 500</code> is a TypeError, so check it isn't None first: <code>status is not None and status &gt;= 500</code>."],
    solution: `import json


def server_errors(lines):
    count = 0
    for line in lines:
        entry = json.loads(line)
        status = entry.get("status")
        if status is not None and status >= 500:
            count += 1
    return count
`,
    tests: `
lines = ['{"status": 200}', '{"status": 500}', '{"msg": "deploy"}', '{"status": 503}', '{"status": 404}']
got = server_errors(lines)
assert got == 2, f"server_errors returned {got!r}, expected 2 (the 500 and the 503)"
assert server_errors([]) == 0, "no lines should give 0"
`,
    success: "Correct, and the deploy line didn't crash it. Real logs always have a few lines that don't look like the rest.",
  },
  "py3-fix-keyerror": {
    prompt: "<p>Run this. It crashes on the second ticket. Fix <code>assignee_name</code> so a ticket with no assignee, or an assignee of <code>None</code>, returns <code>\"Unassigned\"</code>.</p>",
    starter: `def assignee_name(ticket):
    return ticket["assignee"].title()


tickets = [{"id": 1, "assignee": "bea"}, {"id": 2}, {"id": 3, "assignee": None}]
for t in tickets:
    print(t["id"], assignee_name(t))
`,
    hints: ["Read the last line of the traceback: <code>KeyError: 'assignee'</code>. Ticket 2 has no such key.", "<code>name = ticket.get(\"assignee\")</code> gives <code>None</code> for both problem cases. Then <code>if name is None: return \"Unassigned\"</code>."],
    solution: `def assignee_name(ticket):
    name = ticket.get("assignee")
    if name is None:
        return "Unassigned"
    return name.title()
`,
    tests: `
cases = [({"assignee": "bea"}, "Bea"), ({}, "Unassigned"), ({"assignee": None}, "Unassigned"), ({"assignee": "dani"}, "Dani")]
for ticket, want in cases:
    got = assignee_name(ticket)
    assert got == want, f"assignee_name({ticket!r}) returned {got!r}, expected {want!r}"
`,
    success: "Correct. You fixed both bugs: the missing key (KeyError) and the None value, which would have been AttributeError: 'NoneType' object has no attribute 'title'.",
  },
  "py3-fix-type": {
    prompt: "<p>One more crash. Fix <code>total_line</code> so it returns <code>Total: 12.5</code> for the example.</p>",
    starter: `def total_line(amounts):
    total = sum(amounts)
    return "Total: " + total


print(total_line([10, 2.5]))
`,
    hints: ["The error is <code>TypeError: can only concatenate str (not \"float\") to str</code>: <code>+</code> can't join text and a number.", "Use an f-string: <code>return f\"Total: {total}\"</code>."],
    solution: `def total_line(amounts):
    total = sum(amounts)
    return f"Total: {total}"
`,
    tests: `
got = total_line([10, 2.5])
assert got == "Total: 12.5", f"total_line([10, 2.5]) returned {got!r}"
got = total_line([1, 2])
assert got == "Total: 3", f"total_line([1, 2]) returned {got!r}"
`,
    success: "Correct. f-strings convert for you, which is one more reason to prefer them over +.",
  },
  "py3-fix-syntax": {
    prompt: "<p>This one won't even start: run it and you get a <code>SyntaxError</code>, with no output. There are two typing mistakes. Fix the first, run again, and Python will point at the second.</p>",
    starter: `def needs_reply(ticket)
    if ticket["status"] = "open":
        return True
    return False


print(needs_reply({"status": "open"}), needs_reply({"status": "solved"}))
`,
    hints: ["Every <code>def</code> and <code>if</code> line ends with a colon.", "One <code>=</code> stores a value; comparing needs two: <code>==</code>.", "Once it runs, you could also shorten it to <code>return ticket[\"status\"] == \"open\"</code>."],
    solution: `def needs_reply(ticket):
    if ticket["status"] == "open":
        return True
    return False
`,
    tests: `
for ticket, want in [({"status": "open"}, True), ({"status": "solved"}, False), ({"status": "pending"}, False)]:
    got = needs_reply(ticket)
    assert got is want, f"needs_reply({ticket!r}) returned {got!r}, expected {want!r}"
`,
    success: "Correct. SyntaxErrors feel scary because nothing runs, but they're almost always one character: a colon, a bracket, a quote, or = for ==.",
  },

  // ---------- Lesson 10 ----------
  // (py3-read-csv and py3-json above also appear in Lesson 10: they were written
  // for the old Lesson 9, before it was split.)
  "py4-lines": {
    prompt: "<p>Write <code>header_and_count(path)</code>: open the file at <code>path</code> and return two things, the first line with its line break stripped, and how many lines come <em>after</em> it. Return them as <code>header, count</code>.</p>",
    starter: `def header_and_count(path):
    with open(path) as f:
        lines = f.readlines()
    header = ""
    count = 0
    return header, count


header, count = header_and_count("data/harbor_invoices.csv")
print(repr(header))
print(count, "rows")
`,
    hints: ["After the <code>with</code> block, <code>lines</code> is a list of strings. The first one is <code>lines[0]</code>.", "<code>lines[0].strip()</code> removes the <code>\\n</code>. Every line after the header is one row: <code>len(lines) - 1</code>."],
    solution: `def header_and_count(path):
    with open(path) as f:
        lines = f.readlines()
    header = lines[0].strip()
    count = len(lines) - 1
    return header, count
`,
    tests: `
h, c = header_and_count("data/harbor_invoices.csv")
assert h == "Number,Client,Status,Amount,Currency,Issued,Due,Paid on", f"header was {h!r}. Did you strip the line break?"
assert c == 44, f"count was {c!r}; the file has 45 lines, and the first is the header"
import tempfile as _t, os as _os
_d = _t.mkdtemp()
_p = _os.path.join(_d, "x.csv")
with open(_p, "w") as _f:
    _f.write("a,b\\n1,2\\n")
assert header_and_count(_p) == ("a,b", 1), f"for a two-line file it returned {header_and_count(_p)!r}, expected ('a,b', 1)"
`,
    success: "Correct: 44 invoices under one header. Returning two values with a comma is common; the caller unpacks them the same way.",
  },
  "py4-csv-total": {
    prompt: "<p>Write <code>paid_total(path)</code>: read the invoices CSV and return the total <code>Amount</code> of the invoices whose <code>Status</code> is <code>paid</code>, as a number rounded to 2 decimals.</p>",
    starter: `import csv


def paid_total(path):
    total = 0
    with open(path) as f:
        for row in csv.DictReader(f):
            pass
    return round(total, 2)


print(paid_total("data/harbor_invoices.csv"))
`,
    hints: ["Inside the loop: <code>if row[\"Status\"] == \"paid\":</code>", "<code>row[\"Amount\"]</code> is text. <code>total = total + float(row[\"Amount\"])</code>."],
    solution: `import csv


def paid_total(path):
    total = 0
    with open(path) as f:
        for row in csv.DictReader(f):
            if row["Status"] == "paid":
                total = total + float(row["Amount"])
    return round(total, 2)
`,
    tests: `
got = paid_total("data/harbor_invoices.csv")
assert not isinstance(got, str), f"paid_total returned text, {got!r}. Convert each Amount with float() before adding."
assert got == 70629.46, f"paid_total returned {got!r}, expected 70629.46 (the 36 paid invoices)"
`,
    success: "Correct: $70,629.46 across 36 paid invoices. Filter, convert, add up: that's most CSV questions.",
  },
}
