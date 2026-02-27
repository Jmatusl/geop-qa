# Implementación por Fases - Módulo de Solicitud de Insumos

> **Fecha de inicio:** 25 de febrero de 2026  
> **Metodología:** Iterativa incremental con entregables comprobables por fase  
> **Referencias visuales:** `/docs/*.png`

---

## 🎯 Estrategia de Implementación

### Principios Rectores

1. **Resultado Comprobable**: Cada fase debe ser demostrable y funcional
2. **Infraestructura Primero**: Base de datos, seeds y servicios antes de UI
3. **Mejoras Progresivas**: Partir de diseños funcionales e iterar con mejoras UX
4. **Testing Continuo**: Validar cada fase antes de avanzar

---

## 📊 Fase 0: Infraestructura Base (2-3 días)

### Objetivo
Establecer la base de datos, seeds y configuración inicial del módulo.

### Entregables Comprobables

#### ✅ Checkpoint 0.1: Migración de Base de Datos
```bash
# Comando de validación
npx prisma migrate dev --name modulo_solicitud_insumos
npx prisma generate
```

**Archivos a crear:**
- `prisma/migrations/XXXX_modulo_solicitud_insumos/migration.sql`

**Comprobación:**
```sql
-- Verificar tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'supply_%' OR table_name LIKE 'unit_master';
```

**Resultado esperado:** 8 tablas nuevas creadas

---

#### ✅ Checkpoint 0.2: Seeds de Datos Maestros
```bash
# Comando de validación
npx tsx prisma/seed-insumos.ts
```

**Archivos a crear:**
1. `prisma/seeds/unit-master-seed.ts` (26 unidades de medida)
2. `prisma/seeds/supply-request-statuses-seed.ts` (6 estados)
3. `prisma/seeds/supply-item-statuses-seed.ts` (7 estados)
4. `prisma/seeds/quotation-statuses-seed.ts` (6 estados)
5. `prisma/seed-insumos.ts` (orquestador principal)

**Comprobación:**
```sql
-- Verificar datos insertados
SELECT code, name FROM supply_request_status_master ORDER BY display_order;
SELECT code, name FROM supply_item_status_master ORDER BY display_order;
SELECT code, name FROM quotation_status_master ORDER BY display_order;
SELECT COUNT(*) as total_unidades FROM unit_master;
```

**Resultado esperado:**
- 6 estados de solicitud
- 7 estados de items
- 6 estados de cotización
- 26 unidades de medida
- 1 registro en `app_setting` con key `insumos_config`

---

#### ✅ Checkpoint 0.3: Configuración del Módulo
**Archivos a crear:**
1. `lib/config/insumos-config-fallback.json`
2. `lib/config/insumos-config.ts`

**Comprobación:**
```typescript
// Ejecutar en Node REPL o test
import { getInsumosConfig } from '@/lib/config/insumos-config';
const config = await getInsumosConfig();
console.log(config.folio.prefix); // Debe retornar "SI"
```

**Resultado esperado:** Configuración cargada correctamente con fallback funcional

---

#### ✅ Checkpoint 0.4: Permisos y Notificaciones
**Archivo a modificar:**
- `prisma/seed.ts` (agregar módulo de insumos)

**Comprobación:**
```sql
-- Verificar módulo creado
SELECT code, name, icon FROM modules WHERE code = 'insumos';

-- Verificar permisos
SELECT code, name, category FROM module_permissions 
WHERE module_id = (SELECT id FROM modules WHERE code = 'insumos');

-- Verificar notificaciones
SELECT event_key, event_name, is_enabled FROM module_notification_settings
WHERE module_id = (SELECT id FROM modules WHERE code = 'insumos');
```

**Resultado esperado:**
- 1 módulo `insumos`
- 3 permisos operativos
- 4 eventos de notificación

---

## 📦 Fase 1: Mantenedor de Unidades (2 días)

### Objetivo
CRUD funcional de Unidades de Medida accesible desde `/mantenedores/unidades`.

### Entregables Comprobables

#### ✅ Checkpoint 1.1: Service Layer
**Archivo a crear:**
- `lib/services/insumos/unit-service.ts`

**Funciones mínimas:**
- `list(filters)` → Listar unidades con paginación
- `getById(id)` → Obtener una unidad
- `create(data)` → Crear unidad
- `update(id, data)` → Actualizar unidad
- `delete(id)` → Eliminar unidad (soft delete)

