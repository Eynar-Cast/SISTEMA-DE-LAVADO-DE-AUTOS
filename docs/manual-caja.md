# Manual de Usuario — Operador de Caja

Sistema de Gestión para Lavado de Autos (Car Wash). Perfil: **Caja**.

## 1. Ingreso

1. Abre la URL del sistema e inicia sesión en `/login`.
2. En tu primer ingreso (o si el administrador reinició tu contraseña) el sistema te obliga a **cambiar la contraseña** antes de operar.

## 2. Operación diaria

### 2.1 Apertura de caja

- En **Operación** ingresá el **monto inicial en efectivo** y abrí la caja.
- **No podés vender ni registrar gastos si la caja está cerrada.**
- La caja queda asociada a tu turno. Si ya tenés una caja abierta, el sistema no te deja abrir otra.

### 2.2 Registrar ventas (POS)

1. Posicionate en **Operación** → POS.
2. Agregá los **servicios** con sus cantidades; el total se calcula automáticamente.
3. Elegí el **método de pago** (Efectivo, QR, Tarjeta, Otro).
4. Confirmá la venta. El sistema asigna el **correlativo automático** del turno (el Nº de venta no puede repetirse ni saltarse, incluso con varios cajeros).
5. Cada vehículo arranca en estado **Registrado** y avanza:

   `Registrado → Pagado → Finalizado`

   Usá el botón **Avanzar** para cambiar de estado conforme atendés el vehículo.

### 2.3 Gastos del turno

- En **Gastos** registrá los gastos del turno: categoría (obligatoria), monto y motivo (mínimo 10 caracteres).
- No borres gastos: si te equivocaste, **solicitá la anulación**; un administrador deberá aprobarla.
  - Pendiente de autorización → el admin la acepta (`anulado`) o rechaza (vuelve a `activo`).

### 2.4 Ventas del turno

- En **Ventas del turno** consultás las ventas de tu caja abierta actual (no ves turnos ajenos ni días anteriores).

## 3. Cierre de caja (arqueo)

1. Contá el **efectivo físico** que tenés.
2. En el formulario de cierre ingresá el **monto real**.
3. El sistema calcula el **monto del sistema** = monto inicial + ingresos en efectivo − gastos del turno, y registra la **diferencia** (sobrante o faltante).
4. Una vez cerrada, **no podés registrar más ventas ni gastos** en ese turno; la venta queda inmutable.

## 4. Seguridad

- Cerrá sesión al retirarte (**Salir**).
- No compartas tu usuario. Cada venta/gasto queda registrado a tu nombre en la auditoría del sistema.
- Si olvidaste cambiar la contraseña temporal o sospechás uso indebido, avisá al administrador.