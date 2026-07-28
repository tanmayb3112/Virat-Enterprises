-- Virat Enterprises — Supabase schema (Postgres) + RLS + seed.
-- Run this in the Supabase SQL editor once the project is created.
-- Mirrors VIRAT_WEBSITE_SPEC.md §8. Safe to re-run (idempotent-ish via IF NOT EXISTS).

-- =========================================================================
-- Tables
-- =========================================================================

create table if not exists branches (
  id text primary key,
  name text not null,
  brand_name text not null,
  address text not null,
  phone text,
  lat double precision,
  lng double precision,
  hours text,
  upi_id text,
  upi_qr_url text,
  notify_email text,
  notify_whatsapp text, -- customer order messages open to this WhatsApp number
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','staff','admin')),
  default_prefs jsonb,
  created_at timestamptz not null default now()
);

create table if not exists allowed_staff_emails (
  email text primary key,
  role text not null default 'staff' check (role in ('staff','admin')),
  branch_ids text[] default '{}'
);

create table if not exists staff_branches (
  profile_id uuid references profiles(id) on delete cascade,
  branch_id text references branches(id) on delete cascade,
  primary key (profile_id, branch_id)
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  label text,
  line1 text,
  line2 text,
  city text,
  pincode text,
  lat double precision,
  lng double precision
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  token text unique not null,
  customer_profile_id uuid references profiles(id) on delete set null,
  guest_name text,
  guest_phone text,
  guest_email text,
  branch_id text references branches(id),
  status text not null default 'RECEIVED',
  delivery_type text check (delivery_type in ('pickup','delivery')),
  address jsonb,
  distance_km double precision,
  delivery_fee_rule text check (delivery_fee_rule in ('free','cod_actuals')),
  subtotal numeric,
  total numeric,
  payment_mode text default 'manual',
  payment_status text default 'unpaid',
  razorpay_order_id text,
  utr_reference text,
  utm jsonb,
  items jsonb, -- denormalized snapshot of order_items for the manual/no-auth path
  completed_at timestamptz, -- set when status becomes COMPLETED/CANCELLED (see trigger)
  files_purged boolean not null default false, -- 7-day retention cron marks this
  created_at timestamptz not null default now()
);

-- Finishing choices are per-order, not per-file. Added after the table shipped,
-- so these run as alters for databases that already exist.
alter table orders add column if not exists binding text;
alter table orders add column if not exists lamination text;

-- Stamp completed_at automatically when an order reaches a terminal status —
-- the file-retention cron (app/api/cron/cleanup) deletes print files from
-- Storage 7 days after this timestamp.
create or replace function stamp_completed_at() returns trigger language plpgsql as $$
begin
  if new.status in ('COMPLETED','CANCELLED') and old.status is distinct from new.status then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_stamp_completed on orders;
create trigger orders_stamp_completed before update on orders
  for each row execute function stamp_completed_at();

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  file_path text,
  file_name text,
  page_count int,
  page_count_source text check (page_count_source in ('parsed','customer','staff')),
  prefs jsonb,
  line_total numeric
);

create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  status text,
  note text,
  actor text,
  created_at timestamptz not null default now()
);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  vendor text,
  tracking_id text,
  courier_fee numeric,
  booked_at timestamptz,
  delivered_at timestamptz
);

create table if not exists rate_card (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text,
  rate numeric,
  unit text,
  is_active boolean not null default true
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  invoice_no text unique,
  pdf_path text,
  issued_at timestamptz not null default now()
);

create table if not exists franchise_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  city text,
  budget text,
  has_space text,
  message text,
  utm jsonb,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

create table if not exists franchise_assumptions (
  key text primary key,
  value numeric
);

create table if not exists daily_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id text references branches(id),
  date date not null,
  billed_total numeric,
  received_total numeric,
  orders_count int,
  json_detail jsonb
);

-- =========================================================================
-- Helper: is the current user staff/admin?
-- =========================================================================
create or replace function is_staff() returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.role in ('staff','admin')
  );
$$;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table branches enable row level security;
alter table profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_events enable row level security;
alter table deliveries enable row level security;
alter table rate_card enable row level security;
alter table franchise_leads enable row level security;
alter table franchise_assumptions enable row level security;
alter table daily_reports enable row level security;
alter table addresses enable row level security;

-- Branches, rate card, franchise assumptions: world-readable (public site data).
drop policy if exists branches_read on branches;
create policy branches_read on branches for select using (true);
drop policy if exists branches_write on branches;
create policy branches_write on branches for all using (is_admin()) with check (is_admin());

drop policy if exists rate_read on rate_card;
create policy rate_read on rate_card for select using (true);
drop policy if exists rate_write on rate_card;
create policy rate_write on rate_card for all using (is_admin()) with check (is_admin());

