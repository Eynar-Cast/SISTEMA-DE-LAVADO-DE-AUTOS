-- Limpieza de servicios duplicados: el nuevo índice único exige un solo registro por nombre.

-- 1) Apunta todas las referencias de detalle_ventas hacia el servicio de menor id por nombre.
UPDATE detalle_ventas d
SET servicio_id = k.keep_id
FROM (SELECT MIN(id) AS keep_id, nombre FROM servicios GROUP BY nombre) k
WHERE d.servicio_id <> k.keep_id
  AND EXISTS (SELECT 1 FROM servicios s WHERE s.id = d.servicio_id AND s.nombre = k.nombre);

-- 2) Fusiona las filas repetidas que pudieran haber quedado (venta, servicio):
--    conserva la de menor id sumando cantidades y elimina el resto.
UPDATE detalle_ventas d
SET cantidad = s.total
FROM (
  SELECT venta_id, servicio_id, SUM(cantidad) AS total
  FROM detalle_ventas
  GROUP BY venta_id, servicio_id
  HAVING COUNT(*) > 1
) s
WHERE d.venta_id = s.venta_id
  AND d.servicio_id = s.servicio_id
  AND d.id = (SELECT MIN(id) FROM detalle_ventas x WHERE x.venta_id = s.venta_id AND x.servicio_id = s.servicio_id);

DELETE FROM detalle_ventas d
USING (
  SELECT venta_id, servicio_id
  FROM detalle_ventas
  GROUP BY venta_id, servicio_id
  HAVING COUNT(*) > 1
) s
WHERE d.venta_id = s.venta_id
  AND d.servicio_id = s.servicio_id
  AND d.id <> (SELECT MIN(id) FROM detalle_ventas x WHERE x.venta_id = s.venta_id AND x.servicio_id = s.servicio_id);

-- 3) Elimina los servicios duplicados.
DELETE FROM servicios s
USING (SELECT MIN(id) AS keep_id, nombre FROM servicios GROUP BY nombre) k
WHERE s.nombre = k.nombre AND s.id <> k.keep_id;

-- Índice único sobre el nombre.
CREATE UNIQUE INDEX "Servicio_nombre_key" ON "servicios"("nombre");