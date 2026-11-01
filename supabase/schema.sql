-- Rojgaar database schema. Run once in Supabase Dashboard > SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles (one per auth user, created automatically on sign-up)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  city text not null default '' check (char_length(city) <= 80),
  state text check (state is null or char_length(state) <= 80),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that signed up before this trigger existed.
insert into public.profiles (id, full_name)
select u.id, left(coalesce(u.raw_user_meta_data ->> 'full_name', ''), 80)
from auth.users u on conflict (id) do nothing;

alter table public.profiles enable row level security;
drop policy if exists "profiles readable by members" on public.profiles;
create policy "profiles readable by members" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- tasks and interests
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 3 and 2000),
  category text not null check (char_length(category) <= 60),
  reward numeric(10,2) not null check (reward > 0),
  city text not null check (char_length(city) between 1 and 80),
  state text check (state is null or char_length(state) <= 80),
  created_at timestamptz not null default now()
);
create index if not exists tasks_created_idx on public.tasks (created_at desc);
create index if not exists tasks_user_idx on public.tasks (user_id);

create table if not exists public.task_interests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);
create index if not exists task_interests_user_idx on public.task_interests (user_id);

alter table public.tasks enable row level security;
alter table public.task_interests enable row level security;

drop policy if exists "tasks readable by members" on public.tasks;
create policy "tasks readable by members" on public.tasks
  for select to authenticated using (true);
drop policy if exists "tasks insert own" on public.tasks;
create policy "tasks insert own" on public.tasks
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "tasks update own" on public.tasks;
create policy "tasks update own" on public.tasks
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "tasks delete own" on public.tasks;
create policy "tasks delete own" on public.tasks
  for delete to authenticated using (user_id = (select auth.uid()));

-- A person sees their own interests; a task owner sees interests on their tasks.
drop policy if exists "interests readable by self or owner" on public.task_interests;
create policy "interests readable by self or owner" on public.task_interests
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
  );
drop policy if exists "interests insert own" on public.task_interests;
create policy "interests insert own" on public.task_interests
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and not exists (select 1 from public.tasks t where t.id = task_id and t.user_id = (select auth.uid()))
  );
