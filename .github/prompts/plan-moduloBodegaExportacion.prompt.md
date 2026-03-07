## Plan ejecutable por sprint: Migración módulo Bodega v1

### Contexto y decisiones base

- Alcance inicial: faseado por prioridad.
- Nombre oficial: módulo **bodega** con entidad principal **Artículo** (no “Repuesto”).
- UI: migración casi literal desde `docs/Bodega/exported_module`, ajustada a tokens/escala tipográfica del proyecto.
- API objetivo: `/api/v1/bodega/*`.
- Restricción arquitectónica: implementación 100% alineada a AGENTS.md (Service Layer, Zod, auditoría, permisos normalizados, dark mode, shadcn/ui, sonner, sin lógica de negocio en proxy).

---

## Sprint 1 (S1) — Fundaciones de dominio y backend seguro

### Objetivo
Levantar la base técnica del módulo bodega para operar de forma segura y consistente con la arquitectura del proyecto.

### Alcance S1
1. Relevamiento funcional fuente
	- Mapear pantallas, flujos y contratos de `docs/Bodega/modulo_bodega_exportacion.md`, `docs/Bodega/exported_module` y `docs/Bodega/exported_module_api`.
	- Definir diccionario de equivalencias legacy → destino (incluyendo renombres de tablas y campos).

2. Modelo de datos Prisma
	- Diseñar e implementar tablas del módulo bodega con nomenclatura destino (incluyendo Artículo).
	- Definir relaciones, índices, constraints e integridad referencial según patrón del proyecto (UUID, timestamps, estados).
	- Crear migración Prisma en español.

3. Permisos y notificaciones base del módulo
	- Registrar módulo `bodega` en esquema normalizado (`modules`, `module_permissions`).
	- Definir permisos iniciales por categoría operativa.
	- Configurar eventos base en `module_notification_settings` con `requiredPermissions`.

4. Service Layer inicial
	- Crear servicios en `lib/services/bodega/*-service.ts` con operaciones núcleo.
	- Incorporar errores de negocio tipados y transacciones atómicas donde aplique.

5. API v1 núcleo
	- Crear endpoints iniciales en `/api/v1/bodega/*` para catálogos y operaciones mínimas.
	- Integrar autenticación/sesión del proyecto y sanitización de errores de salida.

### Entregables S1
- Diccionario de dominio y mapa funcional documentado en `docs/Bodega`.
- Migración Prisma aplicada con tablas del módulo bodega.
- Seeds actualizados para módulo/permisos/notificaciones.
- Servicios iniciales de bodega en `lib/services/bodega/`.
- Endpoints base operativos en `app/api/v1/bodega/`.

### Criterios de aceptación S1
- `pnpm prisma validate` sin errores.
- `pnpm prisma migrate dev --name bodega_inicial` ejecuta correctamente.
- Endpoints núcleo responden autenticados y no exponen errores técnicos de BD.
- Permisos del módulo visibles y consultables en mantenedor de usuarios.
- Auditoría preparada para mutaciones críticas (estructura y contrato definidos).

---

## Sprint 2 (S2) — Reimplementación funcional + UI casi literal

### Objetivo
Replicar el flujo operativo principal del módulo con paridad funcional y visual, adaptándolo al stack/UI del proyecto.

### Alcance S2
1. Server Actions y validaciones
	- Implementar acciones del módulo como thin wrappers hacia services.
	- Incorporar validaciones Zod por caso de uso.

2. Hooks composables + React Query
	- Crear hooks de listado y formulario del módulo en `lib/hooks/bodega/`.
	- Registrar query keys y estrategias de invalidación/prefetch.

3. UI y rutas del módulo
	- Implementar rutas del módulo (`layout`, `listado`, `ingreso`, `detalle`, `configuracion`) con patrón del proyecto.
	- Migrar UI desde exportado con paridad visual casi literal.
	- Ajustar tipografías, tamaños y spacing al estándar actual.
	- Garantizar dark mode y responsividad móvil-primero.

4. Flujo operativo principal
	- Implementar operaciones núcleo (según mapa S1): ciclo completo de solicitudes/movimientos/estado de stock equivalentes al módulo fuente.
	- Sincronizar navegación, feedback de carga y notificaciones de usuario (`sonner`).

### Entregables S2
- Vistas principales del módulo bodega navegables y funcionales.
- Acciones de servidor + hooks + query keys integrados.
- Flujo núcleo ejecutable de punta a punta en entorno local.

### Criterios de aceptación S2
- Paridad funcional del flujo principal respecto al exportado (sin desviaciones de negocio).
- Paridad visual alta con ajuste a diseño/tipografía del proyecto.
- Formularios y tablas cumplen estándares AGENTS (w-full, sorting/paginación consistente, sin `window.confirm`).
- Mutaciones invalidan queries correctas y reflejan cambios sin recarga manual.

---

## Sprint 3 (S3) — Endurecimiento, auditoría total y salida a producción

### Objetivo
Cerrar brechas de seguridad, trazabilidad, permisos finos, performance percibida y checklist de release.

### Alcance S3
1. Auditoría completa
	- Registrar create/update/delete/acciones críticas del módulo con metadata útil (IP, User-Agent, recurso afectado, previo/nuevo cuando aplique).

2. Permisos finos y notificaciones
	- Aplicar verificación de permisos por operación en server actions y API.
	- Validar matriz de notificaciones basada en `requiredPermissions` + opt-out por usuario.

3. Performance y UX final
	- Prefetch de catálogos/rutas clave.
	- Ajustes de estados de carga, errores funcionales y consistencia de feedback.
	- Verificación responsive final (móvil/escritorio) y contraste en dark mode.

4. Validación y documentación de cierre
	- Ejecutar validación técnica completa (lint/tests/build según disponibilidad).
	- Documentar operación, permisos, endpoints y checklist de soporte del módulo en `docs/Bodega`.

### Entregables S3
- Módulo bodega con auditoría, permisos y notificaciones operando de extremo a extremo.
- Documentación de operación y mantenimiento actualizada.
- Checklist de release completado.

### Criterios de aceptación S3
- `pnpm lint` sin errores críticos del módulo.
- Pruebas funcionales E2E del flujo principal aprobadas.
- Auditoría verificable en acciones críticas.
- Permisos bloquean correctamente operaciones no autorizadas.
- Notificaciones respetan switch global del módulo, eventos habilitados y preferencias personales.

---

## Dependencias y riesgos controlados

- Riesgo de “copy/paste” legacy: mitigado con reimplementación técnica sobre arquitectura destino.
- Riesgo de nomenclatura histórica incorrecta: mitigado con diccionario de dominio S1 y validación temprana.
- Riesgo de drift entre UI y reglas AGENTS: mitigado con revisión por checklist en S2.
- Riesgo de seguridad/autorización: mitigado con permisos server-side obligatorios en S3.

---

## Checklist transversal (aplica a S1/S2/S3)

- Sin exposición de errores técnicos al cliente.
- Validación Zod en todas las entradas.
- Uso exclusivo de shadcn/ui + lucide-react en UI.
- Compatibilidad dark mode completa.
- Auditoría en mutaciones críticas.
- Sin lógica de negocio en `proxy.ts`.
- Sin `window.confirm`; usar `AlertDialog`.