**Comprobación:**
```typescript
// Test manual o unitario
const units = await unitService.list({ category: 'weight' });
console.log(units); // Debe retornar kg, g, ton, lb
```

---

#### ✅ Checkpoint 1.2: API Routes
**Archivos a crear:**
1. `app/api/v1/insumos/units/route.ts` (GET, POST)
2. `app/api/v1/insumos/units/[id]/route.ts` (GET, PATCH, DELETE)

**Comprobación:**
```bash
# Listar unidades
curl http://localhost:3000/api/v1/insumos/units

# Crear unidad
curl -X POST http://localhost:3000/api/v1/insumos/units \
  -H "Content-Type: application/json" \
  -d '{"code":"test","name":"Test Unit","abbreviation":"tu","category":"unit"}'

# Actualizar
curl -X PATCH http://localhost:3000/api/v1/insumos/units/[ID] \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'
```

**Resultado esperado:** Responses 200 con datos válidos

---

#### ✅ Checkpoint 1.3: Custom Hook
**Archivo a crear:**
- `lib/hooks/insumos/use-units.ts`

**Funciones:**
- `useUnits(filters)` → Query para listar
- `useUnit(id)` → Query para detalle
- `useCreateUnit()` → Mutation para crear
- `useUpdateUnit()` → Mutation para actualizar
- `useDeleteUnit()` → Mutation para eliminar

**Comprobación:**
```typescript
// En componente de prueba
const { data: units, isLoading } = useUnits();
console.log(units); // Debe retornar array de unidades
```

---

#### ✅ Checkpoint 1.4: UI del Mantenedor (BaseMaintainer Pattern)
**Archivos a crear:**
1. `app/(dashboard)/mantenedores/unidades/page.tsx`
2. `app/(dashboard)/mantenedores/unidades/components/columns.tsx`
3. `app/(dashboard)/mantenedores/unidades/components/unit-form.tsx`

**Comprobación Visual:**
1. Navegar a `http://localhost:3000/mantenedores/unidades`
2. Verificar tabla con columnas: Código, Nombre, Abreviación, Categoría
3. Botón "Crear Unidad" abre formulario
4. Editar una unidad (click en nombre)
5. Eliminar una unidad (menú de acciones)
6. Buscar por texto funciona
7. Ordenamiento por columnas funciona

**Resultado esperado:** CRUD completo funcional con patrón `BaseMaintainer`

---

## 🎨 Fase 2: Dashboard y KPIs (1 día)

### Objetivo
Página principal del módulo con KPIs en tiempo real y atajos rápidos.

### Referencia Visual
- `docs/2.- Resumen.png`

### Entregables Comprobables

#### ✅ Checkpoint 2.1: Service Layer para KPIs
**Archivo a crear:**
- `lib/services/insumos/dashboard-service.ts`

**Funciones:**
```typescript
async getKPIs(): Promise<{
  totalSolicitudes: number;
  solicitudesPendientes: number;
  cotizacionesEnProceso: number;
  solicitudesFinalizadas: number;
  presupuestoMensual: number;
  presupuestoUtilizado: number;
}>
```

**Comprobación:**
```typescript
const kpis = await dashboardService.getKPIs();
console.log(kpis);
```

---

#### ✅ Checkpoint 2.2: Componentes de Dashboard
**Archivos a crear:**
1. `app/(dashboard)/insumos/page.tsx` (página principal)
2. `app/(dashboard)/insumos/components/InsumosKPIs.tsx`
3. `app/(dashboard)/insumos/components/InsumosShortcuts.tsx`
4. `app/(dashboard)/insumos/layout.tsx` (layout con prefetch)

**Mejoras UX sobre diseño original:**
- Usar `shadcn/ui Card` con glassmorphism sutil
- Iconos animados en hover (Lucide con `motion.div`)
- Skeleton loaders mientras cargan KPIs
- Números con animación de conteo (countup)

**Comprobación Visual:**
1. Navegar a `http://localhost:3000/insumos`
2. Verificar 6 KPI cards con números actualizados
3. Verificar shortcuts:
   - "Crear Solicitud" → `/insumos/crear`
   - "Ver Solicitudes" → `/insumos/solicitudes`
   - "Mantenedor de Unidades" → `/mantenedores/unidades`
