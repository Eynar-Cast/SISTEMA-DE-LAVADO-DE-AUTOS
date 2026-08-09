-- CreateIndex
CREATE INDEX "detalle_ventas_venta_id_idx" ON "detalle_ventas"("venta_id");

-- CreateIndex
CREATE INDEX "detalle_ventas_servicio_id_idx" ON "detalle_ventas"("servicio_id");

-- CreateIndex
CREATE INDEX "gastos_fecha_idx" ON "gastos"("fecha");
