# Fase 5 — Seguridad, Pruebas y Despliegue · Resumen

> Entrega final del proyecto **Sistema de Gestión para Lavado de Autos (Car Wash)**.
> Rama: `main` · Sesión de cierre de Fase 5 (Agosto 2026).

---

## 1. Checklist de seguridad (verificado ✅)

| # | Comprobación | Estado |
|---|---|---|
| 1 | Caja **no** puede acceder a `/admin/reportes`, `/admin/usuarios`, `/admin/servicios` ni por URL directa | ✅ proxy (`withAuth`) + guardas de rol en layouts |
| 2 | Todas las rutas sensibles verifican rol en el servidor (no solo ocultar botones) | ✅ `src/proxy.ts` + `requerirAdmin`/`requerirCaja` en server actions y layouts |
| 3 | Contraseñas hasheadas (bcrypt, 10 rondas), nunca en texto plano ni logs | ✅ bcryptjs; seed con hash; auditoría guarda solo email |
| 4 | Protección CSRF/XSS/SQL Injection | ✅ Prisma/ORM parametrizado + `$queryRaw` con binds; React escapa XSS; NextAuth CSRF |
| 5 | Desactivar un usuario tiene efecto inmediato (JWT 8h) | ✅ `obtenerSesion()` revalida `estado` en BD en cada request |
| 6 | Rate limiting de login (5 intentos/email en 15 min) | ✅ `auth.ts` (`excesoDeIntentos`) + auditoría `login_bloqueado` |
| 7 | Defensa en profundidad en layouts | ✅ `/admin` y `/caja` redirigen si el rol no corresponde |
| 8 | Headers de seguridad | ✅ CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy |
| 9 | Sanitización de errores | ✅ `manejarError()` no filtra detalles internos de Prisma/BD |
| 10 | Política de contraseña fuerte | ✅ mín. 8, mayúscula, minúscula y número; validada con Zod compartido |
| 11 | Cambio forzado de contraseñas temporales | ✅ campo `debe_cambiar_password` + página `/cambiar-contrasena` |
| 12 | Protección CSV-injection | ✅ celdas que empiezan con `= + - @` se neutralizan al exportar |
| 13 | Último admin no puede ser degradado/desactivado | ✅ guardas en `usuarios.ts` |
| 14 | `.env` fuera de Git, `.env.example` documentado | ✅ `.gitignore` + `!.env.example` |

## 2. Pruebas de estrés operativo (ejecutadas ✅)

Script: `prisma/test-estres.ts` (`npm run test:estres`).

- Caja abierta con monto inicial.
- **25 ventas concurrentes** replicando la transacción real del correlativo (`SELECT ... FOR UPDATE`).
- **5 gastos concurrentes**, flujo de anulación (cajero solicita → admin autoriza → `anulado`).
- Cierre de caja con arqueo: monto sistema = apertura + efectivo − gastos = **diferencia 0** ✅
- Venta posterior al cierre **rechazada** ✅ (re-chequeo de estado bajo lock).
- Correlativos: **1..25 únicos, sin duplicados ni saltos** ✅

Sugerencia operativa: en Neon, limitar la concurrencia del pool (usar `--lotes=5`) para no agotar el pooler.

## 3. Paso a producción

- Migraciones aplicadas: `20260809153515_agregar_debe_cambiar_password` (4 totales, BD en sync).
- Seed idempotente (`npx prisma db seed`) => roles, categorías, servicios y cuentas iniciales con **cambio de contraseña forzado**.
- `.env.example` documentado (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL).
- Backup: Neon mantiene backups automáticos del proyecto; se recomienda `pg_dump` periódico (ver sección 4).
- Accesible desde Vercel (proyecto conectado a GitHub, rama `main`).

## 4. Mantenimiento

```bash
# Prueba de estrés
npm run test:estres -- --ventas=25 --gastos=5 --lotes=5
```

Backup manual (bajo demanda):
```bash
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql
```

## 5. Documentación de usuario

- Ver `docs/manual-administrador.md` (panel admin).
- Ver `docs/manual-caja.md` (operación de caja).

## 6. Criterios de aceptación de Fase 5

- [x] Checklist de seguridad 100 % verificado y documentado (tabla superior).
- [x] Ambiente de producción desplegado y accesible (Vercel + Neon).
- [x] Manual de usuario entregado (manual-administrador.md y manual-caja.md).
- [x] Pruebas de estrés con correlativo auditado sin duplicados.
- [x] Credenciales temporales con cambio forzado.
- [x] Headers de seguridad y sanitización de errores activos.

---
*Fecha de cierre: 09/08/2026.*