4. Verificar modo oscuro funcional

---

## 📝 Fase 3: Crear Solicitud (Desktop) (3 días)

### Objetivo
Implementar formulario de creación de solicitud (solo versión desktop primero).

### Referencia Visual
- `docs/1.- Crear-solictud.png`

### Entregables Comprobables

#### ✅ Checkpoint 3.1: Service Layer de Solicitudes
**Archivo a crear:**
- `lib/services/insumos/supply-request-service.ts`

**Funciones principales:**
- `create(data, userId)` → Crear solicitud con items
- `getById(id)` → Obtener solicitud completa
- `list(filters)` → Listar solicitudes
- `updateStatus(id, statusCode)` → Cambiar estado

**Comprobación:**
```typescript
const request = await supplyRequestService.create({
  installationId: "...",
  requesterId: "...",
  requesterDescription: "Solicitud de prueba",
  items: [
    { itemName: "Item 1", categoryId: "...", quantity: 10, unitId: "..." }
  ]
}, userId);
console.log(request.folio); // Debe retornar SI-0001
```

---

#### ✅ Checkpoint 3.2: Catalog Service (Datos para Formulario)
**Archivo a crear:**
- `lib/services/insumos/catalog-service.ts`

**Funciones:**
```typescript
async getCatalogDataForRequest(): Promise<{
  installations: MntInstallation[];
  users: User[];
  categories: MntSupplyCategory[];
  units: UnitMaster[];
}>
```

**Comprobación:**
```typescript
const catalogs = await catalogService.getCatalogDataForRequest();
console.log(catalogs.installations.length); // Debe retornar instalaciones existentes
```

---

#### ✅ Checkpoint 3.3: Custom Hook del Formulario
**Archivo a crear:**
- `lib/hooks/insumos/use-request-form.ts`

**Funcionalidades:**
- Gestión de estado del formulario (React Hook Form + Zod)
- CRUD de items (agregar, editar, eliminar)
- Validaciones en tiempo real
- Cálculo de totales

**Comprobación:**
```typescript
const { methods, handlers } = useRequestForm({ catalogs });
console.log(methods.formState.isValid);
```

---

#### ✅ Checkpoint 3.4: Componente de Grilla de Items
**Archivo a crear:**
- `app/(dashboard)/insumos/crear/components/ItemsGrid.tsx`

**Funcionalidades:**
- Tabla con columnas: N°, Nombre Item, Categoría, Cantidad, Unidad, Descripción, Acciones
- Agregar fila (botón + al final)
- Editar inline (doble click)
- Eliminar fila (icono trash)
- Drag & drop para reordenar
- Validación visual de campos requeridos

**Mejoras UX:**
- Usar `react-table` con sorting y inline editing
- Autocompletado de items frecuentes
- Sugerencias de cantidades típicas
- Indicador visual de items duplicados

---

#### ✅ Checkpoint 3.5: Vista Desktop del Formulario
**Archivos a crear:**
1. `app/(dashboard)/insumos/crear/page.tsx` (orquestador)
2. `app/(dashboard)/insumos/crear/actions.ts` (Server Actions)
3. `app/(dashboard)/insumos/crear/components/CreateRequestDesktop.tsx`

**Layout según referencia visual:**
```
┌─────────────────────────────────────────────────┐
│ [Título: CREAR SOLICITUD DE INSUMOS]           │
├─────────────────────────────────────────────────┤
│ Header Blanco con Borde:                        │
│ [Select Instalación] [Select Solicitante] [?]  │
├─────────────────────────────────────────────────┤
│ Card Grande (rounded-xl, border, shadow-sm):    │
│                                                  │
│ ┌─ Sección Descripción ────────────────────┐   │
│ │ Descripción Solicitante: [Textarea]      │   │
│ │ Observaciones Internas:  [Textarea]      │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ ┌─ Grilla de Items ────────────────────────┐   │
│ │ [ItemsGrid Component]                    │   │
│ └──────────────────────────────────────────┘   │
│                                                  │
│ [Botones: Cancelar | Guardar Borrador |       │
│           Crear Solicitud (azul corporativo)] │
└─────────────────────────────────────────────────┘
```

