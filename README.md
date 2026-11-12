# Gestor de turnos para barbería

Aplicación Next.js para reservar turnos online y gestionar la agenda desde un panel administrativo. El cliente reserva eligiendo día y horario con su nombre y teléfono, sin recibir correos. El precio del servicio es informativo: no se cobra ni se solicita seña online. La reserva queda confirmada al instante y el barbero recibe un aviso por email.

## Desarrollo local

1. Copiá `.env.example` a `.env` y completá las variables.
2. Levantá PostgreSQL:

```bash
npm run db:up
```

3. Aplicá migraciones y datos iniciales:

```bash
npm run db:deploy
npm run db:seed
```

4. Iniciá la app:

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). El panel admin está en `/admin`.

## Penalizaciones por no asistir

Cuando el admin marca un turno como **No asistió**, el teléfono del cliente queda bloqueado para reservar durante la cantidad de días configurada en `/admin/configuracion`. El valor por defecto es 30 días; usar `0` desactiva la penalización.

- El bloqueo se aplica tanto a reservas online como a turnos manuales del admin.
- La identificación es por teléfono, sin distinguir espacios, guiones ni el prefijo +.
- En `/admin/penalizaciones` se pueden ver las penalizaciones activas y levantarlas manualmente.
- Los turnos marcados como no asistidos antes de aplicar esta funcionalidad no generan penalizaciones retroactivas.

## Variables de entorno

- `DATABASE_URL`: conexión usada por la app en desarrollo local.
- `DIRECT_URL`: conexión directa usada por Prisma para migraciones locales.
- `NEXT_PUBLIC_APP_URL`: URL pública de la app (se usa en el aviso al barbero).
- `AUTH_SECRET`: secreto de sesión del panel admin.
- `ADMIN_EMAIL` y `ADMIN_PASSWORD`: credenciales del administrador. Cuando ambas están definidas, son la fuente de verdad: el login del panel las valida y sincroniza el usuario en la base. Para cambiarlas, actualizá las variables y volvé a iniciar sesión.
- `RESEND_API_KEY` y `EMAIL_FROM`: envío del aviso al barbero con Resend. Sin `RESEND_API_KEY` la app sigue funcionando, pero omite el aviso en producción.

## Despliegue en Netlify

El sitio está desplegado en Netlify y usa **Netlify Database** (Postgres administrado, basado en Neon). Las migraciones viven en `netlify/database/migrations` y Netlify las aplica automáticamente en cada deploy.

1. Conectá el repositorio al sitio de Netlify. `netlify.toml` fija Node 22 y `npm run build`.
2. Habilitá la base desde el panel del proyecto (`Database`) o con:

```bash
npx netlify database status
```

3. Cargá estas variables en Netlify (`Site configuration > Environment variables`):

```bash
NEXT_PUBLIC_APP_URL="https://<tu-dominio>"
AUTH_SECRET="<openssl rand -base64 48>"
ADMIN_EMAIL="<email-real-del-barbero>"
ADMIN_PASSWORD="<contraseña-larga-y-única>"
RESEND_API_KEY="<api-key-de-resend>"
EMAIL_FROM="Barbería <turnos@tu-dominio-verificado>"
```

No cargues `DATABASE_URL` ni `DIRECT_URL` en producción: Netlify inyecta `NETLIFY_DB_URL` y la app la usa automáticamente.

4. Desplegá. Usá siempre el script del proyecto: oculta el `.env` local durante el build para que las credenciales de desarrollo no queden dentro de la función en producción.

```bash
npm run deploy
```

Las migraciones pendientes se aplican solas. Si desplegás desde la UI de Netlify (con el repo conectado) no hace falta este paso, porque el `.env` no está versionado.

Para revisar el estado de las migraciones:

```bash
npx netlify database status
npx netlify api listSiteDatabaseMigrations --data '{"site_id":"<site-id>"}'
```

### Cambios de esquema en producción

Prisma se usa en desarrollo (`prisma migrate dev`), pero producción se migra con los archivos SQL de `netlify/database/migrations`. Al cambiar `prisma/schema.prisma`:

1. Generá la migración local con `npm run db:migrate`.
2. Creá una migración de Netlify con `npx netlify database migrations new <nombre>`.
3. Copiá el SQL equivalente en el archivo generado, revisalo y commitealo junto con el cambio de Prisma.
4. Desplegá; Netlify aplica la migración.

### Emails

La app solo envía un aviso al barbero (`ADMIN_EMAIL`) cuando entra una reserva online. Verificá el dominio en Resend y usá ese dominio en `EMAIL_FROM`. Con `onboarding@resend.dev` solo podés enviar al email de tu cuenta de Resend, no a terceros.

## Comandos

```bash
npm run dev
npm run build
npm run start
npm run deploy
npm run lint
npm run typecheck
npm run test
npm run db:migrate
npm run db:deploy
npm run db:seed
```
