-- Stage 2: leads. Run once in Supabase -> SQL Editor.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  attempt_id text not null unique,            -- one lead per finished attempt
  language text not null check (language in ('en','te','hi')),
  name text not null,
  age_band text not null check (age_band in ('under18','adult')),
  phone text,                                 -- student's phone (adults only)
  parent_name text,                           -- required when under 18
  parent_phone text,                          -- required when under 18
  consent boolean not null,
  consent_text text not null,                 -- exact wording the person saw
  consent_at timestamptz not null default now(),
  score int,
  report text,
  report_source text,                         -- 'gemini' or 'template'
  source text,                                -- from ?src= in the link
  telegram_chat_id bigint,
  telegram_linked_at timestamptz,
  counsellor_alerted_at timestamptz,
  created_at timestamptz not null default now(),
  check (age_band <> 'adult' or phone is not null),
  check (age_band <> 'under18' or (parent_name is not null and parent_phone is not null))
);
alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;
grant select, insert, update on public.leads to service_role;
