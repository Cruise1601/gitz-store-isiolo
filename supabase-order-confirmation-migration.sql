alter table public.orders
  add column if not exists confirmed_at timestamptz;

drop policy if exists "Authenticated admins update order payment status" on public.orders;
create policy "Authenticated admins update order payment status" on public.orders
  for update to authenticated
  using (true)
  with check (true);
