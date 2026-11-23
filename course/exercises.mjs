// Every SQL exercise in the course. The checker runs `solution` and your query
// and compares the rows. Column names don't matter; the values and the number of
// columns do. `ordered: true` means the row order has to match too.
//
// `write: true` exercises (Lesson 3) run in the practice sandbox instead: your
// statement and then `probe` run in one transaction that is rolled back, and the
// checker compares how many rows you changed and what `probe` sees afterwards.
// Ids keep the lesson number they were written under: the incident lesson's
// exercises are still `l5-*` after it moved to Lesson 6.

export const EXERCISES = {
  // ---------- Lesson 1 ----------
  "l1-columns": {
    prompt: "<p>Show the <code>name</code>, <code>plan_id</code> and <code>country</code> of <strong>every</strong> account. No limit this time.</p>",
    starter: "select \nfrom accounts;",
    hints: ["List the three columns after <code>select</code>, separated by commas.", "Leave out <code>limit</code> so every row comes back."],
    solution: "select name, plan_id, country\nfrom accounts;",
    success: "Correct. 240 accounts, three columns each.",
  },
  "l1-past-due": {
    prompt: "<p>Which accounts on the <code>pro</code> plan are <code>past_due</code>? Show their <code>id</code> and <code>name</code>.</p>",
    starter: "select id, name\nfrom accounts\nwhere ",
    hints: ["You need two conditions joined with <code>and</code>.", "Both values are text, so they go in single quotes: <code>plan_id = 'pro'</code>."],
    solution: "select id, name\nfrom accounts\nwhere plan_id = 'pro' and status = 'past_due';",
    success: "Correct. These are customers whose card failed. Billing tickets from them are worth a priority bump.",
  },
  "l1-in": {
    prompt: "<p>Show the <code>name</code>, <code>plan_id</code> and <code>country</code> of accounts on the <code>pro</code> <em>or</em> <code>business</code> plan, in Canada (<code>CA</code>) <em>or</em> the UK (<code>GB</code>). Use <code>in</code> for both.</p>",
    starter: "select name, plan_id, country\nfrom accounts\nwhere ",
    hints: ["<code>plan_id in ('pro', 'business')</code> is the first half.", "Join it to the country condition with <code>and</code>. Because <code>in</code> is a single condition, no parentheses are needed."],
    solution: "select name, plan_id, country\nfrom accounts\nwhere plan_id in ('pro', 'business')\n  and country in ('CA', 'GB');",
    success: "Correct. Notice that in (...) removes the need for the or-with-parentheses dance.",
  },
  "l1-ilike": {
    prompt: "<p>Find every user whose email contains <code>sprouttutoring</code>, however it's capitalized. Show their <code>email</code> and <code>role</code>.</p>",
    starter: "select email, role\nfrom users\nwhere ",
    hints: ["Use <code>ilike</code> so capital letters don't matter.", "Put <code>%</code> on both sides of the text: <code>'%sprouttutoring%'</code>."],
    solution: "select email, role\nfrom users\nwhere email ilike '%sprouttutoring%';",
    success: "Correct. One person: Sprout Tutoring is a one-person business. You'll meet Lin again in Lesson 5.",
  },
  "l1-null": {
    prompt: "<p>Across <strong>all</strong> accounts, how many users have <em>never</em> logged in? Return one row with one number. (Use <code>select count(*)</code>, which counts rows. Lesson 2 covers it properly.)</p>",
    starter: "select count(*)\nfrom users\nwhere ",
    hints: ["Never logged in means <code>last_login_at</code> has no value.", "<code>= null</code> never matches anything. Use <code>is null</code>."],
    solution: "select count(*)\nfrom users\nwhere last_login_at is null;",
    success: "Correct. Users who never log in are a classic early sign that an invite went wrong, as you're about to see.",
  },
  "l1-order": {
    prompt: "<p>Show the <code>name</code> and <code>created_at</code> of the <strong>5 newest</strong> accounts, newest first.</p>",
    starter: "select name, created_at\nfrom accounts\n",
    hints: ["Sort by <code>created_at</code>, descending.", "<code>order by</code> comes before <code>limit</code>."],
    solution: "select name, created_at\nfrom accounts\norder by created_at desc\nlimit 5;",
    ordered: true,
    success: "Correct. These are all still in their 14-day trial, which is when people ask the most questions.",
  },
  "l1-join": {
    prompt: "<p>For every user at the account <strong>named</strong> <code>Harbor &amp; Pine Bakery</code>, show the user's <code>email</code> and <code>role</code>, and the account's <code>plan_id</code>. Filter on the account's name, not on its id.</p>",
    starter: "select u.email, u.role, a.plan_id\nfrom users u\njoin accounts a on \nwhere ",
    hints: ["The join rule is <code>a.id = u.account_id</code>.", "Filter with <code>where a.name = 'Harbor &amp; Pine Bakery'</code>. The ampersand is just a normal character inside the quotes."],
    solution: "select u.email, u.role, a.plan_id\nfrom users u\njoin accounts a on a.id = u.account_id\nwhere a.name = 'Harbor & Pine Bakery';",
    success: "Correct. Four people, all on the pro plan.",
  },
  "l1-left-join": {
    prompt: "<p>Which accounts on the <code>pro</code> or <code>business</code> plan, that are <strong>not</strong> <code>canceled</code>, have <strong>no API keys at all</strong>? Return just the account <code>name</code>.</p>",
    starter: "select a.name\nfrom accounts a\nleft join api_keys k on k.account_id = a.id\nwhere ",
    hints: ["Three conditions: the plan, the status, and \"no matching key.\"", "With a left join, an account with no keys has <code>null</code> in every <code>k</code> column. Test <code>k.id is null</code>.", "<code>a.plan_id in ('pro', 'business') and a.status &lt;&gt; 'canceled' and k.id is null</code>"],
    solution: "select a.name\nfrom accounts a\nleft join api_keys k on k.account_id = a.id\nwhere a.plan_id in ('pro', 'business')\n  and a.status <> 'canceled'\n  and k.id is null;",
    success: "Correct. These customers pay for API access and have never used it. A customer success team would love this list.",
  },
  "l1-open-tickets": {
    prompt: "<p>Show the <code>subject</code>, <code>category</code> and <code>created_at</code> of every ticket from Harbor &amp; Pine (account id 1) whose status is <code>open</code>.</p>",
    starter: "select subject, category, created_at\nfrom tickets\nwhere ",
    hints: ["Two conditions: <code>account_id = 1</code> and the status."],
    solution: "select subject, category, created_at\nfrom tickets\nwhere account_id = 1 and status = 'open';",
    success: "Correct. Two open tickets: the invite you just solved, and an export problem.",
  },

  // ---------- Lesson 2 ----------
  "l2-open-count": {
    prompt: "<p>How many tickets have status <code>open</code> right now? One row, one number.</p>",
    starter: "select count(*)\nfrom tickets\nwhere ",
    hints: ["It's Lesson 1's <code>where</code> plus <code>count(*)</code>."],
    solution: "select count(*)\nfrom tickets\nwhere status = 'open';",
    success: "Correct: 71. That's the first number for your lead.",
  },
  "l2-category": {
    prompt: "<p>How many tickets were created <strong>in October 2026</strong>, per <code>category</code>? Two columns: the category and its count.</p>",
    starter: "select category, count(*)\nfrom tickets\nwhere \ngroup by category;",
    hints: ["The date filter goes in <code>where</code>, before <code>group by</code>.", "<code>created_at &gt;= '2026-10-01' and created_at &lt; '2026-11-01'</code>"],
    solution: "select category, count(*)\nfrom tickets\nwhere created_at >= '2026-10-01' and created_at < '2026-11-01'\ngroup by category;",
    success: "Correct. How-to questions lead, which usually means the product or the help docs could explain something better.",
  },
  "l2-having": {
    prompt: "<p>Which accounts opened <strong>5 or more</strong> tickets in October 2026? Show the account's <code>name</code> and how many tickets.</p>",
    starter: "select a.name, count(*)\nfrom tickets t\njoin accounts a on a.id = t.account_id\nwhere \ngroup by \nhaving ",
    hints: ["The October filter is on <code>t.created_at</code>, in <code>where</code>.", "Group by <code>a.name</code>, then <code>having count(*) &gt;= 5</code>."],
    solution: "select a.name, count(*)\nfrom tickets t\njoin accounts a on a.id = t.account_id\nwhere t.created_at >= '2026-10-01' and t.created_at < '2026-11-01'\ngroup by a.name\nhaving count(*) >= 5;",
    success: "Correct. Customers who write in this often are worth a proactive look: something keeps going wrong for them.",
  },
  "l2-avg": {
    prompt: "<p>What's the average time to first reply, <strong>in hours</strong>, for each <code>priority</code>? Round to 1 decimal place. Two columns: priority and average hours.</p>",
    starter: "select priority,\n       round(avg( ), 1) as avg_hours\nfrom tickets\ngroup by priority;",
    hints: ["Hours for one ticket: <code>extract(epoch from first_response_at - created_at) / 3600</code>.", "Put that inside <code>avg(…)</code>, and the avg inside <code>round(…, 1)</code>. Tickets with no reply have a null and are skipped automatically."],
    solution: "select priority,\n       round(avg(extract(epoch from first_response_at - created_at) / 3600), 1) as avg_hours\nfrom tickets\ngroup by priority;",
    success: "Correct. Urgent tickets get a reply in well under an hour. Normal ones wait most of a working day.",
  },
  "l2-per-day": {
    prompt: "<p>How many tickets arrived <strong>each day</strong> from October 17 to October 30, 2026? Two columns, the day (as a date) and the count, <strong>oldest day first</strong>.</p>",
    starter: "select created_at::date as day, count(*)\nfrom tickets\nwhere \ngroup by day\norder by day;",
    hints: ["Every ticket is on or before Oct 30, so you only need the start of the range: <code>created_at &gt;= '2026-10-17'</code>."],
    solution: "select created_at::date as day, count(*)\nfrom tickets\nwhere created_at >= '2026-10-17'\ngroup by day\norder by day;",
    ordered: true,
    success: "Correct. Fourteen rows, one per day. That's the shape of a ticket-volume chart.",
  },
  "l2-agents": {
    prompt: "<p>Who solved the most tickets this week? For tickets with <code>solved_at</code> on or after <strong>October 24, 2026</strong>, show each <code>assignee</code> and how many they solved. Leave out tickets with no assignee.</p>",
    starter: "select assignee, count(*)\nfrom tickets\nwhere \ngroup by assignee;",
    hints: ["Two conditions: <code>solved_at &gt;= '2026-10-24'</code> and <code>assignee is not null</code>."],
    solution: "select assignee, count(*)\nfrom tickets\nwhere solved_at >= '2026-10-24' and assignee is not null\ngroup by assignee;",
    success: "Correct. Pretty even across the team this week.",
  },
  "l2-case": {
    prompt: "<p>For tickets created in October 2026, count how many fall in each wait bucket. Two columns: the bucket and the count. Use exactly these five labels: <code>'no reply yet'</code>, <code>'under 1 hour'</code>, <code>'1 to 4 hours'</code>, <code>'4 to 24 hours'</code>, <code>'over a day'</code>.</p>",
    starter: "select case\n         when first_response_at is null then 'no reply yet'\n         when first_response_at - created_at < interval '1 hour' then 'under 1 hour'\n         \n       end as wait,\n       count(*)\nfrom tickets\nwhere created_at >= '2026-10-01'\ngroup by wait;",
    hints: ["Add two more <code>when</code> lines, for under 4 hours and under 24 hours, then <code>else 'over a day'</code>.", "<code>when first_response_at - created_at &lt; interval '4 hours' then '1 to 4 hours'</code>"],
    solution: "select case\n         when first_response_at is null then 'no reply yet'\n         when first_response_at - created_at < interval '1 hour' then 'under 1 hour'\n         when first_response_at - created_at < interval '4 hours' then '1 to 4 hours'\n         when first_response_at - created_at < interval '24 hours' then '4 to 24 hours'\n         else 'over a day'\n       end as wait,\n       count(*)\nfrom tickets\nwhere created_at >= '2026-10-01'\ngroup by wait;",
    success: "Correct. Most replies land in the 4 to 24 hour bucket. That's the number a support lead would try to move.",
  },
  "l2-sla": {
    prompt: "<p>Paperkite promises a first reply within <strong>4 hours</strong>. For tickets created in October 2026, show per <code>priority</code>: the number of tickets, how many got a first reply within 4 hours, and that as a percentage rounded to 1 decimal place. Four columns.</p>",
    starter: "select priority,\n       count(*) as tickets,\n       count(*) filter (where ) as within_4h,\n        as pct\nfrom tickets\nwhere created_at >= '2026-10-01'\ngroup by priority;",
    hints: ["The condition is <code>first_response_at - created_at &lt;= interval '4 hours'</code>. A ticket with no reply has a null wait, which is never &lt;= anything, so it correctly doesn't count.", "The percentage: <code>round(100.0 * count(*) filter (where …) / count(*), 1)</code>. Remember the <code>.0</code>."],
    solution: "select priority,\n       count(*) as tickets,\n       count(*) filter (where first_response_at - created_at <= interval '4 hours') as within_4h,\n       round(100.0 * count(*) filter (where first_response_at - created_at <= interval '4 hours') / count(*), 1) as pct\nfrom tickets\nwhere created_at >= '2026-10-01'\ngroup by priority;",
    success: "Correct. Urgent and high do fine; normal and low tickets almost never get a reply within 4 hours. Whether that's a problem depends on whether the promise applies to them, which is a question worth asking your lead.",
  },
  "l2-mrr": {
    prompt: "<p>Accounts with status <code>past_due</code> have a failed payment. How much monthly revenue is at risk, <strong>in dollars</strong>? One number. (Prices are in <code>plans.monthly_price_cents</code>.)</p>",
    starter: "select \nfrom accounts a\njoin plans p on p.id = a.plan_id\nwhere ",
    hints: ["Sum the price of every past-due account's plan.", "<code>sum(p.monthly_price_cents) / 100.0</code> turns cents into dollars, keeping the decimals."],
    solution: "select sum(p.monthly_price_cents) / 100.0\nfrom accounts a\njoin plans p on p.id = a.plan_id\nwhere a.status = 'past_due';",
    success: "Correct: $426 a month. Small here, but this exact query is how a CX ops team sizes a payment-failure problem.",
  },
  "l2-export-failed": {
    prompt: "<p>How many <strong>different accounts</strong> have had an <code>export_failed</code> event since <strong>October 28, 2026</strong>? One number.</p>",
    starter: "select count( )\nfrom events\nwhere ",
    hints: ["Different accounts: <code>count(distinct account_id)</code>.", "Two conditions: the event <code>name</code> and <code>created_at &gt;= '2026-10-28'</code>."],
    solution: "select count(distinct account_id)\nfrom events\nwhere name = 'export_failed' and created_at >= '2026-10-28';",
    success: "Correct: 10 accounts, all since the 28th. Not one customer having a bad day. Lesson 6 finds out why.",
  },

  // ---------- Lesson 3 ----------
  "l3-select-first": {
    prompt: "<p>Before changing anything, write the <code>select</code> that finds <strong>exactly</strong> the row you're about to change: Harbor &amp; Pine (account 1) users whose email ends in <code>.co</code>. Show <code>id</code> and <code>email</code>.</p>",
    starter: "select id, email\nfrom users\nwhere ",
    hints: ["Two conditions: <code>account_id = 1</code> and a <code>like</code> on the email.", "<code>like '%.co'</code> means \"ends in .co\": the <code>%</code> goes only at the front."],
    solution: "select id, email\nfrom users\nwhere account_id = 1 and email like '%.co';",
    success: "Correct: one row, id 4. Now you know the row count your update has to say: UPDATE 1.",
  },
  "l3-fix-sam": {
    write: true,
    prompt: "<p>Fix Sam's address: set it to <code>sam@harborandpine.com</code>. Target him by <code>id</code>, the one value that can only ever match one row, and add <code>returning id, email</code> so you see what changed.</p>",
    starter: "update users\nset email = 'sam@harborandpine.com'\nwhere ",
    hints: ["You found his id in the last exercise.", "<code>where id = 4</code>, then <code>returning id, email;</code> on the next line."],
    solution: "update users\nset email = 'sam@harborandpine.com'\nwhere id = 4\nreturning id, email;",
    probe: "select id, email from users where account_id = 1 order by id",
    success: "Correct: UPDATE 1, and the returned row shows the new address. That's the count you expected, so in real life this is when you'd COMMIT.",
  },
  "l3-trial": {
    write: true,
    prompt: "<p>Your lead approved two more weeks of trial for Blue Cleaning (account 28). Move their <code>trial_ends_at</code> to <strong>14 days after its current value</strong>, and return <code>id</code>, <code>name</code> and <code>trial_ends_at</code>.</p>",
    starter: "update accounts\nset trial_ends_at = \nwhere id = 28\nreturning id, name, trial_ends_at;",
    hints: ["A column can appear on both sides: <code>set trial_ends_at = trial_ends_at + …</code>", "Lesson 2's intervals: <code>interval '14 days'</code>."],
    solution: "update accounts\nset trial_ends_at = trial_ends_at + interval '14 days'\nwhere id = 28\nreturning id, name, trial_ends_at;",
    probe: "select id, trial_ends_at from accounts where id = 28",
    success: "Correct: from Oct 31 to Nov 14, same time of day. Using now() + 14 days instead would have quietly given them a day less than promised.",
  },
  "l3-reassign": {
    write: true,
    prompt: "<p>Bea is going on leave. Move her <strong>open</strong> tickets (status <code>open</code>) to Dani. The starter is what someone in a hurry would write. Run it, read the row count, and fix it.</p>",
    starter: "update tickets\nset assignee = 'Dani'\nwhere assignee = 'Bea'\nreturning id, status;",
    hints: ["Bea has 248 tickets in total, most of them long solved or closed. Should those move to Dani?", "Add <code>and status = 'open'</code> to the <code>where</code>."],
    solution: "update tickets\nset assignee = 'Dani'\nwhere assignee = 'Bea' and status = 'open'\nreturning id, status;",
    probe: "select id, assignee from tickets where assignee in ('Bea', 'Dani') order by id",
    success: "Correct: UPDATE 11. The hurried version moved 248, rewriting two years of history so every report about who solved what would be wrong.",
  },
  "l3-insert-client": {
    write: true,
    prompt: "<p>Maya says their client import skipped one row. Add a client to Harbor &amp; Pine (account 1): name <code>Cedar Lane Cafe</code>, email <code>billing@cedarlanecafe.com</code>. Leave <code>id</code> out so the database picks it, and return <code>id</code> and <code>name</code>.</p>",
    starter: "insert into clients (account_id, name, email)\nvalues ()\nreturning id, name;",
    hints: ["The values go in the same order as the column list: the account id, then the two text values in quotes.", "<code>values (1, 'Cedar Lane Cafe', 'billing@cedarlanecafe.com')</code>"],
    solution: "insert into clients (account_id, name, email)\nvalues (1, 'Cedar Lane Cafe', 'billing@cedarlanecafe.com')\nreturning id, name;",
    probe: "select account_id, name, email from clients where account_id = 1 order by name",
    success: "Correct: INSERT 1, and the database chose the id. Note that id, then read on.",
  },
  "l3-delete-key": {
    write: true,
    prompt: "<p>Isaac at Bramble Veterinary (account 39) asks you to delete their old, <strong>revoked</strong> \"Accounting sync\" API key, and not to touch the one that works. The starter matches on the label. Run it and read what it would delete before you fix it.</p>",
    starter: "delete from api_keys\nwhere account_id = 39 and label = 'Accounting sync'\nreturning id, label, revoked_at;",
    hints: ["Two keys share that label. Which column tells them apart?", "Revoked means <code>revoked_at</code> has a value: <code>and revoked_at is not null</code>. Matching on <code>id = 13</code> works too."],
    solution: "delete from api_keys\nwhere account_id = 39 and label = 'Accounting sync' and revoked_at is not null\nreturning id, label, revoked_at;",
    probe: "select id from api_keys where account_id = 39 order by id",
    success: "Correct: DELETE 1, and the returned row has a revoked_at. The starter would also have deleted their working key and broken their accounting sync.",
  },

  // ---------- Lesson 6 ----------
  "l5-hp-events": {
    prompt: "<p>Show every export event for Harbor &amp; Pine (account 1) since <strong>October 28, 2026</strong>: the event <code>name</code> and <code>created_at</code>, oldest first. Export events are the ones whose name starts with <code>export</code>.</p>",
    starter: "select name, created_at\nfrom events\nwhere ",
    hints: ["Three conditions: the account, a name that starts with export, and the date.", "<code>name like 'export%'</code> matches both export_started and export_failed.", "Don't forget <code>order by created_at</code>."],
    solution: "select name, created_at\nfrom events\nwhere account_id = 1\n  and name like 'export%'\n  and created_at >= '2026-10-28'\norder by created_at;",
    ordered: true,
    success: "Correct. Started, failed, started, failed, started, failed: three tries, each failing within a fraction of a second.",
  },
  "l5-first-failure": {
    prompt: "<p>When was the <strong>very first</strong> <code>export_failed</code> event, for any account? One value.</p>",
    starter: "select \nfrom events\nwhere name = 'export_failed';",
    hints: ["The earliest timestamp is the smallest one: <code>min(created_at)</code>."],
    solution: "select min(created_at)\nfrom events\nwhere name = 'export_failed';",
    success: "Correct: Oct 28 at 15:55 UTC. Nothing failed before that. Now, what happened just before?",
  },
  "l5-bad-invoice": {
    prompt: "<p>Find Harbor &amp; Pine's (account 1) <code>void</code> invoices that have <strong>no</strong> <code>paid_at</code>. Show <code>number</code> and <code>issued_at</code>.</p>",
    starter: "select number, issued_at\nfrom invoices\nwhere ",
    hints: ["Three conditions: the account, the status, and <code>paid_at is null</code>."],
    solution: "select number, issued_at\nfrom invoices\nwhere account_id = 1\n  and status = 'void'\n  and paid_at is null;",
    success: "Correct: INV-0046, issued Oct 27. One row of data that the new code didn't expect.",
  },
  "l5-affected": {
    prompt: "<p>Which accounts have had an <code>export_failed</code> event since October 28, 2026, and how many failures each? Show the account <code>name</code> and the count.</p>",
    starter: "select a.name, count(*)\nfrom events e\njoin accounts a on a.id = e.account_id\nwhere \ngroup by a.name;",
    hints: ["Filter on <code>e.name = 'export_failed'</code> and <code>e.created_at &gt;= '2026-10-28'</code>."],
    solution: "select a.name, count(*)\nfrom events e\njoin accounts a on a.id = e.account_id\nwhere e.name = 'export_failed'\n  and e.created_at >= '2026-10-28'\ngroup by a.name;",
    success: "Correct: 10 accounts. Three of them wrote in, and seven didn't.",
  },
  "l5-at-risk": {
    prompt: "<p>How many accounts that are <strong>not canceled</strong> have at least one <code>void</code> invoice with no <code>paid_at</code>? These will all fail on their next full export. One number.</p>",
    starter: "select count(distinct i.account_id)\nfrom invoices i\njoin accounts a on a.id = i.account_id\nwhere ",
    hints: ["<code>count(distinct …)</code>, because one account can have several such invoices.", "Conditions: <code>i.status = 'void'</code>, <code>i.paid_at is null</code>, <code>a.status &lt;&gt; 'canceled'</code>."],
    solution: "select count(distinct i.account_id)\nfrom invoices i\njoin accounts a on a.id = i.account_id\nwhere i.status = 'void'\n  and i.paid_at is null\n  and a.status <> 'canceled';",
    success: "Correct: 38. That's the number that turns 'three tickets' into 'high priority.'",
  },
}
