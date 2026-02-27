-- Script: Limpieza de migraciones del módulo de insumos
-- Elimina las 6 migraciones antiguas de insumos de la tabla _prisma_migrations

DELETE FROM "_prisma_migrations" 
WHERE "migration_name" IN (
  '20260226013318_agregar_modelos_solicitud_insumos',
  '20260226020001_agregar_estimated_value_a_supply_request',
  '20260226032319_cambiar_unidad_insumos_a_texto_libre',
  '20260226160749_agregar_numero_oc_cotizacion_insumos',
  '20260226212821_agregar_observaciones_para_proveedor',
  '20260226221325_hacer_precios_opcionales_y_agregar_numero_cotizacion'
);

-- Verificar que quedaron eliminadas
SELECT "migration_name", "finished_at", "applied_steps_count" 
FROM "_prisma_migrations" 
ORDER BY "finished_at" DESC;