drop policy if exists assumptions_read on franchise_assumptions;
create policy assumptions_read on franchise_assumptions for select using (true);
drop policy if exists assumptions_write on franchise_assumptions;
create policy assumptions_write on franchise_assumptions for all using (is_admin()) with check (is_admin());

-- Profiles: a user reads/updates their own; staff read all.
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select using (id = auth.uid() or is_staff());
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using (id = auth.uid());

-- Orders: customer sees own; staff see all (branch scoping enforced in app/service layer).
drop policy if exists orders_customer on orders;
create policy orders_customer on orders for select using (customer_profile_id = auth.uid() or is_staff());
drop policy if exists orders_staff_write on orders;
create policy orders_staff_write on orders for update using (is_staff());

-- Order items/events follow their order (staff or owning customer).
drop policy if exists items_read on order_items;
create policy items_read on order_items for select using (
  is_staff() or exists (select 1 from orders o where o.id = order_items.order_id and o.customer_profile_id = auth.uid())
);

-- Order events (the audit trail) read like order items do. Writes go through the
-- service role in /api/admin/orders, which stamps the acting staff email.
drop policy if exists events_read on order_events;
create policy events_read on order_events for select using (
  is_staff() or exists (
    select 1 from orders o where o.id = order_events.order_id and o.customer_profile_id = auth.uid()
  )
);

-- Courier bookings: staff only.
drop policy if exists deliveries_staff on deliveries;
create policy deliveries_staff on deliveries for all using (is_staff()) with check (is_staff());

-- Realtime: the dashboard subscribes to orders so a new job appears on the
-- counter screen without a refresh. Delivery still respects the policies above,
-- which is why the profiles.role sync further down matters.
-- Failing soft on purpose: the table may already be published, the publication
-- may not exist, or the role may not own it. The dashboard polls every 20s as
-- well, so losing the socket degrades the experience rather than breaking it.
do $$
begin
  alter publication supabase_realtime add table orders;
exception
  when others then null;
end $$;

-- Franchise leads: only staff/admin can read; inserts happen via service role (API).
drop policy if exists leads_staff on franchise_leads;
create policy leads_staff on franchise_leads for select using (is_staff());

-- NOTE: public order creation + lead capture go through the server API using the
-- service role key (bypasses RLS). Public order status is fetched by token via a
-- dedicated RPC/edge function in production.

-- =========================================================================
-- Auth: auto-create a profile row on signup + self-service policies
-- =========================================================================
-- profiles.role must agree with the allowed_staff_emails allowlist, which is
-- what the app treats as the source of truth (/api/me, /admin/settings).
-- is_staff()/is_admin() below read profiles.role, so without this sync every
-- RLS policy sees a staff member as a plain customer — which silently blocks
-- staff reads and stops Realtime from delivering anything to the dashboard.
create or replace function role_for_email(addr text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select a.role from allowed_staff_emails a where lower(a.email) = lower(addr)),
    'customer'
  );