**Comprobación Visual:**
1. Navegar a `http://localhost:3000/insumos/crear`
2. Seleccionar instalación y solicitante
3. Agregar 3 items diferentes
4. Rellenar descripciones
5. Guardar como borrador (estado PENDIENTE)
6. Verificar en BD:
```sql
SELECT folio, status.code, items.count 
FROM supply_request 
ORDER BY created_at DESC LIMIT 1;
```
7. Verificar auditoría:
```sql
SELECT action, entity, entity_id 
FROM audit_logs 
WHERE entity = 'SupplyRequest' 
ORDER BY created_at DESC LIMIT 1;
```

**Resultado esperado:** Solicitud creada con folio SI-XXXX, items asociados, auditoría registrada

---

## 📋 Fase 4: Bandeja de Solicitudes (2 días)

### Objetivo
Listado de solicitudes con filtros, tooltips y navegación a detalle.

### Referencia Visual
- `docs/2.- Resumen.png`
- `docs/2.1.- Resumen Folio Tooltip.png`
- `docs/2.2.- Resumen Items Tooltip.png`

### Entregables Comprobables

#### ✅ Checkpoint 4.1: Componente de Tabla con TanStack Table
**Archivos a crear:**
1. `app/(dashboard)/insumos/solicitudes/page.tsx`
2. `app/(dashboard)/insumos/solicitudes/components/RequestsTable.tsx`
3. `app/(dashboard)/insumos/solicitudes/components/columns.tsx`

**Columnas de la tabla:**
| Columna | Ancho | Sortable | Tooltip |
|---------|-------|----------|---------|
| Folio | 120px | ✅ | Datos de solicitud |
| Instalación | flex | ✅ | - |
| Solicitante | flex | ✅ | - |
| Items | 100px | ❌ | Lista de items |
| Estado | 130px | ✅ | Badge coloreado |
| Fecha | 110px | ✅ | - |
| Acciones | 80px | ❌ | Ver, Editar, Eliminar |

**Mejoras UX:**
- Sticky header al hacer scroll
- Hover row highlight
- Click en folio → navega a detalle
- Tooltips con `Popover` de shadcn (no HTML nativo)
- Paginación en footer (estilo consistente con otros mantenedores)

---

#### ✅ Checkpoint 4.2: Filtros Avanzados
**Archivo a crear:**
- `app/(dashboard)/insumos/solicitudes/components/RequestFilters.tsx`

**Filtros:**
- Estado (multiselect)
- Instalación (select)
- Rango de fechas (date range picker)
- Búsqueda por folio (debounced input)

**Comprobación:**
1. Aplicar filtro de estado "PENDIENTE"
2. Verificar URL: `?statusId=...`
3. Recargar página → filtros se mantienen (deep linking)

---

#### ✅ Checkpoint 4.3: Tooltips Personalizados
**Archivos a crear:**
1. `app/(dashboard)/insumos/solicitudes/components/FolioTooltip.tsx`
2. `app/(dashboard)/insumos/solicitudes/components/ItemsTooltip.tsx`

**FolioTooltip (según imagen 2.1):**
```
┌──────────────────────────┐
│ SI-0001                  │
│ ──────────────────────   │
│ Instalación: [Nombre]    │
│ Solicitante: [Nombre]    │
│ Fecha: DD/MM/YYYY        │
│ Items: 5 artículos       │
└──────────────────────────┘
```

**ItemsTooltip (según imagen 2.2):**
```
┌────────────────────────────────┐
│ Items de la Solicitud (5)      │
│ ────────────────────────────   │
│ • Item 1      10 unidades      │
│ • Item 2       5 kg            │
│ • Item 3      20 litros        │
│ • Item 4       2 cajas         │
│ • Item 5       1 kit           │
└────────────────────────────────┘
```

**Comprobación Visual:**
1. Hover sobre folio → tooltip aparece
2. Hover sobre badge de items → tooltip aparece
3. Verificar modo oscuro funciona

---

## 🔍 Fase 5: Detalle de Solicitud (3 días)

### Objetivo
Vista completa de solicitud con tabs: Items, Cotizaciones, Historial.

### Referencia Visual
- `docs/3.- detalle-solictud.png`
- `docs/3.- detalle-solictud tab cotizaciones.png`

### Entregables Comprobables

