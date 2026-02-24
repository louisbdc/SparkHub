-- ════════════════════════════════════════════════════════════════════════════
-- Sparkhub — PostgreSQL schema for Supabase
-- Run this in Supabase → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  avatar      text,
  role        text not null default 'client' check (role in ('admin', 'dev', 'client')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Workspaces ────────────────────────────────────────────────────────────────
create table if not exists workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  color       text not null default '#6366f1',
  owner_id    uuid not null references profiles(id) on delete cascade,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Workspace members ─────────────────────────────────────────────────────────
create table if not exists workspace_members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  role         text not null default 'client' check (role in ('admin', 'dev', 'client')),
  joined_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- ── Tickets ───────────────────────────────────────────────────────────────────
create table if not exists tickets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  status       text not null default 'backlog'
    check (status in ('backlog', 'todo', 'in_progress', 'review', 'done')),
  priority     text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  type         text not null default 'task'
    check (type in ('bug', 'feature', 'task', 'improvement')),
  reporter_id  uuid not null references profiles(id),
  assignee_id  uuid references profiles(id),
  "order"      integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Comments ──────────────────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  ticket_id  uuid not null references tickets(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Messages (workspace chat) ─────────────────────────────────────────────────
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  author_id    uuid not null references profiles(id) on delete cascade,
  content      text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Attachments ───────────────────────────────────────────────────────────────
create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references tickets(id) on delete cascade,
  storage_key  text not null,   -- Supabase Storage object path
  filename     text not null,   -- stored name (timestamped)
  originalname text not null,   -- user's original filename (for display)
  mime_type    text not null,
  size         bigint not null,
  uploaded_at  timestamptz not null default now()
);

-- ── Notifications ─────────────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  type       text not null check (type in ('ticket_assigned', 'ticket_commented', 'ticket_status_changed')),
  title      text not null,
  body       text not null default '',
  link       text not null default '',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create or replace trigger trg_workspaces_updated_at
  before update on workspaces
  for each row execute function update_updated_at();

create or replace trigger trg_tickets_updated_at
  before update on tickets
  for each row execute function update_updated_at();

create or replace trigger trg_comments_updated_at
  before update on comments
  for each row execute function update_updated_at();

create or replace trigger trg_messages_updated_at
  before update on messages
  for each row execute function update_updated_at();

-- ── Auto-create profile on sign-up ───────────────────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;   -- register route also inserts, avoid duplicate
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Disable RLS (auth enforced in route handlers) ────────────────────────────
alter table profiles          disable row level security;
alter table workspaces        disable row level security;
alter table workspace_members disable row level security;
alter table tickets           disable row level security;
alter table comments          disable row level security;
alter table messages          disable row level security;
alter table attachments       disable row level security;
alter table notifications     disable row level security;

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_workspace_members_user on workspace_members(user_id);
create index if not exists idx_workspace_members_ws   on workspace_members(workspace_id);
create index if not exists idx_tickets_workspace       on tickets(workspace_id);
create index if not exists idx_tickets_status_order    on tickets(workspace_id, status, "order");
create index if not exists idx_comments_ticket         on comments(ticket_id);
create index if not exists idx_messages_workspace      on messages(workspace_id, created_at);
create index if not exists idx_attachments_ticket      on attachments(ticket_id);
create index if not exists idx_notifications_user      on notifications(user_id, is_read, created_at desc);
