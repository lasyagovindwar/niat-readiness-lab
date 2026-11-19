-- NAT Readiness Lab (unofficial prototype). Paste into Supabase > SQL Editor > Run.

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('en','te','hi')),
  section text not null check (section in ('logical','quant','pattern','computational')),
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  stem text not null,
  options jsonb not null,
  correct_index smallint not null check (correct_index between 0 and 3),
  explanation text not null,
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text,
  phone text not null,
  language text not null check (language in ('en','te','hi')),
  current_class text,
  district text,
  is_minor boolean not null,
  guardian_consent boolean not null default false,
  consent_version text not null,
  consent_at timestamptz not null default now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  score smallint,
  section_scores jsonb,
  status text not null default 'new' check (status in ('new','contacted','call_booked','closed')),
  counsellor_note text,
  telegram_link_token uuid not null default gen_random_uuid(),
  telegram_chat_id bigint,
  -- a minor's phone number can only be stored with guardian consent
  check (not is_minor or guardian_consent)
);
create unique index if not exists leads_phone_key on public.leads (phone);
create index if not exists leads_created_idx on public.leads (created_at desc);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  lead_id uuid references public.leads(id) on delete set null,
  language text not null check (language in ('en','te','hi')),
  question_ids uuid[] not null,
  answers jsonb,
  score smallint,
  section_scores jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists attempts_session_idx on public.attempts (session_id);

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  kind text not null check (kind in ('welcome','day1','counsellor_alert')),
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  detail text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists followups_status_idx on public.followups (status);

-- Security: lock every table. Only the server (secret/service_role key) can touch them.
alter table public.questions enable row level security;
alter table public.leads     enable row level security;
alter table public.attempts  enable row level security;
alter table public.followups enable row level security;

revoke all on public.questions, public.leads, public.attempts, public.followups from anon, authenticated;
grant  all on public.questions, public.leads, public.attempts, public.followups to service_role;
-- No policies are created on purpose: the public key can read and write nothing.
