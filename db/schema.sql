-- Paperkite: a made-up invoicing app for small businesses.
-- This is the database you will query as its support engineer.

drop schema if exists public cascade;
create schema public;

create table plans (
  id                  text primary key,          -- 'free', 'starter', 'pro', 'business'
  name                text not null,
  monthly_price_cents integer not null,
  seat_limit          integer not null,
  api_access          boolean not null
);

create table accounts (
  id             serial primary key,
  name           text not null,
  plan_id        text not null references plans(id),
  status         text not null,                  -- 'trialing', 'active', 'past_due', 'canceled'
  country        text not null,
  created_at     timestamptz not null,
  trial_ends_at  timestamptz,
  canceled_at    timestamptz
);

create table users (
  id             serial primary key,
  account_id     integer not null references accounts(id),
  email          text not null,
  full_name      text,                           -- some people never filled this in
  role           text not null,                  -- 'owner', 'admin', 'member'
  created_at     timestamptz not null,
  last_login_at  timestamptz                     -- null = never logged in
);

-- The businesses that a Paperkite customer sends invoices TO.
create table clients (
  id          serial primary key,
  account_id  integer not null references accounts(id),
  name        text not null,
  email       text
);

create table invoices (
  id            serial primary key,
  account_id    integer not null references accounts(id),
  client_id     integer not null references clients(id),
  number        text not null,                   -- what the customer sees, e.g. 'INV-0042'
  status        text not null,                   -- 'draft', 'sent', 'overdue', 'paid', 'void'
  amount_cents  integer not null,
  currency      text not null,
  issued_at     date not null,
  due_at        date not null,
  paid_at       timestamptz                      -- null unless money arrived
);

create table tickets (
  id                 serial primary key,
  account_id         integer not null references accounts(id),
  requester_id       integer not null references users(id),
  subject            text not null,
  category           text not null,              -- 'billing', 'bug', 'how_to', 'account_access', 'integrations'
  priority           text not null,              -- 'low', 'normal', 'high', 'urgent'
  status             text not null,              -- 'open', 'pending', 'solved', 'closed'
  assignee           text,                       -- support agent's first name, null = unassigned
  created_at         timestamptz not null,
  first_response_at  timestamptz,                -- null = nobody has replied yet
  solved_at          timestamptz
);

create table api_keys (
  id                  serial primary key,
  account_id          integer not null references accounts(id),
  label               text not null,
  key                 text not null unique,
  scopes              text[] not null,           -- e.g. {invoices:read,invoices:write}
  rate_limit_per_min  integer not null,
  created_at          timestamptz not null,
  revoked_at          timestamptz
);

create table events (
  id          bigserial primary key,
  account_id  integer not null references accounts(id),
  user_id     integer references users(id),
  name        text not null,                     -- 'login', 'invoice_created', 'invoice_sent', 'payment_received', 'export_started', 'export_failed'
  created_at  timestamptz not null
);

create index on users (account_id);
create index on users (email);
create index on invoices (account_id);
create index on tickets (account_id);
create index on events (account_id, created_at);