#### ✅ Checkpoint 5.1: Layout con Tabs
**Archivos a crear:**
1. `app/(dashboard)/insumos/[id]/page.tsx` (orquestador)
2. `app/(dashboard)/insumos/[id]/components/RequestDetailDesktop.tsx`

**Estructura (según imagen):**
```
┌───────────────────────────────────────────────────┐
│ Header: SI-0001 | Estado | Fecha | [Acciones]    │
├───────────────────────────────────────────────────┤
│ Card Información General:                         │
│ Instalación | Solicitante | Observaciones         │
├───────────────────────────────────────────────────┤
│ Tabs (ancho completo):                            │
│ [ Items ] [ Cotizaciones ] [ Historial ]         │
├───────────────────────────────────────────────────┤
│ Contenido del Tab Activo                         │
└───────────────────────────────────────────────────┘
```

---

#### ✅ Checkpoint 5.2: Tab de Items
**Archivo a crear:**
- `app/(dashboard)/insumos/[id]/components/ItemsTab.tsx`

**Funcionalidades:**
- Tabla de items con estado individual
- Badge de estado por item (color según `supply_item_status_master`)
- Botón "Enviar a Cotización" (solo items PENDIENTE)
- Editar item (icono lápiz)
- Historial de cambios por item

**Comprobación Visual:**
1. Crear solicitud con 5 items
2. Navegar a `/insumos/[id]`
3. Verificar tabla con 5 items
4. Estados iniciales: PENDIENTE

---

#### ✅ Checkpoint 5.3: Tab de Cotizaciones
**Archivo a crear:**
- `app/(dashboard)/insumos/[id]/components/QuotationsTab.tsx`

**Funcionalidades:**
- Cards de cotizaciones (una por proveedor)
- Información: Folio COT, Proveedor, Estado, Fecha límite
- Botones: Ver Detalle, Aprobar, Rechazar, Enviar Email
- Filtro por estado de cotización

**Layout (según imagen):**
```
┌─ COT-0001 ─────────────────────────────┐
│ Proveedor: ABC Ltda.                   │
│ Estado: [Badge RECIBIDA]               │
│ Monto Total: $1.500.000               │
│ Fecha Límite: 01/03/2026              │
│ ─────────────────────────────────────  │
│ Items: 3/5                            │
│ [Ver Detalle] [Aprobar] [Rechazar]   │
└────────────────────────────────────────┘
```

---

#### ✅ Checkpoint 5.4: Tab de Historial
**Archivo a crear:**
- `app/(dashboard)/insumos/[id]/components/HistoryTab.tsx`

**Funcionalidades:**
- Timeline vertical con eventos
- Tipos: Creación, Cambio de estado, Cotización enviada, Cotización recibida, Aprobación
- Cada evento: Fecha, Usuario, Descripción, Metadata

---

## 💼 Fase 6: Gestión de Cotizaciones (4 días)

### Objetivo
Flujo completo de cotizaciones: enviar, ingresar manual, aprobar/rechazar.

### Referencias Visuales
- `docs/Enviar Ítems a Cotización.png`
- `docs/3.1 -Detalle de Cotización - COT-0010.png`
- `docs/3.5 Ingresar Cotización Manual - COT-0010.png`

### Entregables Comprobables

#### ✅ Checkpoint 6.1: Service Layer de Cotizaciones
**Archivo a crear:**
- `lib/services/insumos/supply-quotation-service.ts`

**Funciones críticas:**
- `checkItemsAvailability(itemIds)` → Verifica si items están cotizados
- `createQuotation(data)` → Crea cotización con validación
- `approveQuotation(id)` → Aprueba y rechaza conflictivas
- `rejectQuotation(id, reason)` → Rechaza y libera items
- `markAsNotQuoted(id)` → Marca como no cotizado

**Comprobación:**
```typescript
// Crear cotización con item ya cotizado (debe fallar)
await supplyQuotationService.createQuotation({
  requestId: "...",
  supplierId: "...",
  itemIds: ["item-ya-cotizado"],
  forceUnavailable: false
}); // BusinessRuleError

// Forzar item cotizado (debe pasar)
await supplyQuotationService.createQuotation({
  requestId: "...",
  supplierId: "...",
  itemIds: ["item-ya-cotizado"],
  forceUnavailable: true // ✅
});
```

---

