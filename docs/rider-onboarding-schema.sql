-- Rider onboarding application table
create table if not exists public.rider_onboarding_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  personal jsonb not null,
  vehicle jsonb not null,
  payout jsonb not null,
  phone_verification jsonb not null,
  reviewed_by uuid null references public.profiles(id),
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists rider_onboarding_applications_status_idx
  on public.rider_onboarding_applications(status);

-- Storage bucket (create in Supabase UI or via SQL if enabled)
-- Bucket name expected by app: rider-documents

-- Suggested RLS (apply in Supabase SQL editor as needed)
-- alter table public.rider_onboarding_applications enable row level security;
--
-- create policy "rider can insert own application"
--   on public.rider_onboarding_applications for insert
--   to authenticated
--   with check (auth.uid() = user_id);
--
-- create policy "rider can read own application"
--   on public.rider_onboarding_applications for select
--   to authenticated
--   using (auth.uid() = user_id);
--
-- create policy "super admin can manage applications"
--   on public.rider_onboarding_applications for all
--   to authenticated
--   using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'))
--   with check (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));
