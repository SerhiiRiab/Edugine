-- ============================================================
-- 002: Fix handle_new_user trigger
-- Problem: trigger ran without SET search_path and without
--          ON CONFLICT guard, causing "Database error saving
--          new user" on first magic-link sign-in.
-- ============================================================

-- 1. Remove old trigger first, then the function it depends on
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Recreate with all safety measures
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer                  -- runs as function owner, bypasses RLS
set search_path = public          -- prevents search_path hijacking
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;    -- idempotent: safe if profile already exists

  return new;

exception
  when others then
    raise warning 'handle_new_user failed for user %: % %',
      new.id, sqlerrm, sqlstate;
    return new;                   -- still return new so auth signup succeeds
end;
$$;

-- 3. Recreate trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
