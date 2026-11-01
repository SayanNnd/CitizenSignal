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
  comment_count    int not null default 0,
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

-- Comments table (author is a display name taken from the verified token, never from the request body)
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  issue_id   uuid not null references issues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  author     text not null,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- One row per fix cycle. Reopening an issue closes the current cycle without deleting its fix date.
create table if not exists issue_resolutions (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null references issues(id) on delete cascade,
  resolved_at timestamptz not null,
  reopened_at timestamptz,
  unique (issue_id, resolved_at)
);

-- Projects created before comments existed: add the cached counter (safe to re-run).
alter table issues add column if not exists comment_count int not null default 0;

-- Indexes
create index if not exists issues_lat_lng on issues (latitude, longitude);
create index if not exists issues_status on issues (status);
create index if not exists evidence_issue_id on evidence (issue_id);
-- GET /issues/mine: issues a user reported or contributed evidence to
create index if not exists issues_created_by on issues (created_by);
create index if not exists evidence_created_by on evidence (created_by);
create index if not exists comments_issue_id on comments (issue_id, created_at);
create index if not exists issue_resolutions_issue_id on issue_resolutions (issue_id, resolved_at);

-- Preserve the latest fix date that the old issues row still contains. Earlier dates already
-- discarded by the old schema cannot be reconstructed.
insert into issue_resolutions (issue_id, resolved_at, reopened_at)
select id, resolved_at, case when reopened_at > resolved_at then reopened_at else null end
from issues
where resolved_at is not null
on conflict (issue_id, resolved_at) do nothing;

-- Bring existing denormalized counts into line before atomic write triggers take over.
update issues i
set upvotes = (select count(*)::int from upvotes u where u.issue_id = i.id),
    evidence_count = 1 + (select count(*)::int from evidence e where e.issue_id = i.id),
    comment_count = (select count(*)::int from comments c where c.issue_id = i.id);

-- All cached counters move in the same transaction as the child row insert/delete.
create or replace function maintain_issue_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue_id uuid;
  v_delta int;
begin
  if tg_op = 'DELETE' then
    v_issue_id := old.issue_id;
    v_delta := -1;
  else
    v_issue_id := new.issue_id;
    v_delta := 1;
  end if;

  if tg_table_name = 'upvotes' then
    update issues set upvotes = greatest(0, upvotes + v_delta) where id = v_issue_id;
  elsif tg_table_name = 'evidence' then
    update issues set evidence_count = greatest(1, evidence_count + v_delta) where id = v_issue_id;
  elsif tg_table_name = 'comments' then
    update issues set comment_count = greatest(0, comment_count + v_delta) where id = v_issue_id;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists upvotes_maintain_issue_counter on upvotes;
create trigger upvotes_maintain_issue_counter
after insert or delete on upvotes
for each row execute function maintain_issue_counters();

drop trigger if exists evidence_maintain_issue_counter on evidence;
create trigger evidence_maintain_issue_counter
after insert or delete on evidence
for each row execute function maintain_issue_counters();

drop trigger if exists comments_maintain_issue_counter on comments;
create trigger comments_maintain_issue_counter
after insert or delete on comments
for each row execute function maintain_issue_counters();

-- Record every transition into and out of the fixed state, in the same transaction as the status
-- update. Existing rows are backfilled above before this trigger is installed.
create or replace function record_issue_resolution_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'open' and new.status = 'resolved' then
    insert into issue_resolutions (issue_id, resolved_at)
    values (new.id, coalesce(new.resolved_at, now()))
    on conflict (issue_id, resolved_at) do nothing;
  elsif old.status = 'resolved' and new.status = 'open' then
    update issue_resolutions
    set reopened_at = now()
    where id = (
      select id
      from issue_resolutions
      where issue_id = new.id and reopened_at is null
      order by resolved_at desc
      limit 1
      for update
    );
  end if;
  return new;
end;
$$;

