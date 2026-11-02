create table if not exists public.enquiries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  student_name text not null,
  birth_date date not null,
  guardian_name text not null,
  phone text not null,
  email text not null,
  school text,
  address text,
  class_name text not null,
  board text not null,
  subjects text not null,
  learning_mode text not null,
  start_date date,
  schedule text,
  notes text,
  consent boolean not null
);

alter table public.enquiries
  add column if not exists consent boolean not null default false;

alter table public.enquiries enable row level security;

revoke all on table public.enquiries from anon, authenticated;
grant usage on schema public to anon;
grant insert on table public.enquiries to anon;

drop policy if exists "Allow public enquiry submissions" on public.enquiries;
create policy "Allow public enquiry submissions"
on public.enquiries
for insert
to anon
with check (consent = true);
