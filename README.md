# Antigravity Sprint 2 - Realtime Auth

## Descripción

Este proyecto implementa un flujo completo de autenticación en tiempo real utilizando Supabase Auth en una aplicación React + Vite. Permite a los usuarios registrarse, iniciar sesión y mantener su sesión activa de forma segura.

## Stack Tecnológico

- **Frontend:** React + Vite
- **Backend / Auth:** Supabase Auth & Database
- **Estilos:** CSS Modules / Vanilla CSS

## Configuración y Variables de Entorno

Para correr este proyecto necesitas configurar las variables de entorno. Puedes usar el archivo `.env.example` como guía para crear tu propio archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

## Instalación y Ejecución Local

1.  Clonar el repositorio y asegurarse de estar en la rama correcta:

    ```bash
    git checkout feature/auth-flow
    ```

2.  Instalar las dependencias del proyecto:

    ```bash
    npm install
    ```

3.  Iniciar el servidor de desarrollo:
    ```bash
    npm run dev
    ```

## Flujo de Autenticación Implementado

- **Sign Up:** Registro de nuevos usuarios utilizando correo electrónico y contraseña.
- **Login:** Inicio de sesión para usuarios existentes validando credenciales contra Supabase.
- **Logout:** Funcionalidad de cierre de sesión que invalida el token actual.
- **Persistencia de Sesión:** El estado de autenticación se mantiene activo incluso después de recargar la página, gestionado automáticamente por el cliente de Supabase.

## Estructura de Archivos Relevantes

- `src/lib/supabaseClient.js`: Inicialización y configuración del cliente de Supabase usando las variables de entorno.
- `src/components/Auth.jsx`: Componente que gestiona la interfaz de usuario para el inicio de sesión, registro y cierre de sesión.
- `src/App.jsx`: Componente principal que integra el contexto de autenticación y renderiza la vista condicionalmente basada en la sesión del usuario.

## Base de Datos (SQL)

Para que el sistema funcione correctamente, debes ejecutar el siguiente script SQL en el editor SQL de tu proyecto en Supabase. Esto creará la tabla de `profiles` y configurará un trigger para crear automáticamente una entrada en esta tabla cada vez que se registre un nuevo usuario en `auth.users`.

```sql
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
```

## Verificación

1.  Levanta el proyecto con `npm run dev`.
2.  Ingresa un correo electrónico para registrarte o recibir un Magic Link.
3.  Verifica en el dashboard de Supabase (sección Authentication) que el usuario se haya creado.
4.  Verifica en el dashboard de Supabase (Editor de Tablas) que se haya creado un registro correspondiente en la tabla `public.profiles`.
5.  Recarga la página y confirma que la sesión usuario persiste sin necesidad de volver a loguearse.

## Rama

`feature/auth-flow`

## Developer

**Developer 1 — Autenticación**
