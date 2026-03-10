-- Add branches column to rider_onboarding_applications table
-- This separates branch selection data from personal info

alter table public.rider_onboarding_applications
add column if not exists branches jsonb default null;

-- Migrate existing data that has branches nested inside personal
-- Move branches from personal.branches to top-level branches column
update public.rider_onboarding_applications
set branches = personal->'branches',
    personal = personal - 'branches'
where personal ? 'branches' and branches is null;