#### ✅ Checkpoint 6.2: Dialog "Enviar a Cotización"
**Archivo a crear:**
- `app/(dashboard)/insumos/[id]/components/SendToQuotationDialog.tsx`

**Layout (según imagen):**
```
┌─ Enviar Items a Cotización ────────────────┐
│                                             │
│ Proveedor: [Select Proveedor]             │
│ Fecha Límite: [Date Picker] (7 días)      │
│                                             │
│ ┌─ Items Disponibles ─────────────────┐   │
│ │ ☑ Item 1 (PENDIENTE) ✓             │   │
│ │ ☑ Item 2 (PENDIENTE) ✓             │   │
│ │ ☐ Item 3 (COTIZADO) ⚠ Ya cotizado │   │
│ │ ☑ Item 4 (PENDIENTE) ✓             │   │
│ └─────────────────────────────────────┘   │
│                                             │
│ ☐ Mostrar items ya cotizados              │
│                                             │
│ [Cancelar] [Crear y Enviar Email]         │
└─────────────────────────────────────────────┘
```

**Funcionalidades:**
- Filtrado visual de items por disponibilidad
- Toggle "Mostrar items ya cotizados"
- Warning badge en items forzados
- Checkbox "Enviar email inmediatamente"

**Comprobación:**
1. Abrir solicitud con 5 items PENDIENTES
2. Click "Enviar a Cotización"
3. Seleccionar proveedor
4. Seleccionar 3 items
5. Crear cotización
6. Verificar:
```sql
SELECT folio, supplier_id, status.code 
FROM supply_quotation 
ORDER BY created_at DESC LIMIT 1;
-- folio: COT-0001, status: ENVIADA (si se marcó enviar)

SELECT COUNT(*) FROM supply_quotation_item 
WHERE quotation_id = '...';
-- Debe retornar 3
```

---

#### ✅ Checkpoint 6.3: Dialog "Ingresar Cotización Manual"
**Archivo a crear:**
- `app/(dashboard)/insumos/[id]/components/ManualQuotationDialog.tsx`

**Layout (según imagen 3.5):**
```
┌─ Ingresar Cotización Recibida ─────────────┐
│                                             │
│ Cotización: COT-0010                       │
│ Proveedor: [Readonly: Nombre Proveedor]   │
│                                             │
│ ┌─ Items de la Cotización ──────────────┐ │
│ │ N° │ Item    │ Cant │ P.Unit │ Total │ │
│ │ 1  │ Item A  │ 10   │ $100   │ $1000 │ │
│ │ 2  │ Item B  │  5   │ $200   │ $1000 │ │
│ └────────────────────────────────────────┘ │
│                                             │
│ Observaciones Proveedor: [Textarea]        │
│ Observaciones Internas:  [Textarea]        │
│                                             │
│ Monto Neto:   [Input] CLP                  │
│ IVA:          [Readonly calculado]         │
│ Monto Total:  [Readonly calculado]         │
│                                             │
│ Tiempo Entrega: [Input] días              │
│ Condición Pago: [Input]                    │
│ Validez:        [Date Picker]              │
│                                             │
│ Adjuntar PDF/Imagen: [Upload Zone]        │
│                                             │
│ [Cancelar] [Guardar Cotización]           │
└─────────────────────────────────────────────┘
```

**Funcionalidades:**
- Carga de precios por item (inline editing)
- Cálculo automático de totales
- Upload de adjunto (PDF/Imagen)
- Validación de todos los items tengan precio
- Al guardar → estado pasa a RECIBIDA

**Comprobación:**
1. Crear cotización con 3 items
2. Estado inicial: ENVIADA
3. Click "Ingresar Cotización Manual"
4. Rellenar precios por item
5. Subir PDF de cotización
6. Guardar
7. Verificar:
```sql
SELECT status.code FROM supply_quotation WHERE folio = 'COT-0001';
-- Debe retornar: RECIBIDA

SELECT COUNT(*) FROM supply_quotation_attachment WHERE quotation_id = '...';
-- Debe retornar: 1 (archivo adjunto)
```

---

#### ✅ Checkpoint 6.4: Dialog "Detalle de Cotización"
**Archivo a crear:**
- `app/(dashboard)/insumos/[id]/components/QuotationDetailDialog.tsx`

