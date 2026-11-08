create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  icon text,
  image_url text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  postal text not null,
  total numeric(12,2) not null check (total >= 0),
  payment_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  price numeric(12,2) not null,
  quantity integer not null check (quantity > 0)
);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Anyone can view product images" on storage.objects;
create policy "Anyone can view product images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "Authenticated admins upload product images" on storage.objects;
create policy "Authenticated admins upload product images" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "Authenticated admins update product images" on storage.objects;
create policy "Authenticated admins update product images" on storage.objects
  for update to authenticated using (bucket_id = 'product-images');

drop policy if exists "Authenticated admins delete product images" on storage.objects;
create policy "Authenticated admins delete product images" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products" on public.products for select using (true);

drop policy if exists "Authenticated admins manage products" on public.products;
create policy "Authenticated admins manage products" on public.products
  for all to authenticated using (true) with check (true);

drop policy if exists "Anyone can create orders" on public.orders;
create policy "Anyone can create orders" on public.orders for insert with check (true);

drop policy if exists "Authenticated admins view orders" on public.orders;
create policy "Authenticated admins view orders" on public.orders
  for select to authenticated using (true);

drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items" on public.order_items for insert with check (true);

drop policy if exists "Authenticated admins view order items" on public.order_items;
create policy "Authenticated admins view order items" on public.order_items
  for select to authenticated using (true);

insert into public.products (name, category, price, stock, icon, description)
select * from (values
  ('Golden Oat Granola', 'Pantry', 850, 24, '🥣', 'Crunchy, golden and lightly sweet.'),
  ('Citrus Sparkling Water', 'Beverages', 425, 42, '🍋', 'Bright bubbles, zero added sugar.'),
  ('Cedar & Sage Soap', 'Personal care', 675, 18, '🧼', 'A gentle bar with a fresh finish.'),
  ('Sunday Linen Spray', 'Home', 1400, 9, '🫧', 'Soft, clean scent for slower days.'),
  ('Sea Salt Crackers', 'Snacks', 550, 31, '🥨', 'Golden baked with a little crunch.'),
  ('Green Tea Blend', 'Beverages', 1100, 15, '🍵', 'A calming blend for your daily ritual.'),
  ('Olive Oil Essentials', 'Pantry', 1850, 12, '🫒', 'Cold-pressed and full of flavor.'),
  ('Bamboo Dish Brush', 'Home', 725, 20, '🧹', 'A durable helper for everyday dishes.')
) as seed(name, category, price, stock, icon, description)
where not exists (select 1 from public.products);
