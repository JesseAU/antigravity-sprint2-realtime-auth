-- 1. Crear la tabla 'rooms'
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  host_id uuid not null references auth.users(id) on delete cascade,
  guest_id uuid references auth.users(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  created_at timestamp with time zone default now() not null
);

-- 2. Habilitar RLS (Seguridad a nivel de fila)
alter table public.rooms enable row level security;

-- 3. Políticas de Seguridad (RLS)
-- Permitir lectura pública (para que todos vean las salas disponibles)
create policy "Rooms are viewable by everyone" 
  on public.rooms for select 
  using (true);

-- Permitir crear salas solo a usuarios autenticados
create policy "Authenticated users can create rooms" 
  on public.rooms for insert 
  to authenticated 
  with check (auth.uid() = host_id);

-- Permitir actualizar sala solo si eres el host o el guest (para unirse/finalizar)
-- Nota: Para mayor seguridad en producción, usaríamos una RPC (función), pero para este Sprint permitimos update directo con validación simple.
create policy "Users can update their rooms" 
  on public.rooms for update 
  using (auth.uid() = host_id or auth.uid() = guest_id);

-- 4. ⚠️ IMPORTANTE: Habilitar Realtime para esta tabla
-- Esto permite que el Developer 3 escuche los cambios en vivo.
alter publication supabase_realtime add table public.rooms;

-- Tips para Developer 2:
-- Ejecuta este script en el SQL Editor de Supabase.
-- Verifica en "Table Editor" que la tabla se creó.