drop policy if exists "interests delete own" on public.task_interests;
create policy "interests delete own" on public.task_interests
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- worker enrollment
--   worker_directory : public-to-members fields (name, skill, rate, photo ...)
--   worker_private   : mobile, UPI, ID digest. No client policies => only the
--                      service role (Edge Functions) can read or write it.
-- Rows are created ONLY by the enroll-worker Edge Function.
-- ---------------------------------------------------------------------------
create table if not exists public.worker_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  registration_id text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 80),
  masked_mobile text not null,
  skill text not null,
  daily_rate numeric(10,2) not null check (daily_rate > 0),
  experience_years numeric(4,1) not null check (experience_years between 0 and 80),
  pincode text not null check (pincode ~ '^[0-9]{6}$'),
  district text not null,
  state text not null,
  photo_path text not null,
  audio_path text not null default '',
  is_available boolean not null default true,
  enrollment_status text not null default 'submitted'
    check (enrollment_status in ('submitted', 'under_review', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now()
);
create index if not exists worker_directory_status_idx on public.worker_directory (enrollment_status, created_at desc);

create table if not exists public.worker_private (
  user_id uuid primary key references public.worker_directory(user_id) on delete cascade,
  mobile text not null unique check (mobile ~ '^[6-9][0-9]{9}$'),
  upi_id text not null,
  id_hmac text not null unique,
  id_last4 text not null check (id_last4 ~ '^[0-9]{4}$')
);

alter table public.worker_directory enable row level security;
alter table public.worker_private enable row level security;

drop policy if exists "directory readable by members" on public.worker_directory;
create policy "directory readable by members" on public.worker_directory
  for select to authenticated using (enrollment_status in ('submitted', 'under_review', 'approved') or user_id = (select auth.uid()));
drop policy if exists "directory owner updates availability" on public.worker_directory;
create policy "directory owner updates availability" on public.worker_directory
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- Owners may change ONLY is_available (column-level grant).
revoke insert, update, delete on public.worker_directory from anon, authenticated;
grant update (is_available) on public.worker_directory to authenticated;
revoke all on public.worker_private from anon, authenticated;

-- ---------------------------------------------------------------------------
-- conversations, messages, bookings
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  worker_id uuid not null references public.worker_directory(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_customer_id_fkey foreign key (customer_id) references public.profiles(id) on delete cascade,
  check (customer_id <> worker_id),
  unique (customer_id, worker_id)
);
create index if not exists conversations_worker_idx on public.conversations (worker_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text', 'offer', 'voice', 'location')),
  content text not null default '' check (char_length(content) <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  worker_id uuid not null references auth.users(id) on delete cascade,
  task_description text not null check (char_length(task_description) between 3 and 1000),
  offer_amount numeric(10,2) not null check (offer_amount > 0),
  counter_amount numeric(10,2) check (counter_amount is null or counter_amount > 0),
  status text not null default 'offered'
    check (status in ('offered', 'countered', 'accepted', 'declined', 'paid', 'completed', 'cancelled')),
  payment_method text check (payment_method in ('upi', 'razorpay')),
  payment_order_id text,
  payment_id text,
  payment_claimed_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookings_conv_idx on public.bookings (conversation_id, created_at desc);
create index if not exists bookings_order_idx on public.bookings (payment_order_id);

-- Hashed completion codes live apart so participants can never read them.
create table if not exists public.booking_completion (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_completion enable row level security;
revoke all on public.booking_completion from anon, authenticated;

drop policy if exists "conversations for participants" on public.conversations;
create policy "conversations for participants" on public.conversations
  for select to authenticated using ((select auth.uid()) in (customer_id, worker_id));

drop policy if exists "messages read by participants" on public.messages;
create policy "messages read by participants" on public.messages
  for select to authenticated using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and (select auth.uid()) in (c.customer_id, c.worker_id)));
drop policy if exists "messages sent by participants" on public.messages;
create policy "messages sent by participants" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and (select auth.uid()) in (c.customer_id, c.worker_id)));

drop policy if exists "bookings read by participants" on public.bookings;
create policy "bookings read by participants" on public.bookings
  for select to authenticated using ((select auth.uid()) in (customer_id, worker_id));
-- No insert/update/delete policies on bookings: all changes go through the RPCs below.

-- ---------------------------------------------------------------------------
-- RPCs (security definer, each re-checks who the caller is)
-- ---------------------------------------------------------------------------
create or replace function public.start_worker_conversation(p_worker_id uuid)
returns public.conversations language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  conv public.conversations;
begin
  if me is null then raise exception 'Please sign in.'; end if;
  if me = p_worker_id then raise exception 'You cannot chat with yourself.'; end if;
  if not exists (select 1 from public.worker_directory
                 where user_id = p_worker_id and enrollment_status in ('submitted', 'under_review', 'approved')) then
    raise exception 'This worker is not available.';
  end if;
  insert into public.conversations (customer_id, worker_id) values (me, p_worker_id)
    on conflict (customer_id, worker_id) do nothing;
  select * into conv from public.conversations where customer_id = me and worker_id = p_worker_id;
  return conv;
end $$;

create or replace function public.start_booking_offer(p_conversation_id uuid, p_amount numeric, p_description text)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  conv public.conversations;
  b public.bookings;
begin
  select * into conv from public.conversations where id = p_conversation_id;
  if not found or conv.customer_id is distinct from me then raise exception 'Only the customer can make an offer.'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000000 then raise exception 'Enter a valid amount.'; end if;
  if char_length(btrim(coalesce(p_description, ''))) < 3 then raise exception 'Describe the work.'; end if;
  insert into public.bookings (conversation_id, customer_id, worker_id, task_description, offer_amount)
  values (conv.id, conv.customer_id, conv.worker_id, left(btrim(p_description), 1000), round(p_amount, 2))
  returning * into b;
  return b;