drop trigger if exists issues_record_resolution_cycle on issues;
create trigger issues_record_resolution_cycle
after update of status on issues
for each row
when (old.status is distinct from new.status)
execute function record_issue_resolution_cycle();

-- Serialize report creation by category. Normal reports re-run Node matching when a new nearby
-- row appeared; explicit force_new reports still bypass matching while sharing the same lock.
create or replace function create_issue_if_unseen(
  p_category text,
  p_title text,
  p_description text,
  p_latitude double precision,
  p_longitude double precision,
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_image_url text,
  p_created_by uuid,
  p_checked_issue_ids uuid[],
  p_force_new boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue issues%rowtype;
  v_has_unseen boolean;
begin
  perform pg_advisory_xact_lock(hashtext('citizensignal-report:' || p_category)::bigint);

  if not p_force_new then
    select exists (
      select 1
      from issues i
      where i.category = p_category
        and i.latitude between p_min_lat and p_max_lat
        and i.longitude between p_min_lng and p_max_lng
        and not (i.id = any(coalesce(p_checked_issue_ids, '{}'::uuid[])))
    ) into v_has_unseen;

    if v_has_unseen then
      return jsonb_build_object('created', false, 'issue', null);
    end if;
  end if;

  insert into issues (category, title, description, latitude, longitude, image_url, created_by)
  values (p_category, p_title, p_description, p_latitude, p_longitude, p_image_url, p_created_by)
  returning * into v_issue;

  return jsonb_build_object('created', true, 'issue', to_jsonb(v_issue));
end;
$$;

-- Evidence, reopen state, recurrence count, and the evidence counter commit or roll back together.
create or replace function add_issue_evidence_and_reopen(
  p_issue_id uuid,
  p_description text,
  p_image_url text,
  p_latitude double precision,
  p_longitude double precision,
  p_created_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue issues%rowtype;
  v_reopened boolean := false;
begin
  select * into v_issue from issues where id = p_issue_id for update;
  if not found then
    return null;
  end if;

  insert into evidence (issue_id, description, image_url, latitude, longitude, created_by)
  values (p_issue_id, p_description, p_image_url, p_latitude, p_longitude, p_created_by);

  if v_issue.status = 'resolved' then
    update issues
    set status = 'open', reopened_at = now(), recurrence_count = recurrence_count + 1
    where id = p_issue_id
    returning * into v_issue;
    v_reopened := true;
  else
    select * into v_issue from issues where id = p_issue_id;
  end if;

  return jsonb_build_object('issue', to_jsonb(v_issue), 'reopened', v_reopened);
end;
$$;

-- Admin status changes are row-locked and idempotent; the trigger records changed fix cycles.
create or replace function set_issue_status(p_issue_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue issues%rowtype;
begin
  select * into v_issue from issues where id = p_issue_id for update;
  if not found then
    return null;
  end if;

  if v_issue.status is distinct from p_status then
    update issues
    set status = p_status,
        resolved_at = case when p_status = 'resolved' then now() else null end
    where id = p_issue_id
    returning * into v_issue;
  end if;

  return to_jsonb(v_issue);
end;
$$;

revoke all on function create_issue_if_unseen(text, text, text, double precision, double precision, double precision, double precision, double precision, double precision, text, uuid, uuid[], boolean) from public, anon, authenticated;
revoke all on function add_issue_evidence_and_reopen(uuid, text, text, double precision, double precision, uuid) from public, anon, authenticated;
revoke all on function set_issue_status(uuid, text) from public, anon, authenticated;
grant execute on function create_issue_if_unseen(text, text, text, double precision, double precision, double precision, double precision, double precision, double precision, text, uuid, uuid[], boolean) to service_role;
grant execute on function add_issue_evidence_and_reopen(uuid, text, text, double precision, double precision, uuid) to service_role;
grant execute on function set_issue_status(uuid, text) to service_role;

notify pgrst, 'reload schema';

-- Storage bucket: PUBLIC bucket named "issue-images". `npm run seed` creates it if missing
-- (or create it manually in the Supabase dashboard).
