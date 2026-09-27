-- XENSI Alpha user profile infrastructure.
-- Auth remains owned by Supabase Auth in auth.users; this migration only stores
-- user-facing profile data in public.profiles.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists id uuid;

alter table public.profiles
  add column if not exists nickname text;

alter table public.profiles
  add column if not exists avatar_id text;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.contype = 'p'
      and not exists (
        select 1
        from pg_attribute a
        where a.attrelid = c.conrelid
          and a.attnum = any(c.conkey)
          and a.attname = 'id'
      )
  ) then
    raise exception 'public.profiles already has a primary key that is not id; review existing data before applying the XENSI profile migration.';
  end if;

  if exists (
    select 1
    from public.profiles
    where id is null
  ) then
    raise exception 'public.profiles has rows without id; cannot safely attach profiles to auth.users without a manual data migration.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'p'
  ) then
    alter table public.profiles
      add constraint profiles_pkey
      primary key (id);
  end if;
end $$;

update public.profiles
set nickname = concat('xensi_', substr(id::text, 1, 8))
where nickname is null
   or length(btrim(nickname)) < 3
   or length(btrim(nickname)) > 24;

update public.profiles
set nickname = btrim(nickname)
where nickname <> btrim(nickname);

alter table public.profiles
  alter column nickname set not null;

alter table public.profiles
  alter column created_at set default now(),
  alter column created_at set not null;

alter table public.profiles
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    join pg_attribute fa
      on fa.attrelid = c.confrelid
     and fa.attnum = any(c.confkey)
    where c.conrelid = 'public.profiles'::regclass
      and c.confrelid = 'auth.users'::regclass
      and c.contype = 'f'
      and c.confdeltype = 'c'
      and a.attname = 'id'
      and fa.attname = 'id'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;

alter table public.profiles
  drop constraint if exists profiles_nickname_length_check;

alter table public.profiles
  add constraint profiles_nickname_length_check
  check (
    nickname = btrim(nickname)
    and length(nickname) between 3 and 24
  );

comment on constraint profiles_nickname_length_check on public.profiles is
  'Nickname is trimmed and must be 3-24 characters. It is intentionally not unique until product UX decides whether duplicate nicknames are allowed.';

comment on table public.profiles is
  'XENSI user profile data keyed by auth.users.id. Authentication secrets stay exclusively in Supabase Auth.';

comment on column public.profiles.nickname is
  'Display nickname. Not unique yet by product decision.';

create or replace function public.xensi_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.xensi_set_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.xensi_set_updated_at();

create or replace function public.xensi_normalize_profile_nickname(candidate text, user_id uuid)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  normalized text;
begin
  normalized := btrim(coalesce(candidate, ''));

  if length(normalized) between 3 and 24 then
    return normalized;
  end if;

  return concat('xensi_', substr(user_id::text, 1, 8));
end;
$$;

revoke all on function public.xensi_normalize_profile_nickname(text, uuid) from public, anon, authenticated;

create or replace function public.xensi_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nickname, avatar_id)
  values (
    new.id,
    public.xensi_normalize_profile_nickname(new.raw_user_meta_data ->> 'nickname', new.id),
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_id'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.xensi_handle_new_user() from public, anon, authenticated;

drop trigger if exists xensi_on_auth_user_created on auth.users;

create trigger xensi_on_auth_user_created
after insert on auth.users
for each row
execute function public.xensi_handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, update on table public.profiles to authenticated;
