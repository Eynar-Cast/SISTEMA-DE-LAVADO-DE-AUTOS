-- DropIndex
DROP INDEX "cajas_usuario_id_idx";

-- CreateIndex
CREATE INDEX "cajas_usuario_id_estado_idx" ON "cajas"("usuario_id", "estado");

-- CreateIndex
CREATE INDEX "gastos_estado_fecha_idx" ON "gastos"("estado", "fecha");

-- CreateIndex
CREATE INDEX "ventas_caja_id_numero_correlativo_idx" ON "ventas"("caja_id", "numero_correlativo");