$$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', null),
    role_for_email(new.email)
  )
  on conflict (id) do update set role = role_for_email(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Granting someone staff access must also apply to an account they already
-- have, otherwise the allowlist only takes effect for people who sign up after
-- being added.
create or replace function sync_profile_role_from_allowlist() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles p set role = new.role
    from auth.users u
   where u.id = p.id and lower(u.email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists allowlist_syncs_profile_role on allowed_staff_emails;
create trigger allowlist_syncs_profile_role after insert or update on allowed_staff_emails
  for each row execute function sync_profile_role_from_allowlist();

-- Backfill: anyone who signed up before the sync existed (idempotent).
update profiles p set role = role_for_email(u.email)
  from auth.users u
 where u.id = p.id and p.role is distinct from role_for_email(u.email);

-- Users may insert/update their own profile (fallback if the trigger missed).
drop policy if exists profiles_insert on profiles;
create policy profiles_insert on profiles for insert with check (id = auth.uid());

-- Addresses: full CRUD on your own rows only.
drop policy if exists addresses_own on addresses;
create policy addresses_own on addresses for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- =========================================================================
-- Storage: print-files bucket (private, 25 MB/file cap)
-- =========================================================================
-- Customers upload their print files here at order time (folder = order
-- token). WRITE-ONLY for the public: anyone can insert, nobody can read or
-- list without the service role — staff downloads use signed URLs. Files are
-- purged by the 7-day retention cron after order completion.

insert into storage.buckets (id, name, public, file_size_limit)
values ('print-files', 'print-files', false, 26214400)
on conflict (id) do nothing;

drop policy if exists "print_files_public_upload" on storage.objects;
create policy "print_files_public_upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'print-files');

-- =========================================================================
-- Seed data
-- =========================================================================
insert into branches (id, name, brand_name, address, phone, lat, lng, hours, upi_id, notify_email) values
  ('mukund-nagar','Mukund Nagar','Virat Enterprises','Shop 7, Hermes Heritage Shopping Complex, Rahim Shaikh Road, Mukund Nagar, Pune 411037','+91 98231 41366',18.5011,73.8756,'9:30 AM - 9:30 PM','virat.mukundnagar@upi',null),
  ('jm-road','JM Road','Virat','JM Road, Shivajinagar, Pune 411005','+91 98231 41366',18.5236,73.8478,'9:30 AM - 9:30 PM','virat.mukundnagar@upi',null),
  ('satara-road','Satara Road','MM Digital','Satara Road, Pune 411037','+91 98231 41366',18.4849,73.8639,'9:30 AM - 9:30 PM','virat.mukundnagar@upi',null),
  ('abc-chowk','Appa Balwant Chowk','Virat','Appa Balwant Chowk (ABC), Sadashiv Peth, Pune 411030','+91 98231 41366',18.5118,73.8536,'9:30 AM - 9:30 PM','virat.mukundnagar@upi',null),
  ('pune-corporation','Pune Corporation','Virat','Near Pune Municipal Corporation, Shivajinagar, Pune 411005','+91 98231 41366',18.5308,73.8656,'9:30 AM - 9:30 PM','virat.mukundnagar@upi',null),
  ('shanti-nagar','Shanti Nagar','Virat','Shanti Nagar, Pune','+91 98231 41366',18.4967,73.8590,'9:30 AM - 9:30 PM','virat.mukundnagar@upi',null)
on conflict (id) do nothing;

insert into rate_card (key, label, rate, unit) values
  ('a4_bw', 'A4 B/W single side (per side)', 2, 'per_side'),
  ('a4_bw_double', 'A4 B/W double side (per sheet, 2 sides)', 2, 'per_sheet'),
  ('a4_bw_bulk', 'A4 B/W bulk 100+ charged units', 1.5, 'per_unit'),
  ('a4_color', 'A4 Colour per side', 10, 'per_side'),
  ('a3_bw', 'A3 B/W per side', 5, 'per_side'),
  ('a3_color', 'A3 Colour per side', 20, 'per_side'),
  -- Jumbo / large-format (owner rate card, Jul 2026)
  ('a2_jumbo_bw', 'A2 Jumbo B/W', 30, 'per_side'),
  ('a2_jumbo_color', 'A2 Jumbo Colour', 60, 'per_side'),
  ('a1_jumbo_bw', 'A1 Jumbo B/W', 40, 'per_side'),
  ('a1_jumbo_color', 'A1 Jumbo Colour', 80, 'per_side'),
  ('a0_jumbo_bw', 'A0 Jumbo B/W', 60, 'per_side'),
  ('a0_jumbo_color', 'A0 Jumbo Colour', 120, 'per_side'),
  ('gsm_100', '100 GSM surcharge per sheet', 1, 'per_sheet'),
  ('glossy', 'Glossy per sheet', 15, 'per_sheet'),
  ('spiral', 'Spiral binding', 40, 'flat'),
  ('hard', 'Blackbook binding', 150, 'flat'),
  ('rexine', 'Rexine binding (premium)', 350, 'flat'),
  ('lamination_a4', 'Lamination per page (A4)', 20, 'per_sheet'),
  -- Specialty (owner rate card, Jul 2026)
  ('sticker_a4', 'A4 sticker print', 20, 'flat'),
  ('sticker_1218', '12x18 sticker print', 40, 'flat'),
  ('color_1218', '12x18 colour print', 40, 'flat'),
  ('sticker_transparent', 'Transparent sticker A4', 40, 'flat'),
  ('photo_a4', 'A4 photo print normal', 30, 'flat'),
  ('photo_a4_glossy', 'A4 photo high glossy', 50, 'flat'),
  ('passport_9', 'Passport photos x9', 25, 'flat'),
  ('passport_30', 'Passport photos x30', 50, 'flat'),
  ('smart_card', 'Smart card', 80, 'flat'),
  ('min_order', 'Minimum order', 20, 'flat')
on conflict (key) do nothing;

insert into franchise_assumptions (key, value) values
  ('default_monthly_sale', 100000),
  ('gross_margin_pct', 30),
  ('net_margin_pct', 20),
  ('year_growth_pct', 15)
on conflict (key) do nothing;

-- Seed the admin allowlist with the owner email (edit on /admin/settings).
insert into allowed_staff_emails (email, role) values
  ('tanmay.bhanushali@photonlegal.com', 'admin')
on conflict (email) do update set role = 'admin';
