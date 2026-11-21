-- UNLOCK MVP schema. Run in a Supabase project with PostGIS available.
create extension if not exists postgis with schema extensions;

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null,
  country text not null default 'Canada',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  university_id uuid references public.universities(id) on delete set null,
  username text not null unique check (char_length(username) between 3 and 24),
  bio text not null default '' check (char_length(bio) <= 240),
  avatar_path text,
  friend_mode boolean not null default true,
  dating_mode boolean not null default false,
  visibility text not null default 'campus' check (visibility in ('hidden','campus','public')),
  show_at_events boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A minimal campus profile is provisioned at signup; onboarding can fill in the rest.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_username text; v_university uuid;
begin
  v_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-zA-Z0-9_]+', '', 'g'));
  if char_length(v_username) < 3 then v_username := 'student_' || left(replace(new.id::text, '-', ''), 8); end if;
  select u.id into v_university from public.universities u where u.slug = 'mcgill' limit 1;
  insert into public.profiles(id, university_id, username)
  values (new.id, v_university, left(v_username, 24))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table public.interests (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'general'
);
create table public.user_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, interest_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_label text not null check (char_length(location_label) <= 180),
  location extensions.geography(point, 4326),
  capacity integer not null default 12 check (capacity between 2 and 500),
  status text not null default 'published' check (status in ('published','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index events_location_gix on public.events using gist (location);
create index events_discovery_idx on public.events (university_id, status, starts_at);

create table public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going','waitlisted','cancelled','attended')),
  social_mode text not null default 'friend' check (social_mode in ('friend','dating','none')),
  rsvp_at timestamptz not null default now(),
  confirmed_at timestamptz,
  primary key (event_id, profile_id)
);
create index event_attendees_profile_idx on public.event_attendees (profile_id, rsvp_at desc);

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  slug text not null,
  boundary extensions.geography(multipolygon, 4326) not null,
  created_at timestamptz not null default now(),
  unique (university_id, slug)
);
create index neighborhoods_boundary_gix on public.neighborhoods using gist (boundary);
create table public.user_discoveries (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  discovered_at timestamptz not null default now(),
  primary key (profile_id, neighborhood_id)
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0 and amount <= 500),
  reason text not null check (reason in ('event_attendance','event_hosting','neighborhood_discovery','welcome_newcomer','quest')),
  reference_id uuid,
  created_at timestamptz not null default now(),
  unique (profile_id, reason, reference_id)
);
create index xp_transactions_profile_idx on public.xp_transactions(profile_id, created_at desc);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  xp_value integer not null default 0 check (xp_value between 0 and 500)
);
create table public.user_achievements (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (profile_id, achievement_id)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_unread_idx on public.notifications(profile_id, created_at desc) where read_at is null;

-- RLS is enabled on every user-facing table. Mutations are owner-scoped.
alter table public.universities enable row level security;
alter table public.profiles enable row level security;
alter table public.interests enable row level security;
alter table public.user_interests enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.user_discoveries enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.notifications enable row level security;

create policy "universities are readable" on public.universities for select using (true);
create policy "visible profiles can be discovered" on public.profiles for select using (
  id = auth.uid() or (visibility <> 'hidden' and (friend_mode or dating_mode))
);
create policy "profile owner inserts" on public.profiles for insert with check (id = auth.uid());
create policy "profile owner updates" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "interests are readable" on public.interests for select using (true);
create policy "user interests are readable with visible profile" on public.user_interests for select using (
  profile_id = auth.uid() or exists (select 1 from public.profiles p where p.id = profile_id and p.visibility <> 'hidden' and (p.friend_mode or p.dating_mode))
);
create policy "owner manages interests" on public.user_interests for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "published events are discoverable" on public.events for select using (
  status = 'published' or organizer_id = auth.uid()
);
create policy "signed in users create campus events" on public.events for insert to authenticated with check (
  organizer_id = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.university_id = events.university_id
  )
);
create policy "organizer edits event" on public.events for update using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());
create policy "organizer deletes event" on public.events for delete using (organizer_id = auth.uid());
create policy "attendee manages own rsvp" on public.event_attendees for insert to authenticated with check (profile_id = auth.uid());
create policy "attendee or organizer reads opted in attendees" on public.event_attendees for select using (
  profile_id = auth.uid() or exists (
    select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()
  ) or (
    status in ('going','attended') and social_mode <> 'none' and exists (
      select 1 from public.profiles p where p.id = profile_id and p.show_at_events and p.visibility <> 'hidden'
    ) and exists (
      select 1 from public.event_attendees mine where mine.event_id = event_id and mine.profile_id = auth.uid()
        and mine.status in ('going','attended') and mine.social_mode = event_attendees.social_mode and mine.social_mode <> 'none'
    )
  )
);
create policy "attendee cancels own rsvp" on public.event_attendees for update using (profile_id = auth.uid()) with check (profile_id = auth.uid() and status in ('going','waitlisted','cancelled'));
create policy "attendee removes own rsvp" on public.event_attendees for delete using (profile_id = auth.uid());
create policy "neighborhoods are readable" on public.neighborhoods for select using (true);
create policy "discoveries are readable by owner" on public.user_discoveries for select using (profile_id = auth.uid());
create policy "discoveries are awarded server side" on public.user_discoveries for insert with check (false);
create policy "xp is readable by owner" on public.xp_transactions for select using (profile_id = auth.uid());
create policy "xp cannot be written by clients" on public.xp_transactions for insert with check (false);
create policy "achievements are readable" on public.achievements for select using (true);
create policy "earned achievements are readable by owner" on public.user_achievements for select using (profile_id = auth.uid());
create policy "user achievements are server managed" on public.user_achievements for insert with check (false);
create policy "notifications are owner scoped" on public.notifications for select using (profile_id = auth.uid());
create policy "notifications update by owner" on public.notifications for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Public aggregate only; never returns attendee identities or social mode.
create or replace function public.get_event_attendee_counts(p_event_ids uuid[])
returns table(event_id uuid, going_count bigint)
language sql stable security definer set search_path = '' as $$
  select e.id, count(a.profile_id)
  from public.events e
  left join public.event_attendees a on a.event_id = e.id and a.status = 'going'
  where e.id = any(p_event_ids) and e.status = 'published'
  group by e.id;
