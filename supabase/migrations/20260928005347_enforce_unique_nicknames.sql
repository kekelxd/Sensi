create unique index if not exists profiles_nickname_unique_ci_idx
  on public.profiles (lower(btrim(nickname)));

comment on index public.profiles_nickname_unique_ci_idx is
  'Enforces case-insensitive unique profile nicknames after trimming surrounding whitespace.';

create or replace function public.is_nickname_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when candidate is null then false
    when btrim(candidate) = '' then false
    when length(btrim(candidate)) not between 3 and 24 then false
    else not exists (
      select 1
      from public.profiles
      where lower(btrim(nickname)) = lower(btrim(candidate))
    )
  end;
$$;

revoke all on function public.is_nickname_available(text) from public, anon, authenticated;
grant execute on function public.is_nickname_available(text) to anon, authenticated;

comment on function public.is_nickname_available(text) is
  'Returns whether a trimmed 3-24 character nickname is currently available without exposing the profiles table.';
