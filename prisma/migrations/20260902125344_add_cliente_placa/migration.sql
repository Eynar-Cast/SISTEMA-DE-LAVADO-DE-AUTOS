-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "cliente" TEXT,
ADD COLUMN     "placa" TEXT;

-- CreateIndex
CREATE INDEX "ventas_cliente_idx" ON "ventas"("cliente");

-- CreateIndex
CREATE INDEX "ventas_placa_idx" ON "ventas"("placa");

-- RenameIndex
ALTER INDEX "Servicio_nombre_key" RENAME TO "servicios_nombre_key";