$$;
revoke all on function public.get_event_attendee_counts(uuid[]) from public;
grant execute on function public.get_event_attendee_counts(uuid[]) to anon, authenticated;

-- Validate RSVP mode, campus membership, event timing, and capacity under a row lock.
create or replace function public.validate_event_rsvp()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_capacity integer; v_university uuid; v_event_status text; v_starts_at timestamptz;
  v_profile_university uuid; v_friend_mode boolean; v_dating_mode boolean; v_count integer;
begin
  if new.profile_id <> auth.uid() and auth.uid() is not null then
    -- The organizer's trusted attendance RPC is allowed to update an attendee record.
    if new.status <> 'attended' then raise exception 'You can only RSVP for yourself'; end if;
  end if;
  select e.capacity, e.university_id, e.status, e.starts_at into v_capacity, v_university, v_event_status, v_starts_at
    from public.events e where e.id = new.event_id for update;
  select p.university_id, p.friend_mode, p.dating_mode into v_profile_university, v_friend_mode, v_dating_mode
    from public.profiles p where p.id = new.profile_id;
  if v_capacity is null or v_profile_university is distinct from v_university then raise exception 'Event is not available to this campus'; end if;
  if new.status = 'attended' then
    if auth.uid() is distinct from (select e.organizer_id from public.events e where e.id = new.event_id) then raise exception 'Only the organizer can confirm attendance'; end if;
    return new;
  end if;
  if new.status not in ('going','waitlisted','cancelled') then raise exception 'Invalid RSVP status'; end if;
  if new.social_mode = 'friend' and not coalesce(v_friend_mode,false) then raise exception 'Enable friend mode to RSVP as a friend'; end if;
  if new.social_mode = 'dating' and not coalesce(v_dating_mode,false) then raise exception 'Dating mode must be enabled to RSVP in dating mode'; end if;
  if new.status = 'going' then
    if v_event_status <> 'published' or v_starts_at <= now() then raise exception 'This event is no longer accepting RSVPs'; end if;
    select count(*) into v_count from public.event_attendees a where a.event_id = new.event_id and a.status = 'going' and a.profile_id <> new.profile_id;
    if v_count >= v_capacity then raise exception 'This event is full'; end if;
  end if;
  return new;
end;
$$;
create trigger event_rsvp_guard before insert or update on public.event_attendees
for each row execute function public.validate_event_rsvp();

-- Event attendance can only be confirmed by that event's organizer. Repeated calls do not mint XP twice.
create or replace function public.confirm_event_attendance(p_event_id uuid, p_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_organizer uuid;
begin
  select e.organizer_id into v_organizer from public.events e where e.id = p_event_id for update;
  if v_organizer is null or v_organizer <> auth.uid() then
    raise exception 'Only the event organizer can confirm attendance';
  end if;
  update public.event_attendees set status = 'attended', confirmed_at = coalesce(confirmed_at, now())
    where event_id = p_event_id and profile_id = p_profile_id and status in ('going','attended');
  if not found then raise exception 'No active RSVP found'; end if;
  insert into public.xp_transactions(profile_id, amount, reason, reference_id)
    values (p_profile_id, 100, 'event_attendance', p_event_id) on conflict (profile_id, reason, reference_id) do nothing;
end;
$$;
revoke all on function public.confirm_event_attendance(uuid, uuid) from public, anon;
grant execute on function public.confirm_event_attendance(uuid, uuid) to authenticated;

insert into public.universities(name, slug, city, country)
values ('McGill University', 'mcgill', 'Montreal', 'Canada')
on conflict (slug) do nothing;
insert into public.interests(name, category) values
 ('Art & design','creative'),('Live music','creative'),('Outdoors','lifestyle'),('Food & coffee','lifestyle'),
 ('Fitness','sports'),('Books','creative'),('Technology','academic'),('Languages','social'),('Photography','creative'),('Volunteering','community')
on conflict (name) do nothing;
insert into public.achievements(key,name,description,xp_value) values
 ('first_event','First step','Attend your first campus event.',25),
 ('neighbourhood_explorer','Neighbourhood explorer','Discover a new neighbourhood.',50),
 ('good_host','Good host','Host an event that brings people together.',50),
 ('warm_welcome','Warm welcome','Help a newcomer feel at home.',30)
on conflict (key) do nothing;
