# Fase 5 — Revisión de seguridad del sistema

Fecha: revisión aplicada. Ámbito: `src/lib/auth.ts`, `src/lib/errores.ts`,
`src/lib/actions/*`, `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts`,
`next.config.ts`. No se modificaron UI, `queries.ts`, `reportes.ts` ni `package.json`.

## Tabla de verificación

| # | Área | Estado | Detalle |
|---|------|--------|---------|
| 1 | Rate limiting login (por email) | **Corregido** | 5 intentos fallidos / 15 min por email se mantiene (ventana deslizante). Se añadió el **reset del contador tras un login exitoso**: la consulta solo cuenta los fallos posteriores al último `login_exitoso` del email (subconsulta `MAX(timestamp)`); la expiración natural ya la da la ventana de 15 min. |
| 1b | Rate limiting login (por IP) | **Corregido** | Se añadió límite **por IP** (15 intentos / 15 min, contando `login_fallido` + `login_bloqueado`) para evitar fuerza bruta distribuida (muchos emails desde una misma IP). Se ignora la IP `'desconocida'` sin degradar el límite por email. |
| 2 | Inyección SQL en `$queryRaw` | **OK** | Todas las consultas crudas usan template literal de Prisma con parámetros `${}`: `src/lib/auth.ts` (`email`, `desde`, `ip`), `src/lib/actions/{ventas,gastos,cajas}.ts` (ids/`FOR UPDATE`) y `src/lib/reportes.ts` (`fechas`, `limite`). No existe `$queryRawUnsafe`, `$executeRaw` ni concatenación de entrada del usuario. |
| 3 | Validación de entrada en server actions | **Corregido** | Se añadió validación Zod en runtime para identificadores numéricos y estados que no la tenían: `gastoId` y `aprobar` (`gastos.ts`), `id` de servicio/usuario (`servicios.ts`, `usuarios.ts`), `estado` como `enum`. Montos con `.finite()` y tope (10 000 000) en cajas/gastos/servicios; ventas con tope de cantidad (1000) e items (50). Se conservaron firmas y resultados. |
| 4 | Autorización por rol en el servidor | **OK** | Todas las actions comienzan con `requerirAdmin()` / `requerirCaja()` / `obtenerSesion()`. `obtenerSesion()` re-lee el usuario y su rol **desde la BD en cada request** (un admin desactivado o degradado pierde el acceso de inmediato, sin esperar la expiración del JWT). `src/proxy.ts` (middleware de Next 16) protege `/admin/:path*` y `/caja/:path*` por rol. La UI no es la única barrera. |
| 5 | CSRF / POST en la red / API | **OK** | La única ruta API expuesta es `src/app/api/auth/[...nextauth]/route.ts` (NextAuth). NextAuth aplica CSRF por defecto (token + cookie `HttpOnly`, SameSite=Lax) y todo intento de `credentials` es `POST`. Las server actions de Next.js son siempre `POST` y validan el origen de la petición (mismo origen) de forma nativa. No se expone ninguna otra ruta de datos/acciones. |
| 6 | Errores y fugas de información | **Corregido** | Nuevo `ErrorDeNegocio`: solo este tipo de error (mensajes redactados por nosotros) expone su texto al cliente. `manejarError()` devuelve mensaje **genérico** para cualquier otro `Error` y para errores Prisma; los errores Zod devuelven sus mensajes. Se convirtieron los `throw new Error(...)` de transacciones a `ErrorDeNegocio`. La página de login usa mensaje genérico. Además se mitigó un **oráculo de temporización** en login (bcrypt dummy cuando el email no existe y chequeo de estado tras validar la contraseña). |
| 6b | Errores no autenticado vs no autorizado | **OK** | La app no diferencia públicamente 401/403: las actions devuelven mensajes de negocio y el proxy redirige; cualquier error de autorización inesperado se convierte en mensaje genérico (no confirma roles estructurales a un atacante que llame actions directamente). |
| 7 | Secrets | **OK** | No hay `DATABASE_URL`, `postgresql://`, `NEXTAUTH_SECRET` ni claves reales en código ni en el historial de git (el único match es `.env.example` con placeholders `usuario:password` / `genera-un-secreto…`). `.env` está en `.gitignore` (`.env*` + `!.env.example`). `package.json` no contiene secretos. |
| 8 | Cookies de sesión | **Corregido** | `useSecureCookies: true` en producción: cookies `HttpOnly` (no accesibles desde JS), `SameSite=Lax`, atributo `Secure` y prefijos `__Secure-` / `__Host-`. JWT con `maxAge` de 8 h. |
| 9 | Cabeceras de seguridad (`next.config.ts`) | **Corregido** | Se añadió `poweredByHeader: false` (oculta el banner `x-powered-by: Next.js`) y la cabecera `Cross-Origin-Opener-Policy: same-origin`. Ya existían CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`. |
| 10 | Otros / recomendaciones | **Recomendación** | (a) Para limitar también los intentos contra **emails inexistentes** (que hoy no se auditan por no tener `usuario_id`) convendría una tabla dedicada de intentos — requiere migración y toca el esquema, se deja fuera. (b) Evaluar endurecer la CSP quitando `'unsafe-eval'`/`'unsafe-inline'` tras validar el build de producción. (c) Desconfiar de `x-forwarded-for` si el proxy cambia: es best-effort para limitación. |

## Correcciones aplicadas

- **`src/lib/auth.ts`**
  - Rate limit por email ahora **se reinicia con el login exitoso** (subconsulta del último `login_exitoso`) y deja de contar fallos antiguos de forma natural (ventana 15 min).
  - Nuevo límite **por IP** (`excesoDeIntentosPorIp`, 15/15min) contra fuerza bruta distribuida, con reset por éxito y con `FOR UPDATE`-libre (solo lectura de auditoría).
  - **Igualación de tiempos** para emails inexistentes (hash bcrypt dummy) y chequeo de `estado` **después** de validar la contraseña: se evita enumerar cuentas por temporización.
  - `useSecureCookies` según entorno para cookies seguras en producción.
- **`src/lib/errores.ts`**
  - Nueva clase `ErrorDeNegocio` (único tipo de error que muestra su mensaje al cliente).
  - `manejarError()` ahora devuelve mensaje **genérico** para cualquier `Error` que no sea `ZodError`, `ErrorDeNegocio` o error Prisma conocido → no se filtran internals accidentales.
- **`src/lib/actions/ventas.ts`** — `throw new Error` → `ErrorDeNegocio`; topes de `cantidad` (≤1000) y de items por venta (≤50). Se validaba id/estado (ya con Zod).
- **`src/lib/actions/gastos.ts`** — `throw new Error` → `ErrorDeNegocio`; validación Zod de `gastoId` y de `aprobar` (boolean); `monto` con `.finite()` y tope.
- **`src/lib/actions/cajas.ts`** — `throw new Error` → `ErrorDeNegocio`; montos con `.finite()` y tope.
- **`src/lib/actions/servicios.ts`** — validación Zod de `id` y de `estado` (`enum`); `precio` con `.finite()` y tope.
- **`src/lib/actions/usuarios.ts`** — validación Zod de `id` y de `estado` (`enum`).
- **`next.config.ts`** — `poweredByHeader: false` y cabecera `Cross-Origin-Opener-Policy: same-origin`.
- **`src/app/api/auth/[...nextauth]/route.ts`** — sin cambios (correcto tal cual).
- **`src/proxy.ts`** — sin cambios (protección por rol correcta).

## Verificaciones sin cambios requeridos

- **Solo una ruta API**: `/api/auth/[...nextauth]` (NextAuth GET/POST).
- **SQL**: 9 usos de `$queryRaw` revisados; todos con parámetros.
- **Secrets en git**: única coincidencia histórica es `.env.example` (placeholders). No hay `.env` trackeado.
- **Validación previa**: ya existían esquemas Zod para creaciones/ediciones principales (usuarios, servicios, gastos, ventas, cajas).