end $$;

create or replace function public.respond_to_booking_offer(p_booking_id uuid, p_action text, p_counter_amount numeric default null)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.worker_id is distinct from me then raise exception 'Only the worker can respond to this offer.'; end if;
  if b.status <> 'offered' then raise exception 'This offer was already answered.'; end if;
  if p_action = 'accept' then
    update public.bookings set status = 'accepted', updated_at = now() where id = b.id returning * into b;
  elsif p_action = 'decline' then
    update public.bookings set status = 'declined', updated_at = now() where id = b.id returning * into b;
  elsif p_action = 'counter' then
    if p_counter_amount is null or p_counter_amount <= 0 or p_counter_amount > 10000000 then
      raise exception 'Enter a valid counter amount.';
    end if;
    update public.bookings set status = 'countered', counter_amount = round(p_counter_amount, 2), updated_at = now()
      where id = b.id returning * into b;
  else
    raise exception 'Unknown action.';
  end if;
  return b;
end $$;

create or replace function public.accept_booking_counter(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.customer_id is distinct from me then raise exception 'Only the customer can accept a counter offer.'; end if;
  if b.status <> 'countered' or b.counter_amount is null then raise exception 'There is no counter offer to accept.'; end if;
  update public.bookings set status = 'accepted', offer_amount = counter_amount, updated_at = now()
    where id = b.id returning * into b;
  return b;
end $$;

create or replace function public.select_direct_upi_payment(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.customer_id is distinct from me then raise exception 'Only the customer can pay.'; end if;
  if b.status <> 'accepted' then raise exception 'This booking is not ready for payment.'; end if;
  if b.payment_method = 'razorpay' and b.payment_id is not null then raise exception 'Payment already received.'; end if;
  update public.bookings set payment_method = 'upi', updated_at = now() where id = b.id returning * into b;
  return b;
end $$;

create or replace function public.claim_direct_upi_payment(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.customer_id is distinct from me then raise exception 'Only the customer can do this.'; end if;
  if b.status <> 'accepted' or b.payment_method is distinct from 'upi' then raise exception 'Choose direct UPI first.'; end if;
  update public.bookings set payment_claimed_at = coalesce(payment_claimed_at, now()), updated_at = now()
    where id = b.id returning * into b;
  return b;
end $$;

create or replace function public.confirm_direct_upi_payment(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.worker_id is distinct from me then raise exception 'Only the worker can confirm receipt.'; end if;
  if b.status <> 'accepted' or b.payment_method is distinct from 'upi' or b.payment_claimed_at is null then
    raise exception 'The customer has not reported a UPI payment.';
  end if;
  update public.bookings set status = 'paid', paid_at = now(), updated_at = now() where id = b.id returning * into b;
  return b;
end $$;

-- Only signed-in users may call the RPCs.
do $$
declare fn text;
begin
  foreach fn in array array[
    'start_worker_conversation(uuid)',
    'start_booking_offer(uuid, numeric, text)',
    'respond_to_booking_offer(uuid, text, numeric)',
    'accept_booking_counter(uuid)',
    'select_direct_upi_payment(uuid)',
    'claim_direct_upi_payment(uuid)',
    'confirm_direct_upi_payment(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for worker photos / bios / chat voice notes.
-- Anyone with a file URL can open it (the app shows photos on public cards).
-- Users can only write inside their own <user-id>/ folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('worker-media', 'worker-media', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp4'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "worker-media upload own folder" on storage.objects;
create policy "worker-media upload own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'worker-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "worker-media read own folder" on storage.objects;
create policy "worker-media read own folder" on storage.objects
  for select to authenticated using (
    bucket_id = 'worker-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "worker-media delete own folder" on storage.objects;
create policy "worker-media delete own folder" on storage.objects
  for delete to authenticated using (
    bucket_id = 'worker-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Realtime (chat + booking updates). RLS still applies to what each user receives.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings') then
    alter publication supabase_realtime add table public.bookings;
  end if;
end $$;
