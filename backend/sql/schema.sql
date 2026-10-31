-- CitizenSignal schema — run in Supabase SQL editor

create extension if not exists "pgcrypto";

-- Issues table
create table if not exists issues (
  id               uuid primary key default gen_random_uuid(),
  category         text not null,
  title            text not null,
  description      text not null,
  latitude         double precision not null,
  longitude        double precision not null,
  status           text not null default 'open' check (status in ('open', 'resolved')),
  image_url        text,
  upvotes          int not null default 0,
  evidence_count   int not null default 1,
  recurrence_count int not null default 0,
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz,
  reopened_at      timestamptz
);

-- Evidence table
create table if not exists evidence (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references issues(id) on delete cascade,
  description text not null,
  image_url   text,
  latitude    double precision not null,
  longitude   double precision not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Upvotes table (one per user per issue enforced by PK)
create table if not exists upvotes (
  issue_id   uuid not null references issues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

-- Indexes
create index if not exists issues_lat_lng on issues (latitude, longitude);
create index if not exists issues_status on issues (status);
create index if not exists evidence_issue_id on evidence (issue_id);

-- Storage bucket: create manually in Supabase dashboard as PUBLIC bucket named "issue-images"
