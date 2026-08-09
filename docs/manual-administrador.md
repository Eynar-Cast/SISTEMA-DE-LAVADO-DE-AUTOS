# Manual de Usuario — Administrador

Sistema de Gestión para Lavado de Autos (Car Wash). Perfil: **Administrador**.

## 1. Ingreso

1. Abre la URL del sistema (p. ej. `https://tu-app.vercel.app`).
2. En `/login` ingresa tu email y contraseña.
3. Al primer ingreso (o si el administrador reinició tu contraseña) el sistema te pedirá **cambiar la contraseña** antes de continuar. Usá una contraseña de al menos 8 caracteres, con mayúscula, minúscula y número.

## 2. Panel de administración

Sidebar izquierdo con las secciones:

| Sección | Qué hace |
|---|---|
| **Dashboard** | Vehículos hoy, ingresos, gastos, utilidad del día, cajas abiertas y top servicios. |
| **Servicios** | Crear, editar y activar/desactivar servicios (desactivar = no aparece en el POS de caja). |
| **Ventas** | Historial de ventas con detalle. |
| **Gastos** | Gastos registrados por turnos y estados (activo, pendiente, anulado). |
| **Usuarios** | Crear usuarios, asignar rol (Administrador/Caja), activar/desactivar y resetear contraseñas. |
| **Reportes** | Reportes por rango de fechas, comparativo mensual, ranking de servicios, métodos de pago y **exportación CSV**. |
| **Auditoría** | Registro de solo lectura de todas las acciones críticas del sistema. |

## 3. Gestión de usuarios (flujo recomendado)

1. **Usuarios → Crear usuario**: nombre, email, rol y contraseña temporal.
2. El usuario nuevo **debe cambiar su contraseña** en su primer ingreso (forzado por el sistema).
3. Para resetear: editar el usuario y escribir una nueva contraseña → se fuerza el cambio.

> Nota: no podés desactivarte a vos mismo ni desactivar al último administrador activo.

## 4. Anulaciones de gasto

La anulación sigue este flujo cuando la solicita un cajero:
1. Cajero solicita la anulación → queda en estado **Pendiente de autorización**.
2. Administrador revisa en **Gastos** y **Aprueba** (queda `anulado`) o **Rechaza** (vuelve a `activo`).

## 5. Reportes y CSV

1. **Reportes →** elegí fecha *desde* y *hasta* → **Consultar**.
2. **Exportar CSV**: descarga el archivo. Las celdas se sanean para evitar fórmulas maliciosas.

## 6. Buenas prácticas de seguridad

- No compartas tu contraseña; activa el cambio de contraseña de los usuarios al darlos de alta.
- Revisa **Auditoría** periódicamente para detectar accesos o acciones anómalas.
- Si un colaborador se va, desactívalo de **Usuarios** (tiene efecto inmediato aunque tenga sesión abierta).

Ante dudas técnicas sobre seguridad o despliegue, consultá `docs/fase_5_resumen.md`.