**Layout (según imagen 3.1 y 3.2):**
Tabs internos:
1. **Tab Información**: Datos generales, proveedor, montos
2. **Tab Items**: Lista de items con precios
3. **Tab Adjuntos**: Visualizador de PDF/Imágenes

**Funcionalidades:**
- Vista solo lectura (no editable)
- Botones de acción: Aprobar, Rechazar, Marcar como No Cotizado
- Descargar adjuntos
- Copiar folio al portapapeles
- Imprimir vista

---

## 📧 Fase 7: Email y PDF de Cotizaciones (2 días)

### Objetivo
Generación de PDF y envío de emails a proveedores.

### Referencias Visuales
- `docs/3.3 - Preview del Email y PDF.png`
- `docs/3.4 Enviar Cotización por Email.png`

### Entregables Comprobables

#### ✅ Checkpoint 7.1: Generador de PDF
**Archivo a crear:**
- `lib/reports/modules/insumos/quotation-pdf.ts`

**Funcionalidades:**
- Logo corporativo en header
- Datos de la empresa emisora
- Datos del proveedor destinatario
- Tabla de items con descuentos
- Total con IVA
- Condiciones de pago
- Fecha límite de respuesta

**Comprobación:**
```typescript
const pdf = await generateQuotationPDF(quotationId);
// Debe retornar buffer de PDF válido
```

---

#### ✅ Checkpoint 7.2: Template de Email
**Archivo a crear:**
- `components/email-templates/quotation-request-template.tsx`

**Contenido del email:**
```
Estimado [Nombre Proveedor],

Solicitamos cotización de los siguientes artículos para el proyecto [Nombre Instalación]:

[Tabla de items]

Adjuntamos el detalle completo en PDF.

Fecha límite de respuesta: [Fecha]

Saludos,
[Nombre Usuario]
GEOP Río Dulce
```

---

#### ✅ Checkpoint 7.3: Dialog "Enviar Email"
**Archivo a crear:**
- `app/(dashboard)/insumos/[id]/components/SendEmailDialog.tsx`

**Layout (según imagen 3.4):**
```
┌─ Enviar Cotización por Email ──────────────┐
│                                             │
│ Para:     [Input] (pre-llenado proveedor) │
│ CC:       [Input]                          │
│ Asunto:   [Input] (pre-llenado)           │
│                                             │
│ ┌─ Vista Previa ───────────────────────┐  │
│ │ [Iframe con preview del email]       │  │
│ └──────────────────────────────────────┘  │
│                                             │
│ Adjunto: ☑ Cotización COT-0001.pdf        │
│                                             │
│ [Cancelar] [Enviar]                       │
└─────────────────────────────────────────────┘
```

**Comprobación:**
1. Crear cotización
2. Click "Enviar Email"
3. Verificar preview del email
4. Enviar
5. Verificar en logs:
```typescript
// Email enviado exitosamente
// PDF adjunto generado
// Estado de cotización → ENVIADA
```

---

## 📱 Fase 8: Adaptación Móvil (2 días)

### Objetivo
Implementar versiones móviles de las vistas principales usando el patrón adaptativo.

### Entregables Comprobables

#### ✅ Checkpoint 8.1: Crear Solicitud Móvil
**Archivo a crear:**
- `app/(dashboard)/insumos/crear/components/CreateRequestClient.tsx`

**Mejoras UX móvil:**
- Header fijo con botón volver
- Formulario de una columna
- Items como lista (no tabla)
- Botón flotante para agregar item
- Barra de acción fija inferior

---

#### ✅ Checkpoint 8.2: Detalle Solicitud Móvil
**Archivo a crear:**
- `app/(dashboard)/insumos/[id]/components/RequestDetailClient.tsx`

**Mejoras UX móvil:**
- Tabs como botones pill horizontales
- Cards colapsables para items
- Swipe para eliminar item
- Bottom sheet para dialogs

---

## 📊 Fase 9: Reportes Excel (1 día)

### Objetivo
Exportación de listados y cotizaciones a Excel.

### Entregables Comprobables

#### ✅ Checkpoint 9.1: Reporte de Solicitudes
**Archivo a crear:**
- `lib/reports/modules/insumos/solicitudes-excel.ts`

**Columnas del reporte:**
- Folio, Instalación, Solicitante, Fecha, Estado, Total Items, Cotizaciones, Monto Total

