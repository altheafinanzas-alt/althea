# Althea CRM — Web + base de datos segura

Este proyecto reemplaza el HTML original (datos hardcodeados + `localStorage`)
por un sitio con login real y una base de datos Postgres en Supabase, protegida
con Row Level Security (cada asesor solo ve los equipos a los que tiene acceso).

## Estructura

- `index.html` / `app.js` — el CRM (mismo diseño de siempre, ahora leyendo/escribiendo en Supabase).
- `login.html` — pantalla de login.
- `supabase-client.js` — configuración de conexión (hay que completar 2 valores, ver paso 2).
- `supabase/schema.sql` — tablas, índices y políticas de seguridad.
- `supabase/seed.sql` — los 629 clientes migrados desde el HTML original.
- `tools/` — scripts usados para la migración (no se necesitan de nuevo).

## Paso 1 — Crear el proyecto en Supabase

1. Ir a https://supabase.com y crear una cuenta gratis (con Google o email).
2. "New project" → elegir un nombre (ej: `althea-crm`), una contraseña para la base
   (guardala, no es la que vas a usar para loguearte en el CRM) y la región más
   cercana (ej: South America).
3. Esperar ~2 minutos a que el proyecto se aprovisione.

## Paso 2 — Crear las tablas

1. En el dashboard del proyecto, ir a **SQL Editor** → **New query**.
2. Pegar todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecutar (Run).
3. Nueva query → pegar todo [`supabase/seed.sql`](supabase/seed.sql) y ejecutar.
   Esto carga los 629 clientes. Verificar en **Table Editor → clientes** que el
   conteo de filas sea 629.

## Paso 3 — Crear los usuarios (login)

1. Ir a **Authentication → Users → Add user** (con email + contraseña), uno por
   cada persona: por ejemplo `agos@altheaweb.com`, `diego@altheaweb.com`,
   `tiago@altheaweb.com` (podés usar cualquier email real o ficticio, no hace
   falta que reciba correos).
2. Por cada usuario creado, copiá su **User UID** (aparece en la lista de
   usuarios) y volvé a **SQL Editor** para vincularlo a un perfil. Ejemplo para Agos
   (ve mis-clientes + equipo-fernanda, no es admin):

   ```sql
   insert into public.profiles (id, nombre, asesor_alias, team_acceso, es_admin)
   values ('PEGAR-AQUI-EL-UID', 'Agos', 'Agos', array['mis-clientes','equipo-fernanda'], false);
   ```

   Para Diego (equipo-gallo):
   ```sql
   insert into public.profiles (id, nombre, asesor_alias, team_acceso, es_admin)
   values ('UID-DE-DIEGO', 'Diego', 'Diego', array['equipo-gallo'], false);
   ```

   Para Tiago (equipo-gallo):
   ```sql
   insert into public.profiles (id, nombre, asesor_alias, team_acceso, es_admin)
   values ('UID-DE-TIAGO', 'Tiago', 'Tiago', array['equipo-gallo'], false);
   ```

   Si querés que alguien (por ejemplo vos) vea todos los equipos, poné `es_admin = true`
   en vez de listar `team_acceso`.

## Paso 4 — Conectar el frontend a tu proyecto

1. En el dashboard de Supabase: **Project Settings → API**.
2. Copiar **Project URL** y **anon public key**.
3. Abrir [`supabase-client.js`](supabase-client.js) y completar:
   ```js
   const SUPABASE_URL = 'https://xxxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```
   Esta key es pública por diseño — la protección real la dan las políticas RLS
   del paso 2. Nunca pegues ahí la "service_role key".

## Paso 5 — Probar en local

Como es un sitio estático, alcanza con abrirlo con un servidor simple (no doble clic
en el archivo, porque algunos navegadores bloquean `fetch` con `file://`):

```powershell
# Desde la carpeta del proyecto
npx serve .
# o, si tenés Python:
python -m http.server 8080
```

Abrir `http://localhost:PUERTO/login.html`, ingresar con uno de los usuarios creados
en el paso 3 y verificar que veas solo los clientes de tu equipo.

## Paso 6 — Deploy gratis (Vercel)

1. Crear cuenta en https://vercel.com (podés entrar con GitHub).
2. Subir esta carpeta a un repositorio de GitHub (o usar `vercel` CLI directo sin
   GitHub: `npx vercel` desde esta carpeta y seguir las instrucciones).
3. En Vercel, "Add New Project" → importar el repo → Deploy. No necesita build
   ni variables de entorno (es HTML/JS estático).
4. Vercel te da una URL `https://tu-proyecto.vercel.app` — compartirla con tu equipo.

## Notas de seguridad

- Cada usuario solo puede ver/editar clientes de los equipos en su `team_acceso`
  (enforced en el servidor por RLS, no solo en la UI).
- No hay función de borrado de clientes expuesta a propósito. Si la necesitás en
  el futuro, hay que agregar una policy de `delete` explícita (restringida a admins)
  en `supabase/schema.sql`.
- Cambiar contraseñas de usuarios: **Authentication → Users → (usuario) → Reset password**.
