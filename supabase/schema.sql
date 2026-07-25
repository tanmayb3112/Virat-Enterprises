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
  created_at timestamptz not null default now()
);

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

-- Franchise leads: only staff/admin can read; inserts happen via service role (API).
drop policy if exists leads_staff on franchise_leads;
create policy leads_staff on franchise_leads for select using (is_staff());

-- NOTE: public order creation + lead capture go through the server API using the
-- service role key (bypasses RLS). Public order status is fetched by token via a
-- dedicated RPC/edge function in production.

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
  ('a4_bw', 'A4 B/W per side (70 GSM)', 2, 'per_side'),
  ('a4_bw_bulk', 'A4 B/W per side, 100+ sides', 1.5, 'per_side'),
  ('a4_color', 'A4 Colour per side', 10, 'per_side'),
  ('a3_bw', 'A3 B/W per side', 5, 'per_side'),
  ('a3_color', 'A3 Colour per side', 20, 'per_side'),
  ('gsm_100', '100 GSM surcharge per sheet', 1, 'per_sheet'),
  ('glossy', 'Glossy per sheet', 15, 'per_sheet'),
  ('spiral', 'Spiral binding', 40, 'flat'),
  ('hard', 'Hard binding', 150, 'flat'),
  ('lamination_a4', 'Lamination per page (A4)', 20, 'per_sheet'),
  ('min_order', 'Minimum order', 20, 'flat')
on conflict (key) do nothing;

insert into franchise_assumptions (key, value) values
  ('default_monthly_sale', 100000),
  ('gross_margin_pct', 30),
  ('net_margin_pct', 20),
  ('year_growth_pct', 15)
on conflict (key) do nothing;

-- Seed the admin allowlist with the owner email (edit as needed).
insert into allowed_staff_emails (email, role) values
  ('tanmay.bhanushali@photonlegal.com', 'admin')
on conflict (email) do nothing;