**Comprobación:**
1. Ir a `/insumos/solicitudes`
2. Click "Exportar Excel"
3. Descargar archivo
4. Verificar datos correctos

---

#### ✅ Checkpoint 9.2: Reporte Comparativo de Cotizaciones
**Archivo a crear:**
- `lib/reports/modules/insumos/comparativo-cotizaciones-excel.ts`

**Formato:**
```
┌─────────────────────────────────────────────────────┐
│ Solicitud: SI-0001                                  │
│ ───────────────────────────────────────────────────│
│ Item       │ Prov. A  │ Prov. B  │ Prov. C │ Mejor │
│ Item 1     │ $100     │ $95      │ $105    │ B     │
│ Item 2     │ $200     │ $210     │ $195    │ C     │
│ Total      │ $300     │ $305     │ $300    │ A/C   │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Fase 10: Testing y Optimización (2 días)

### Objetivo
Validar funcionamiento completo y optimizar performance.

### Checklist de Validación Final

#### ✅ Test de Flujo Completo
1. Crear solicitud con 10 items
2. Enviar 5 items a cotización A
3. Enviar 5 items a cotización B
4. Ingresar precios en ambas cotizaciones
5. Aprobar cotización A (items 1-5)
6. Verificar que cotización B se rechaza automáticamente para items 1-5
7. Verificar que items 6-10 siguen disponibles en cotización B
8. Aprobar cotización B (items 6-10)
9. Verificar solicitud en estado FINALIZADA
10. Generar reporte Excel

#### ✅ Test de Performance
- Solicitud con 100 items → crear en < 2 segundos
- Listado de 1000 solicitudes → cargar en < 1 segundo (con paginación)
- Generación de PDF → < 3 segundos
- Comparativo de cotizaciones → < 5 segundos

#### ✅ Test de Auditoría
```sql
-- Verificar todos los eventos se registraron
SELECT action, entity, COUNT(*) 
FROM audit_logs 
WHERE entity IN ('SupplyRequest', 'SupplyQuotation') 
GROUP BY action, entity;
```

#### ✅ Test de Permisos
1. Usuario con permiso `gestiona_cotizaciones` → puede crear cotizaciones
2. Usuario con permiso `aprueba_cotizaciones` → puede aprobar/rechazar
3. Usuario sin permisos → no puede acceder al módulo

---

## 🚀 Estrategia de Despliegue

### Rollout Gradual

1. **Semana 1**: Fases 0-2 (Infraestructura + Dashboard + Mantenedor)
2. **Semana 2**: Fases 3-4 (Crear Solicitud + Listado)
3. **Semana 3**: Fases 5-6 (Detalle + Cotizaciones)
4. **Semana 4**: Fases 7-10 (Email + Móvil + Reportes + Testing)

### Criterios de Aceptación por Fase

Cada fase debe cumplir:
- ✅ Todos los checkpoints validados
- ✅ Sin errores de TypeScript
- ✅ Sin warnings de linting
- ✅ Auditoría completa de acciones
- ✅ Modo oscuro funcional
- ✅ Responsive (desktop y móvil)

---

## 📝 Documentación de Progreso

Al completar cada fase, actualizar:

### Dashboard de Progreso
```markdown
## Estado de Implementación

| Fase | Objetivo | Progreso | Estado |
|------|----------|----------|--------|
| 0 | Infraestructura Base | 100% | ✅ Completo |
| 1 | Mantenedor Unidades | 100% | ✅ Completo |
| 2 | Dashboard y KPIs | 75% | 🔄 En Progreso |
| 3 | Crear Solicitud | 0% | ⏳ Pendiente |
| ... | ... | ... | ... |
```

### Log de Cambios
Registrar en `CHANGELOG.md`:
```markdown
## [Fase 2] - 2026-02-26

### Añadido
- Dashboard de Insumos con 6 KPIs en tiempo real
- Componente InsumosKPIs con glassmorphism
- Shortcuts a funciones principales

### Mejorado
- Animación de números con countup
- Skeleton loaders más suaves
- Iconos con animación en hover
```

---

## 🎯 Siguiente Paso

**Comenzar con Fase 0 - Checkpoint 0.1: Migración de Base de Datos**

¿Procedo con la creación del schema de Prisma y la primera migración?
