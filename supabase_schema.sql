-- Crear la tabla de perfiles (profiles)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Política: Los usuarios pueden ver su propio perfil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Función para manejar nuevos usuarios
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para ejecutar la función cuando se crea un usuario
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
