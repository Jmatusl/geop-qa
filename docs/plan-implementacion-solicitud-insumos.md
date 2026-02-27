# Plan de Implementación - Módulo de Solicitud de Insumos

> **Fecha:** 25 de febrero de 2026  
> **Stack:** Next.js 15 (App Router), Prisma, PostgreSQL, TailwindCSS  
> **Patrón Arquitectónico:** Service Layer + Custom Hooks + Componentes Adaptativos

---

## 🔄 Reutilización de Mantenedores Existentes

Este módulo **REUTILIZA** los siguientes componentes ya implementados en el proyecto:

| Componente | Modelo | Ubicación CRUD | Estado |
|------------|--------|----------------|--------|
| **Proveedores** | `MntSupplier` | `/mantencion/configuracion/proveedores` | ✅ Reutilizar |
| **Categorías de Insumos** | `MntSupplyCategory` | Seed existente (ampliar) | ✅ Ampliar seed |
| **Instalaciones** | `MntInstallation` | `/mantencion/configuracion/instalaciones` | ✅ Reutilizar |

**SOLO se debe crear:**
- ✨ Modelo `UnitMaster` (Unidades de Medida) - NUEVO
- ✨ Mantenedor `/mantenedores/unidades` - NUEVO (Mantenedor Global)

**Beneficios:**
- ✅ Reducción de 2 semanas en desarrollo
- ✅ Consistencia con módulos existentes
- ✅ Datos maestros compartidos entre módulos
- ✅ Menor superficie de bugs

---

## 📋 Índice

1. [Configuraciones](#1-configuraciones)
2. [Permisos y Notificaciones](#2-permisos-y-notificaciones)
3. [Mantenedores y Seeds](#3-mantenedores-y-seeds)
4. [Rutas y Estructura de Páginas](#4-rutas-y-estructura-de-páginas)
5. [Service Layer](#5-service-layer)
6. [Custom Hooks](#6-custom-hooks)
7. [Componentes Visuales](#7-componentes-visuales)
8. [API Routes](#8-api-routes)
9. [Sistema de Reportes](#9-sistema-de-reportes)
10. [Plan de Implementación por Sprints](#10-plan-de-implementación-por-sprints)
11. [Mapeo de Modelos Existentes](#11-mapeo-de-modelos-existentes)
12. [Endpoints de Alias (API Proxies)](#12-endpoints-de-alias-api-proxies)
13. [Resumen Ejecutivo](#resumen-ejecutivo)

---

## 1. Configuraciones

### 1.1. Tabla `app_setting` (Configuraciones de Negocio)

```json
{
  "key": "insumos_config",
  "value": {
    "folio": {
      "prefix": "SI",
      "padding": 4,
      "example": "SI-0001"
    },
    "cotizacion": {
      "prefix": "COT",
      "padding": 4,
      "example": "COT-0001"
    },
    "ordenCompra": {
      "prefix": "OC",
      "padding": 5,
      "example": "OC-00001"
    },
    "plazos": {
      "respuestaCotizacion": 7
    },
    "validaciones": {
      "cantidadMinima": 1,
      "cantidadMaxima": 999999,
      "cotizacionesMinimas": 1,
      "cotizacionesRecomendadas": 3
    }
  }
}
```

### 1.2. Archivo Fallback

**Ubicación:** `lib/config/insumos-config-fallback.json`

```json
{
  "folio": {
    "prefix": "SI",
    "padding": 4
  },
  "cotizacion": {
    "prefix": "COT",
    "padding": 4
  },
  "ordenCompra": {
    "prefix": "OC",
    "padding": 5
  },
  "plazos": {
    "respuestaCotizacion": 7
  },
  "validaciones": {
    "cantidadMinima": 1,
    "cantidadMaxima": 999999,
    "cotizacionesMinimas": 1,
    "cotizacionesRecomendadas": 3
  }
}
```

### 1.3. Helper de Configuración

**Ubicación:** `lib/config/insumos-config.ts`

```typescript
import { prisma } from "@/lib/prisma";
import fallback from "./insumos-config-fallback.json";

export type InsumosConfig = typeof fallback;

export async function getInsumosConfig(): Promise<InsumosConfig> {
  try {
    const setting = await prisma.app_setting.findUnique({
      where: { key: "insumos_config" },
    });
    
    if (!setting) return fallback;
    return { ...fallback, ...(setting.value as any) };
  } catch (error) {
    console.error("Error al cargar configuración de insumos:", error);
    return fallback;
  }
}
```

---

## 2. Permisos y Notificaciones

### 2.1. Módulo

```typescript
// Prisma Seed
const insumos = await prisma.module.create({
  data: {
    code: "insumos",
    name: "Solicitud de Insumos",
    icon: "Package",
    displayOrder: 4,
    isActive: true,
    emailEnabled: true,
  },
});
```

### 2.2. Permisos del Módulo

```typescript
await prisma.modulePermission.createMany({
  data: [
    {
      moduleId: insumos.id,
      code: "gestiona_cotizaciones",
      name: "Gestiona Cotizaciones",
      description: "Puede crear y editar cotizaciones en solicitudes de insumos",
      category: "operation",
    },
    {
      moduleId: insumos.id,
      code: "aprueba_cotizaciones",
      name: "Aprueba Cotizaciones",
      description: "Puede aprobar o rechazar cotizaciones en solicitudes de insumos",
      category: "approval",
    },
    {
      moduleId: insumos.id,
      code: "autoriza_cotizaciones",
      name: "Autoriza Cotizaciones",
      description: "Puede generar reportes finales de cotizaciones aprobadas",
      category: "approval",
    },
  ],
});
```

### 2.3. Notificaciones del Módulo

```typescript
await prisma.moduleNotificationSetting.createMany({
  data: [
    {
      moduleId: insumos.id,
      eventKey: "onNewRequest",
      eventName: "Nueva Solicitud de Insumos",
      description: "Se notifica cuando se crea una nueva solicitud de insumos",
      isEnabled: true,
      requiredPermissions: ["gestiona_cotizaciones", "aprueba_cotizaciones", "autoriza_cotizaciones"],
    },
    {
      moduleId: insumos.id,
      eventKey: "onCotizacionRecibida",
      eventName: "Cotización Recibida",
      description: "Se notifica cuando se recibe una cotización de proveedor",
      isEnabled: true,
      requiredPermissions: ["aprueba_cotizaciones", "autoriza_cotizaciones"],
    },
    {
      moduleId: insumos.id,
      eventKey: "onCotizacionAprobada",
      eventName: "Cotización Aprobada",
      description: "Se notifica cuando una cotización es aprobada",
      isEnabled: true,
      requiredPermissions: ["autoriza_cotizaciones"],
    },
    {
      moduleId: insumos.id,
      eventKey: "onOrdenCompraGenerada",
      eventName: "Orden de Compra Generada",
      description: "Se notifica cuando se genera una orden de compra",
      isEnabled: true,
      requiredPermissions: ["gestiona_cotizaciones"],
    },
  ],
});
```

---

## 3. Mantenedores y Seeds

### 3.1. Schema Prisma

> **⚠️ IMPORTANTE - Mantenedores Existentes:**
> 
> Los siguientes modelos **YA EXISTEN** en el proyecto y deben ser **REUTILIZADOS**:
> 
> - **`MntSupplier`** → Proveedores (tabla: `mnt_suppliers`)
>   - **Ubicación CRUD:** `/mantencion/configuracion/proveedores`
>   - **Campos clave:** `rut`, `businessLine`, `legalName`, `fantasyName`, `contactName`, `contactEmail`, `phone`
> 
> - **`MntSupplyCategory`** → Categorías de Suministros (tabla: `mnt_supply_categories`)
>   - **Seed existente:** 3 categorías básicas (Repuestos, Herramientas, Consumibles)
>   - **Acción:** Ampliar seed con categorías adicionales (Víveres, EPP, Limpieza, etc.)
> 
> - **`MntInstallation`** → Instalaciones (tabla: `mnt_installations`)
>   - **Ubicación CRUD:** `/mantencion/configuracion/instalaciones`
>   - **Campos clave:** `name`, `folio`, `internalCode`, `installationType`, `latitude`, `longitude`
> 
> **SOLO se debe crear el modelo `UnitMaster` (nuevo).**

```prisma
// ========================================
// MÓDULO: SOLICITUD DE INSUMOS
// ========================================
// NOTA: Se reutilizan modelos existentes de Mantención
// (MntSupplier, MntSupplyCategory, MntInstallation)

// Unidades de Medida
model UnitMaster {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  code        String   @unique
  name        String
  abbreviation String
  category    String?  // 'weight', 'volume', 'length', 'unit'
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  items       SupplyRequestItem[]
  
  @@map("unit_master")
}

// ========================================
// REUTILIZACIÓN DE MODELOS EXISTENTES
// ========================================
// El modelo MntSupplier ya existe y se reutilizará.
// Las cotizaciones referenciarán a MntSupplier directamente.

// Estados de Solicitud
model SupplyRequestStatusMaster {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  code        String   @unique
  name        String
  description String?
  color       String   @default("#6b7280") // Color para badges
  icon        String?
  displayOrder Int     @default(0)
  isActive    Boolean  @default(true)
  
  requests    SupplyRequest[]
  
  @@map("supply_request_status_master")
}

// Estados de Items
model SupplyItemStatusMaster {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  code        String   @unique
  name        String
  description String?
  color       String   @default("#6b7280")
  icon        String?
  displayOrder Int     @default(0)
  isActive    Boolean  @default(true)
  
  items       SupplyRequestItem[]
  
  @@map("supply_item_status_master")
}

// Estados de Cotización
model QuotationStatusMaster {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  code        String   @unique
  name        String
  description String?
  color       String   @default("#6b7280")
  icon        String?
  displayOrder Int     @default(0)
  isActive    Boolean  @default(true)
  
  quotations  SupplyQuotation[]
  
  @@map("quotation_status_master")
}

// Solicitud de Insumos (Principal)
model SupplyRequest {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  folio                 String   @unique
  installationId        String   @map("installation_id") @db.Uuid
  requesterId           String   @map("requester_id") @db.Uuid
  requesterDescription  String   @map("requester_description") @db.Text
  internalObservations  String?  @map("internal_observations") @db.Text
  statusId              String   @map("status_id") @db.Uuid
  createdBy             String   @map("created_by") @db.Uuid
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  // Relaciones (usando modelos existentes)
  installation   MntInstallation @relation(fields: [installationId], references: [id])
  requester      User            @relation("SupplyRequestRequester", fields: [requesterId], references: [id])
  status         SupplyRequestStatusMaster @relation(fields: [statusId], references: [id])
  creator        User            @relation("SupplyRequestCreator", fields: [createdBy], references: [id])
  items          SupplyRequestItem[]
  quotations     SupplyQuotation[]
  
  @@index([folio])
  @@index([statusId])
  @@index([installationId])
  @@index([createdAt])
  @@map("supply_request")
}

// Items de Solicitud
model SupplyRequestItem {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  requestId             String   @map("request_id") @db.Uuid
  itemName              String   @map("item_name") @db.VarChar(150)
  categoryId            String   @map("category_id") @db.Uuid
  quantity              Decimal  @db.Decimal(10, 2)
  unitId                String   @map("unit_id") @db.Uuid
  statusId              String   @map("status_id") @db.Uuid
  requesterDescription  String?  @map("requester_description") @db.Text
  internalNotes         String?  @map("internal_notes") @db.Text
  displayOrder          Int      @default(0) @map("display_order")
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  // Relaciones (usando modelos existentes)
  request         SupplyRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  category        MntSupplyCategory @relation(fields: [categoryId], references: [id])
  unit            UnitMaster @relation(fields: [unitId], references: [id])
  status          SupplyItemStatusMaster @relation(fields: [statusId], references: [id])
  quotationItems  SupplyQuotationItem[]
  
  @@index([requestId])
  @@index([statusId])
  @@map("supply_request_item")
}

// Cotizaciones
model SupplyQuotation {
  id                    String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  requestId             String   @map("request_id") @db.Uuid
  folio                 String   @unique
  supplierId            String   @map("supplier_id") @db.Uuid
  statusId              String   @map("status_id") @db.Uuid
  responseDeadline      DateTime? @map("response_deadline") @db.Timestamptz(6)
  supplierObservations  String?  @map("supplier_observations") @db.Text
  internalObservations  String?  @map("internal_observations") @db.Text
  netAmount             Decimal? @map("net_amount") @db.Decimal(12, 2)
  iva                   Decimal? @db.Decimal(12, 2)
  totalAmount           Decimal? @map("total_amount") @db.Decimal(12, 2)
  deliveryTime          Int?     @map("delivery_time") // En días
  paymentConditions     String?  @map("payment_conditions")
  validityDate          DateTime? @map("validity_date") @db.Timestamptz(6)
  purchaseOrderNumber   String?  @map("purchase_order_number")
  createdBy             String   @map("created_by") @db.Uuid
  approvedBy            String?  @map("approved_by") @db.Uuid
  approvedAt            DateTime? @map("approved_at") @db.Timestamptz(6)
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  // Relaciones (usando modelos existentes)
  request      SupplyRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  supplier     MntSupplier @relation(fields: [supplierId], references: [id])
  status       QuotationStatusMaster @relation(fields: [statusId], references: [id])
  creator      User @relation("QuotationCreator", fields: [createdBy], references: [id])
  approver     User? @relation("QuotationApprover", fields: [approvedBy], references: [id])
  items        SupplyQuotationItem[]
  attachments  SupplyQuotationAttachment[]
  
  @@index([folio])
  @@index([requestId])
  @@index([supplierId])
  @@index([statusId])
  @@map("supply_quotation")
}

// Items de Cotización
model SupplyQuotationItem {
  id                String   @id @default(dbgenerated("gen_random_uuid()"))
  quotationId       String
  requestItemId     String
  unitPrice         Decimal? @db.Decimal(12, 2)
  totalPrice        Decimal? @db.Decimal(12, 2)
  supplierNotes     String?  @db.Text
  isForced          Boolean  @default(false) // TRUE si fue forzado pese a estar en otra cotización
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relaciones
  quotation     SupplyQuotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  requestItem   SupplyRequestItem @relation(fields: [requestItemId], references: [id])
  
  @@unique([quotationId, requestItemId])
  @@index([quotationId])
  @@index([requestItemId]) // Índice para búsquedas de disponibilidad
  @@map("supply_quotation_item")
}

// **Campo `isForced`**: Indica que el artículo fue agregado a la cotización pese a estar ya cotizado en otra.
// Esto permite trackear decisiones manuales del usuario y mostrar advertencias en la UI.

// Adjuntos de Cotización
model SupplyQuotationAttachment {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  quotationId   String
  fileName      String
  fileType      String
  fileSize      Int
  storagePath   String
  uploadedBy    String
  createdAt     DateTime @default(now())
  
  // Relaciones
  quotation     SupplyQuotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  uploader      User @relation(fields: [uploadedBy], references: [id])
  
  @@index([quotationId])
  @@map("supply_quotation_attachment")
}

// ========================================
// NOTAS DE INTEGRACIÓN CON MODELOS EXISTENTES
// ========================================
// 
// 1. MntInstallation (Instalaciones):
//    - Relación: SupplyRequest.installationId → MntInstallation.id
//    - Campos relevantes: name, folio, internalCode, latitude, longitude
//    - CRUD: /mantencion/configuracion/instalaciones
//
// 2. MntSupplier (Proveedores):
//    - Relación: SupplyQuotation.supplierId → MntSupplier.id
//    - Campos relevantes: rut, legalName, fantasyName, contactEmail, phone
//    - CRUD: /mantencion/configuracion/proveedores
//
// 3. MntSupplyCategory (Categorías):
//    - Relación: SupplyRequestItem.categoryId → MntSupplyCategory.id
//    - Campos relevantes: name, description, isActive
//    - Seed: prisma/seeds/seed-mantencion.ts (ampliar)
//
// 4. User (Usuarios):
//    - Múltiples relaciones: requester, creator, approver, etc.
//    - Campos: firstName, lastName, email, rut
//
```

### 3.2. Seed - Categorías de Insumos (Ampliar Existentes)

> **📌 NOTA:** El modelo `MntSupplyCategory` ya existe con 3 categorías básicas:
> - Repuestos
> - Herramientas
> - Consumibles
> 
> **Acción:** Ampliar el seed existente en `prisma/seeds/seed-mantencion.ts`

**Ubicación:** Modificar `prisma/seeds/seed-mantencion.ts` (líneas 45-60)

```typescript
// Ampliar categorías existentes (en seed-mantencion.ts)
const categories = [
  { name: "Insumos y Materiales", description: "Materiales de construcción, ferretería, electricidad" },
  { name: "Víveres", description: "Alimentos, bebidas y productos de consumo" },
  { name: "Repuestos", description: "Repuestos de equipos y maquinaria" },
  { name: "Herramientas", description: "Herramientas manuales y eléctricas" },
  { name: "Elementos de Protección Personal", description: "EPP: cascos, guantes, arneses, etc." },
  { name: "Artículos de Limpieza", description: "Productos de aseo y sanitización" },
  { name: "Útiles de Oficina", description: "Papelería, toners, archivadores" },
  { name: "Equipos", description: "Equipos completos y maquinaria" },
  { name: "Consumibles", description: "Lubricantes, paños, etc." },
];

console.log("Insertando Categorías de Insumos...");
for (const cat of categories) {
  await prisma.mntSupplyCategory.upsert({
    where: { name: cat.name },
    update: {},
    create: cat,
  });
}
```

### 3.3. Seed - Unidades de Medida

**Ubicación:** `prisma/seeds/unit-master-seed.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedUnitMaster() {
  console.log("🌱 Seeding: Unidades de Medida...");

  const units = [
    // Unidades básicas
    { code: "un", name: "Unidad", abbreviation: "un", category: "unit" },
    { code: "und", name: "Unidades", abbreviation: "und", category: "unit" },
    { code: "pza", name: "Pieza", abbreviation: "pza", category: "unit" },
    { code: "par", name: "Par", abbreviation: "par", category: "unit" },
    { code: "jgo", name: "Juego", abbreviation: "jgo", category: "unit" },
    { code: "kit", name: "Kit", abbreviation: "kit", category: "unit" },
    
    // Longitud
    { code: "m", name: "Metro", abbreviation: "m", category: "length" },
    { code: "cm", name: "Centímetro", abbreviation: "cm", category: "length" },
    { code: "mm", name: "Milímetro", abbreviation: "mm", category: "length" },
    { code: "plg", name: "Pulgada", abbreviation: "plg", category: "length" },
    
    // Peso
    { code: "kg", name: "Kilogramo", abbreviation: "kg", category: "weight" },
    { code: "g", name: "Gramo", abbreviation: "g", category: "weight" },
    { code: "ton", name: "Tonelada", abbreviation: "ton", category: "weight" },
    { code: "lb", name: "Libra", abbreviation: "lb", category: "weight" },
    
    // Volumen
    { code: "lt", name: "Litro", abbreviation: "lt", category: "volume" },
    { code: "ml", name: "Mililitro", abbreviation: "ml", category: "volume" },
    { code: "gal", name: "Galón", abbreviation: "gal", category: "volume" },
    { code: "m3", name: "Metro Cúbico", abbreviation: "m³", category: "volume" },
    
    // Área
    { code: "m2", name: "Metro Cuadrado", abbreviation: "m²", category: "area" },
    
    // Energía
    { code: "kw", name: "Kilovatio", abbreviation: "kW", category: "power" },
    { code: "hp", name: "Caballo de Fuerza", abbreviation: "HP", category: "power" },
    
    // Otros
    { code: "caja", name: "Caja", abbreviation: "cja", category: "container" },
    { code: "bolsa", name: "Bolsa", abbreviation: "bls", category: "container" },
    { code: "saco", name: "Saco", abbreviation: "sco", category: "container" },
    { code: "paquete", name: "Paquete", abbreviation: "pqt", category: "container" },
  ];

  for (const unit of units) {
    await prisma.unitMaster.upsert({
      where: { code: unit.code },
      update: unit,
      create: unit,
    });
  }

  console.log("✅ Unidades de Medida creadas");
}
```

### 3.4. Seed - Estados de Solicitud

**Ubicación:** `prisma/seeds/supply-request-statuses-seed.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedSupplyRequestStatuses() {
  console.log("🌱 Seeding: Estados de Solicitud de Insumos...");

  const statuses = [
    {
      code: "PENDIENTE",
      name: "Pendiente",
      description: "Solicitud creada, pendiente de gestión",
      color: "#f59e0b",
      icon: "Clock",
      displayOrder: 1,
    },
    {
      code: "EN_PROCESO",
      name: "En Proceso",
      description: "Solicitud en proceso de cotización",
      color: "#3b82f6",
      icon: "RefreshCw",
      displayOrder: 2,
    },
    {
      code: "APROBADA",
      name: "Aprobada",
      description: "Solicitud aprobada",
      color: "#10b981",
      icon: "CheckCircle",
      displayOrder: 3,
    },
    {
      code: "RECHAZADA",
      name: "Rechazada",
      description: "Solicitud rechazada",
      color: "#ef4444",
      icon: "XCircle",
      displayOrder: 4,
    },
    {
      code: "ANULADA",
      name: "Anulada",
      description: "Solicitud anulada",
      color: "#6b7280",
      icon: "Ban",
      displayOrder: 5,
    },
    {
      code: "FINALIZADA",
      name: "Finalizada",
      description: "Solicitud finalizada con entrega completa",
      color: "#8b5cf6",
      icon: "CheckCheck",
      displayOrder: 6,
    },
  ];

  for (const status of statuses) {
    await prisma.supplyRequestStatusMaster.upsert({
      where: { code: status.code },
      update: status,
      create: status,
    });
  }

  console.log("✅ Estados de Solicitud creados");
}
```

### 3.5. Seed - Estados de Items

**Ubicación:** `prisma/seeds/supply-item-statuses-seed.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedSupplyItemStatuses() {
  console.log("🌱 Seeding: Estados de Items...");

  const statuses = [
    {
      code: "PENDIENTE",
      name: "Pendiente",
      description: "Item pendiente de cotización",
      color: "#f59e0b",
      icon: "Clock",
      displayOrder: 1,
    },
    {
      code: "COTIZADO",
      name: "Cotizado",
      description: "Item enviado a cotización",
      color: "#3b82f6",
      icon: "FileText",
      displayOrder: 2,
    },
    {
      code: "AUTORIZADO",
      name: "Autorizado",
      description: "Item autorizado para compra",
      color: "#8b5cf6",
      icon: "ShieldCheck",
      displayOrder: 3,
    },
    {
      code: "APROBADO",
      name: "Aprobado",
      description: "Item aprobado",
      color: "#10b981",
      icon: "CheckCircle",
      displayOrder: 4,
    },
    {
      code: "RECHAZADO",
      name: "Rechazado",
      description: "Item rechazado",
      color: "#ef4444",
      icon: "XCircle",
      displayOrder: 5,
    },
    {
      code: "ENTREGADO",
      name: "Entregado",
      description: "Item entregado",
      color: "#059669",
      icon: "PackageCheck",
      displayOrder: 6,
    },
    {
      code: "NO_DISPONIBLE",
      name: "No Disponible",
      description: "Item no disponible en el mercado",
      color: "#6b7280",
      icon: "PackageX",
      displayOrder: 7,
    },
  ];

  for (const status of statuses) {
    await prisma.supplyItemStatusMaster.upsert({
      where: { code: status.code },
      update: status,
      create: status,
    });
  }

  console.log("✅ Estados de Items creados");
}
```

### 3.6. Seed - Estados de Cotización

**Ubicación:** `prisma/seeds/quotation-statuses-seed.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedQuotationStatuses() {
  console.log("🌱 Seeding: Estados de Cotizaciones...");

  const statuses = [
    {
      code: "PENDIENTE",
      name: "Pendiente",
      description: "Cotización creada pero no enviada",
      color: "#9ca3af",
      icon: "Clock",
      displayOrder: 1,
    },
    {
      code: "ENVIADA",
      name: "Enviada",
      description: "Cotización enviada al proveedor, esperando respuesta",
      color: "#3b82f6",
      icon: "Send",
      displayOrder: 2,
    },
    {
      code: "RECIBIDA",
      name: "Recibida",
      description: "Proveedor ha respondido con precios",
      color: "#f59e0b",
      icon: "Mail",
      displayOrder: 3,
    },
    {
      code: "NO_COTIZADO",
      name: "No Cotizado",
      description: "Proveedor no respondió en el plazo establecido (registro de auditoría)",
      color: "#6b7280",
      icon: "CalendarX",
      displayOrder: 4,
    },
    {
      code: "APROBADA",
      name: "Aprobada",
      description: "Cotización aprobada, artículos ya no disponibles para otras cotizaciones",
      color: "#10b981",
      icon: "CheckCircle",
      displayOrder: 5,
    },
    {
      code: "RECHAZADA",
      name: "Rechazada",
      description: "Rechazada manualmente o por aprobación de otra (artículos se liberan)",
      color: "#ef4444",
      icon: "XCircle",
      displayOrder: 6,
    },
  ];

  for (const status of statuses) {
    await prisma.quotationStatusMaster.upsert({
      where: { code: status.code },
      update: status,
      create: status,
    });
  }

  console.log("✅ Estados de Cotizaciones creados");
}
```

### 3.7. Seed - Proveedores (Reutilizar Existentes)

> **✅ MANTENEDOR EXISTENTE:**
> 
> El modelo `MntSupplier` ya existe y tiene CRUD funcional.
> 
> - **Tabla:** `mnt_suppliers`
> - **CRUD:** `/mantencion/configuracion/proveedores`
> - **Campos:** `rut`, `businessLine`, `legalName`, `fantasyName`, `contactName`, `contactEmail`, `phone`, `address`
> 
> **Acción:** Los proveedores se gestionarán desde el CRUD existente. No se requiere seed adicional, ya que los usuarios pueden crear proveedores según necesidad mediante la interfaz web.
> 
> **Mapeo de campos para el módulo de Insumos:**
> ```typescript
> // Al referenciar proveedores en cotizaciones:
> MntSupplier {
>   rut              → Identificación fiscal
>   legalName        → Razón Social para documentos legales
>   fantasyName      → Nombre comercial para UI
>   contactEmail     → Email para envío de cotizaciones
>   contactName      → Contacto principal
>   phone            → Teléfono de contacto
> }
> ```

### 3.8. Archivo de Seed Principal

**Ubicación:** `prisma/seed-insumos.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { seedUnitMaster } from "./seeds/unit-master-seed";
import { seedSupplyRequestStatuses } from "./seeds/supply-request-statuses-seed";
import { seedSupplyItemStatuses } from "./seeds/supply-item-statuses-seed";
import { seedQuotationStatuses } from "./seeds/quotation-statuses-seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed del módulo de Solicitud de Insumos...");

  // NOTA: MntSupplyCategory ya tiene seed en seed-mantencion.ts
  // NOTA: MntSupplier se gestiona desde CRUD web
  // NOTA: MntInstallation se gestiona desde CRUD web
  
  await seedUnitMaster();
  await seedSupplyRequestStatuses();
  await seedSupplyItemStatuses();
  await seedQuotationStatuses();

  // Crear configuración en app_setting
  console.log("🌱 Seeding: Configuración de Insumos...");
  await prisma.app_setting.upsert({
    where: { key: "insumos_config" },
    update: {
      value: {
        folio: {
          prefix: "SI",
          padding: 4,
          example: "SI-0001",
        },
        cotizacion: {
          prefix: "COT",
          padding: 4,
          example: "COT-0001",
        },
        ordenCompra: {
          prefix: "OC",
          padding: 5,
          example: "OC-00001",
        },
        plazos: {
          respuestaCotizacion: 7,
        },
        validaciones: {
          cantidadMinima: 1,
          cantidadMaxima: 999999,
          cotizacionesMinimas: 1,
          cotizacionesRecomendadas: 3,
        },
      },
    },
    create: {
      key: "insumos_config",
      value: {
        folio: {
          prefix: "SI",
          padding: 4,
          example: "SI-0001",
        },
        cotizacion: {
          prefix: "COT",
          padding: 4,
          example: "COT-0001",
        },
        ordenCompra: {
          prefix: "OC",
          padding: 5,
          example: "OC-00001",
        },
        plazos: {
          respuestaCotizacion: 7,
        },
        validaciones: {
          cantidadMinima: 1,
          cantidadMaxima: 999999,
          cotizacionesMinimas: 1,
          cotizacionesRecomendadas: 3,
        },
      },
    },
  });
  console.log("✅ Configuración de Insumos creada");

  console.log("✨ Seed del módulo de Solicitud de Insumos completado");
  console.log("");
  console.log("📝 RECORDATORIO:");
  console.log("   - Ampliar categorías en prisma/seeds/seed-mantencion.ts");
  console.log("   - Proveedores: usar CRUD en /mantencion/configuracion/proveedores");
  console.log("   - Instalaciones: usar CRUD en /mantencion/configuracion/instalaciones");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 4. Rutas y Estructura de Páginas

### 4.1. Árbol de Rutas

```
app/
└── (dashboard)/
    └── insumos/
        ├── layout.tsx                          # Layout con prefetch de catálogos
        ├── page.tsx                            # Dashboard de Insumos (KPIs + Shortcuts)
        │
        ├── solicitudes/                        # Bandeja de Solicitudes
        │   ├── page.tsx                        # Listado de Solicitudes
        │   └── components/
        │       ├── RequestsTable.tsx           # Tabla de solicitudes
        │       ├── RequestsTableColumns.tsx    # Definición de columnas
        │       ├── RequestFilters.tsx          # Filtros de búsqueda
        │       ├── FolioTooltip.tsx            # Tooltip de folio
        │       └── ItemsTooltip.tsx            # Tooltip de items/cotizaciones
        │
        ├── crear/                              # Crear Solicitud
        │   ├── page.tsx                        # Orquestador (Server Component)
        │   ├── actions.ts                      # Server Actions (thin wrappers)
        │   └── components/
        │       ├── CreateRequestClient.tsx     # Vista móvil
        │       ├── CreateRequestDesktop.tsx    # Vista escritorio
        │       └── ItemsGrid.tsx               # Grilla tipo Excel para items
        │
        ├── [id]/                               # Detalle de Solicitud
        │   ├── page.tsx                        # Orquestador
        │   ├── actions.ts                      # Acciones de la solicitud
        │   └── components/
        │       ├── RequestDetailClient.tsx     # Vista móvil
        │       ├── RequestDetailDesktop.tsx    # Vista escritorio
        │       ├── ItemsTab.tsx                # Tab de Items
        │       ├── QuotationsTab.tsx           # Tab de Cotizaciones
        │       ├── HistoryTab.tsx              # Tab de Historial
        │       ├── SendToQuotationDialog.tsx   # Modal "Enviar a Cotización"
        │       ├── QuotationDetailDialog.tsx   # Modal "Detalle de Cotización"
        │       ├── SendEmailDialog.tsx         # Modal "Enviar Email"
        │       └── ManualQuotationDialog.tsx   # Modal "Ingresar Manual"
        │
        └── configuracion/                      # Configuración del Módulo
            └── page.tsx                        # Configuración de Folios y Plazos

    mantenedores/
        └── unidades/                           # Mantenedor de Unidades (GLOBAL - NUEVO)
            └── page.tsx

    # NOTA: Los siguientes mantenedores YA EXISTEN y se reutilizan:
    # - Proveedores → /mantencion/configuracion/proveedores
    # - Categorías → Se amplían en seed de MntSupplyCategory
    # - Instalaciones → /mantencion/configuracion/instalaciones
```

### 4.2. Descripción de Páginas Principales

#### 4.2.1. Dashboard de Insumos

**Ruta:** `/insumos/page.tsx`

```typescript
import { Metadata } from "next";
import { verifySession } from "@/lib/auth/session-server";
import { redirect } from "next/navigation";
import { InsumosKPIs } from "./components/InsumosKPIs";
import { InsumosShortcuts } from "./components/InsumosShortcuts";

export const metadata: Metadata = {
  title: "Solicitud de Insumos | GEOP Río Dulce",
};

export default async function InsumosPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <div className="w-full space-y-6">
      {/* Título y descripción */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Solicitud de Insumos</h1>
        <p className="text-muted-foreground">
          Gestión de solicitudes de abastecimiento con trazabilidad granular
        </p>
      </div>

      {/* KPIs en tiempo real */}
      <InsumosKPIs />

      {/* Atajos rápidos */}
      <InsumosShortcuts />
    </div>
  );
}
```

#### 4.2.2. Bandeja de Solicitudes

**Ruta:** `/insumos/solicitudes/page.tsx`

```typescript
import { Metadata } from "next";
import { verifySession } from "@/lib/auth/session-server";
import { redirect } from "next/navigation";
import { RequestsTableWrapper } from "./components/RequestsTableWrapper";

export const metadata: Metadata = {
  title: "Solicitudes de Insumos | GEOP Río Dulce",
};

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function SolicitudesPage({ searchParams }: PageProps) {
  const session = await verifySession();
  if (!session) redirect("/login");

  return (
    <div className="w-full space-y-6">
      {/* Título y descripción */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          SOLICITUDES DE INSUMOS
        </h1>
        <p className="text-muted-foreground">
          Bandeja de solicitudes con filtros avanzados y trazabilidad
        </p>
      </div>

      {/* Tabla con filtros */}
      <RequestsTableWrapper
        initialFilters={searchParams}
        currentUser={session.user}
      />
    </div>
  );
}
```

#### 4.2.3. Crear Solicitud (Patrón Adaptativo)

**Ruta:** `/insumos/crear/page.tsx`

```typescript
import { Metadata } from "next";
import { verifySession } from "@/lib/auth/session-server";
import { redirect } from "next/navigation";
import { getCatalogDataForRequest } from "@/lib/services/insumos/catalog-service";
import CreateRequestClient from "./components/CreateRequestClient";
import CreateRequestDesktop from "./components/CreateRequestDesktop";

export const metadata: Metadata = {
  title: "Crear Solicitud de Insumos | GEOP Río Dulce",
};

export default async function CrearSolicitudPage() {
  const session = await verifySession();
  if (!session) redirect("/login");

  // Obtener catálogos necesarios
  const catalogs = await getCatalogDataForRequest();

  return (
    <div className="w-full">
      {/* Versión móvil */}
      <div className="lg:hidden">
        <CreateRequestClient
          catalogs={catalogs}
          currentUser={session.user}
        />
      </div>

      {/* Versión escritorio */}
      <div className="hidden lg:block">
        <CreateRequestDesktop
          catalogs={catalogs}
          currentUser={session.user}
        />
      </div>
    </div>
  );
}
```

#### 4.2.4. Detalle de Solicitud (Patrón Adaptativo)

**Ruta:** `/insumos/[id]/page.tsx`

```typescript
import { Metadata } from "next";
import { verifySession } from "@/lib/auth/session-server";
import { redirect, notFound } from "next/navigation";
import { supplyRequestService } from "@/lib/services/insumos/supply-request-service";
import RequestDetailClient from "./components/RequestDetailClient";
import RequestDetailDesktop from "./components/RequestDetailDesktop";

export const metadata: Metadata = {
  title: "Detalle de Solicitud | GEOP Río Dulce",
};

interface PageProps {
  params: { id: string };
}

export default async function DetalleSolicitudPage({ params }: PageProps) {
  const session = await verifySession();
  if (!session) redirect("/login");

  // Obtener solicitud con todas sus relaciones
  const request = await supplyRequestService.getById(params.id);
  if (!request) notFound();

  // Verificar permisos
  const userPermissions = await supplyRequestService.getUserPermissions(
    session.user.id
  );

  return (
    <div className="w-full">
      {/* Versión móvil */}
      <div className="lg:hidden">
        <RequestDetailClient
          request={request}
          userPermissions={userPermissions}
          currentUser={session.user}
        />
      </div>

      {/* Versión escritorio */}
      <div className="hidden lg:block">
        <RequestDetailDesktop
          request={request}
          userPermissions={userPermissions}
          currentUser={session.user}
        />
      </div>
    </div>
  );
}
```

---

## 5. Service Layer

### 5.1. Supply Request Service

**Ubicación:** `lib/services/insumos/supply-request-service.ts`

```typescript
import { prisma } from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit/audit-logger";
import { getInsumosConfig } from "@/lib/config/insumos-config";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";

export class SupplyRequestService {
  private readonly prisma = prisma;
  private readonly auditLogger = AuditLogger;

  /**
   * Crear una nueva solicitud de insumos
   */
  async create(data: CreateSupplyRequestInput, userId: string, metadata?: any) {
    // 1. Validar reglas de negocio
    await this.validateBusinessRules(data);

    // 2. Obtener configuración de folios
    const config = await getInsumosConfig();
    const folio = await this.generateFolio(config.folio.prefix, config.folio.padding);

    // 3. Obtener estado "Pendiente"
    const pendingStatus = await this.prisma.supplyRequestStatusMaster.findFirst({
      where: { code: "PENDIENTE" },
    });
    if (!pendingStatus) throw new Error("Estado 'Pendiente' no encontrado");

    // 4. Transacción atómica
    return await this.prisma.$transaction(async (tx) => {
      // Crear solicitud
      const request = await tx.supplyRequest.create({
        data: {
          folio,
          installationId: data.installationId,
          requesterId: data.requesterId,
          requesterDescription: data.requesterDescription,
          internalObservations: data.internalObservations,
          statusId: pendingStatus.id,
          createdBy: userId,
        },
        include: {
          installation: true,
          requester: true,
          status: true,
        },
      });

      // Crear items
      await this.createItems(tx, request.id, data.items);

      // Auditoría
      await this.auditLogger.log({
        action: "CREATE",
        entity: "SupplyRequest",
        entityId: request.id,
        userId,
        metadata: {
          folio: request.folio,
          installationId: data.installationId,
          itemCount: data.items.length,
          ...metadata,
        },
      });

      return request;
    });
  }

  /**
   * Crear items de una solicitud
   */
  private async createItems(
    tx: any,
    requestId: string,
    items: CreateSupplyItemInput[]
  ) {
    const pendingStatus = await tx.supplyItemStatusMaster.findFirst({
      where: { code: "PENDIENTE" },
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await tx.supplyRequestItem.create({
        data: {
          requestId,
          itemName: item.itemName,
          categoryId: item.categoryId,
          quantity: item.quantity,
          unitId: item.unitId,
          statusId: pendingStatus.id,
          requesterDescription: item.requesterDescription,
          internalNotes: item.internalNotes,
          displayOrder: i,
        },
      });
    }
  }

  /**
   * Generar folio único
   */
  private async generateFolio(prefix: string, padding: number): Promise<string> {
    const lastRequest = await this.prisma.supplyRequest.findFirst({
      where: {
        folio: {
          startsWith: prefix,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;
    if (lastRequest) {
      const currentNumber = parseInt(lastRequest.folio.replace(prefix + "-", ""));
      nextNumber = currentNumber + 1;
    }

    return `${prefix}-${String(nextNumber).padStart(padding, "0")}`;
  }

  /**
   * Obtener solicitud por ID con relaciones completas
   */
  async getById(id: string) {
    return await this.prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        installation: true, // MntInstallation
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        status: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            category: true, // MntSupplyCategory
            unit: true, // UnitMaster
            status: true,
            quotationItems: {
              include: {
                quotation: {
                  include: {
                    supplier: true, // MntSupplier
                    status: true,
                  },
                },
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
        quotations: {
          include: {
            supplier: true, // MntSupplier
            status: true,
            items: {
              include: {
                requestItem: true,
              },
            },
            attachments: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Obtener permisos del usuario en el módulo de insumos
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    return await modulePermissionService.getUserPermissions(userId, "insumos");
  }

  /**
   * Validar reglas de negocio
   */
  private async validateBusinessRules(data: CreateSupplyRequestInput) {
    if (!data.items || data.items.length === 0) {
      throw new BusinessRuleError("La solicitud debe tener al menos un item");
    }

    const config = await getInsumosConfig();
    for (const item of data.items) {
      if (item.quantity < config.validaciones.cantidadMinima) {
        throw new BusinessRuleError(
          `La cantidad mínima es ${config.validaciones.cantidadMinima}`
        );
      }
      if (item.quantity > config.validaciones.cantidadMaxima) {
        throw new BusinessRuleError(
          `La cantidad máxima es ${config.validaciones.cantidadMaxima}`
        );
      }
    }
  }

  /**
   * Actualizar estado de solicitud
   */
  async updateStatus(requestId: string, statusCode: string, userId: string) {
    const status = await this.prisma.supplyRequestStatusMaster.findFirst({
      where: { code: statusCode },
    });
    if (!status) throw new Error("Estado no encontrado");

    return await this.prisma.$transaction(async (tx) => {
      const request = await tx.supplyRequest.update({
        where: { id: requestId },
        data: { statusId: status.id },
        include: { status: true },
      });

      await this.auditLogger.log({
        action: "UPDATE_STATUS",
        entity: "SupplyRequest",
        entityId: requestId,
        userId,
        metadata: {
          newStatus: status.code,
        },
      });

      return request;
    });
  }

  /**
   * Listar solicitudes con filtros
   */
  async list(filters: SupplyRequestFilters) {
    const where: any = {};

    if (filters.statusId) where.statusId = filters.statusId;
    if (filters.installationId) where.installationId = filters.installationId;
    if (filters.folio) where.folio = { contains: filters.folio, mode: "insensitive" };
    if (filters.dateFrom) {
      where.createdAt = { gte: new Date(filters.dateFrom) };
    }
    if (filters.dateTo) {
      where.createdAt = { ...where.createdAt, lte: new Date(filters.dateTo) };
    }

    const [data, total] = await Promise.all([
      this.prisma.supplyRequest.findMany({
        where,
        include: {
          installation: true, // MntInstallation
          requester: { select: { id: true, firstName: true, lastName: true } },
          status: true,
          items: {
            include: {
              status: true,
            },
          },
          quotations: {
            include: {
              status: true,
              supplier: true, // MntSupplier
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: filters.skip || 0,
        take: filters.take || 20,
      }),
      this.prisma.supplyRequest.count({ where }),
    ]);

    return { data, total };
  }
}

export const supplyRequestService = new SupplyRequestService();

// Tipos auxiliares
export interface CreateSupplyRequestInput {
  installationId: string;
  requesterId: string;
  requesterDescription: string;
  internalObservations?: string;
  items: CreateSupplyItemInput[];
}

export interface CreateSupplyItemInput {
  itemName: string;
  categoryId: string;
  quantity: number;
  unitId: string;
  requesterDescription?: string;
  internalNotes?: string;
}

export interface SupplyRequestFilters {
  statusId?: string;
  installationId?: string;
  folio?: string;
  dateFrom?: string;
  dateTo?: string;
  skip?: number;
  take?: number;
}

class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}
```

### 5.2. Supply Quotation Service

**Ubicación:** `lib/services/insumos/supply-quotation-service.ts`

#### **Reglas de Negocio - Disponibilidad de Artículos**

1. **Liberación al Rechazar**: Al rechazar manualmente una cotización (estado → 'rejected'), todos sus artículos se liberan automáticamente y pueden cotizarse nuevamente.

2. **No Eliminación Post-Envío**: Una cotización en estado 'sent' NO puede eliminarse. Se debe cambiar a 'not_quoted' para registrar que el proveedor no respondió.

3. **Sin Límite de Cotizaciones**: Un mismo artículo puede estar en múltiples cotizaciones activas simultáneamente (sin límite).

4. **Forzado con Advertencia**: Al agregar un artículo ya cotizado, se debe marcar `isForced = true` y mostrar advertencia en UI con la cantidad de cotizaciones donde está presente.

5. **Rechazo Automático en Cascada**: Al aprobar una cotización con artículos 2,3,4,5:
   - Todas las cotizaciones activas con esos mismos artículos se rechazan automáticamente.
   - Los artículos únicos de esas cotizaciones rechazadas (ej: Artículo 1) se liberan para cotizar de nuevo.

6. **Prohibición de Aprobación Parcial**: No se puede aprobar/rechazar artículos individuales de una cotización. La aprobación/rechazo es a nivel de cotización completa.

```typescript
import { prisma } from "@/lib/prisma";
import { AuditLogger } from "@/lib/audit/audit-logger";
import { getInsumosConfig } from "@/lib/config/insumos-config";

export class SupplyQuotationService {
  private readonly prisma = prisma;
  private readonly auditLogger = AuditLogger;

  /**
   * Verificar disponibilidad de artículos antes de crear cotización
   */
  async checkItemsAvailability(requestItemIds: string[]): Promise<ItemAvailability[]> {
    const quotedItems = await this.prisma.supplyQuotationItem.findMany({
      where: {
        requestItemId: { in: requestItemIds },
        quotation: {
          status: {
            code: { in: ['PENDIENTE', 'ENVIADA', 'RECIBIDA'] } // Estados activos
          }
        }
      },
      include: {
        quotation: {
          include: {
            supplier: { select: { legalName: true, fantasyName: true } },
            status: { select: { name: true } }
          }
        },
        requestItem: {
          include: { 
            request: { select: { folio: true } }
          }
        }
      }
    });

    // Agrupar por artículo
    const availability = requestItemIds.map(itemId => {
      const quotations = quotedItems.filter(qi => qi.requestItemId === itemId);
      return {
        requestItemId: itemId,
        isAvailable: quotations.length === 0,
        quotationCount: quotations.length,
        existingQuotations: quotations.map(qi => ({
          quotationFolio: qi.quotation.folio,
          supplierName: qi.quotation.supplier.fantasyName || qi.quotation.supplier.legalName,
          statusName: qi.quotation.status.name,
          createdAt: qi.quotation.createdAt
        }))
      };
    });

    return availability;
  }

  /**
   * Crear una nueva cotización con validación de disponibilidad
   */
  async createQuotation(
    data: CreateQuotationInput,
    userId: string,
    metadata?: any
  ) {
    // 1. Validar disponibilidad de artículos
    const availability = await this.checkItemsAvailability(data.itemIds);
    const unavailableItems = availability.filter(a => !a.isAvailable);

    // Si hay items no disponibles y no se forzó, lanzar error
    if (unavailableItems.length > 0 && !data.forceUnavailable) {
      throw new BusinessRuleError(
        `${unavailableItems.length} artículo(s) ya están cotizados. Active "Mostrar Cotizados" para forzar inclusión.`
      );
    }

    // 2. Generar folio
    const config = await getInsumosConfig();
    const folio = await this.generateFolio(
      config.cotizacion.prefix,
      config.cotizacion.padding
    );

    // 3. Obtener estado (PENDIENTE o ENVIADA según si se envía inmediatamente)
    const statusCode = data.sendImmediately ? 'ENVIADA' : 'PENDIENTE';
    const status = await this.prisma.quotationStatusMaster.findFirst({
      where: { code: statusCode },
    });

    // 4. Calcular fecha límite
    const responseDeadline = new Date();
    responseDeadline.setDate(
      responseDeadline.getDate() + config.plazos.respuestaCotizacion
    );

    // 5. Transacción
    return await this.prisma.$transaction(async (tx) => {
      const quotation = await tx.supplyQuotation.create({
        data: {
          requestId: data.requestId,
          folio,
          supplierId: data.supplierId,
          statusId: status!.id,
          responseDeadline,
          internalObservations: data.internalObservations,
          createdBy: userId,
        },
        include: {
          supplier: true,
          status: true,
        },
      });

      // Crear items de cotización
      for (const itemId of data.itemIds) {
        const itemAvailability = availability.find(a => a.requestItemId === itemId);
        const isForced = !itemAvailability?.isAvailable;

        await tx.supplyQuotationItem.create({
          data: {
            quotationId: quotation.id,
            requestItemId: itemId,
            isForced, // Marcar si fue forzado
          },
        });

        // Actualizar estado del item a "Cotizado"
        const cotizadoStatus = await tx.supplyItemStatusMaster.findFirst({
          where: { code: "COTIZADO" },
        });
        await tx.supplyRequestItem.update({
          where: { id: itemId },
          data: { statusId: cotizadoStatus!.id },
        });
      }

      // Auditoría
      await this.auditLogger.log({
        action: "CREATE",
        entity: "SupplyQuotation",
        entityId: quotation.id,
        userId,
        metadata: {
          folio: quotation.folio,
          supplierId: data.supplierId,
          itemCount: data.itemIds.length,
          forcedItems: unavailableItems.length,
          ...metadata,
        },
      });

      return quotation;
    });
  }

  /**
   * Rechazar cotización y liberar artículos
   */
  async rejectQuotation(
    quotationId: string,
    reason: string,
    userId: string,
    metadata?: any
  ) {
    const rejectedStatus = await this.prisma.quotationStatusMaster.findFirst({
      where: { code: 'RECHAZADA' },
    });

    return await this.prisma.$transaction(async (tx) => {
      const quotation = await tx.supplyQuotation.update({
        where: { id: quotationId },
        data: {
          statusId: rejectedStatus!.id,
          internalObservations: reason,
        },
        include: {
          supplier: true,
          status: true,
          items: true,
        },
      });

      // Liberar items volviendo a estado "Pendiente"
      const pendingStatus = await tx.supplyItemStatusMaster.findFirst({
        where: { code: "PENDIENTE" },
      });
      for (const item of quotation.items) {
        await tx.supplyRequestItem.update({
          where: { id: item.requestItemId },
          data: { statusId: pendingStatus!.id },
        });
      }

      // Auditoría
      await this.auditLogger.log({
        action: "REJECT",
        entity: "SupplyQuotation",
        entityId: quotationId,
        userId,
        metadata: {
          reason,
          liberatedItems: quotation.items.length,
          ...metadata,
        },
      });

      return quotation;
    });
  }

  /**
   * Aprobar cotización y rechazar automáticamente cotizaciones conflictivas
   */
  async approveQuotation(quotationId: string, userId: string, metadata?: any) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Obtener cotización a aprobar
      const quotation = await tx.supplyQuotation.findUniqueOrThrow({
        where: { id: quotationId },
        include: { items: true, status: true }
      });

      if (quotation.status.code !== 'RECIBIDA') {
        throw new BusinessRuleError('Solo se pueden aprobar cotizaciones en estado "Recibida"');
      }

      // 2. Identificar artículos de esta cotización
      const approvedItemIds = quotation.items.map(item => item.requestItemId);

      // 3. Buscar cotizaciones conflictivas (con al menos un artículo en común)
      const conflictingQuotations = await tx.supplyQuotation.findMany({
        where: {
          id: { not: quotationId },
          items: { some: { requestItemId: { in: approvedItemIds } } },
          status: { code: { in: ['PENDIENTE', 'ENVIADA', 'RECIBIDA'] } }
        },
        include: { items: true }
      });

      const rejectedStatus = await tx.quotationStatusMaster.findFirst({
        where: { code: 'RECHAZADA' },
      });
      const approvedStatus = await tx.quotationStatusMaster.findFirst({
        where: { code: 'APROBADA' },
      });
      const pendingItemStatus = await tx.supplyItemStatusMaster.findFirst({
        where: { code: 'PENDIENTE' },
      });

      // 4. Rechazar cotizaciones conflictivas
      for (const conflicting of conflictingQuotations) {
        await tx.supplyQuotation.update({
          where: { id: conflicting.id },
          data: {
            statusId: rejectedStatus!.id,
            internalObservations: `Rechazado automáticamente por aprobación de cotización ${quotation.folio}`
          }
        });

        // Liberar artículos ÚNICOS de la cotización rechazada
        const uniqueItems = conflicting.items.filter(
          item => !approvedItemIds.includes(item.requestItemId)
        );

        for (const uniqueItem of uniqueItems) {
          await tx.supplyRequestItem.update({
            where: { id: uniqueItem.requestItemId },
            data: { statusId: pendingItemStatus!.id }
          });
        }

        await this.auditLogger.log({
          action: 'AUTO_REJECT',
          entity: 'SupplyQuotation',
          entityId: conflicting.id,
          userId,
          metadata: {
            reason: 'Conflicto con cotización aprobada',
            approvedQuotation: quotation.folio,
            liberatedItems: uniqueItems.length
          },
        });
      }

      // 5. Aprobar cotización principal
      await tx.supplyQuotation.update({
        where: { id: quotationId },
        data: {
          statusId: approvedStatus!.id,
          approvedBy: userId,
          approvedAt: new Date(),
        }
      });

      // Actualizar items a "Aprobado"
      const approvedItemStatus = await tx.supplyItemStatusMaster.findFirst({
        where: { code: "APROBADO" },
      });
      for (const item of quotation.items) {
        await tx.supplyRequestItem.update({
          where: { id: item.requestItemId },
          data: { statusId: approvedItemStatus!.id },
        });
      }

      await this.auditLogger.log({
        action: 'APPROVE',
        entity: 'SupplyQuotation',
        entityId: quotationId,
        userId,
        metadata: {
          conflictingQuotationsRejected: conflictingQuotations.length,
          ...metadata
        },
      });

      return quotation;
    });
  }

  /**
   * Marcar cotización como "No Cotizado" (proveedor no respondió)
   */
  async markAsNotQuoted(quotationId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const notQuotedStatus = await tx.quotationStatusMaster.findFirst({
        where: { code: 'NO_COTIZADO' },
      });

      const quotation = await tx.supplyQuotation.update({
        where: { id: quotationId },
        data: {
          statusId: notQuotedStatus!.id
        },
        include: { items: true, supplier: true }
      });

      // Liberar items
      const pendingStatus = await tx.supplyItemStatusMaster.findFirst({
        where: { code: "PENDIENTE" },
      });
      for (const item of quotation.items) {
        await tx.supplyRequestItem.update({
          where: { id: item.requestItemId },
          data: { statusId: pendingStatus!.id },
        });
      }

      await this.auditLogger.log({
        action: 'MARK_NOT_QUOTED',
        entity: 'SupplyQuotation',
        entityId: quotationId,
        userId,
        metadata: {
          supplierName: quotation.supplier.fantasyName || quotation.supplier.legalName,
          liberatedItems: quotation.items.length
        },
      });

      return quotation;
    });
  }

  /**
   * Ingresar cotización manual recibida
   */
  async registerManualQuotation(
    data: ManualQuotationInput,
    userId: string,
    metadata?: any
  ) {
    const receivedStatus = await this.prisma.quotationStatusMaster.findFirst({
      where: { code: "RECIBIDA" },
    });

    return await this.prisma.$transaction(async (tx) => {
      const quotation = await tx.supplyQuotation.update({
        where: { id: data.quotationId },
        data: {
          statusId: receivedStatus!.id,
          netAmount: data.netAmount,
          iva: data.iva,
          totalAmount: data.totalAmount,
          deliveryTime: data.deliveryTime,
          paymentConditions: data.paymentConditions,
          validityDate: data.validityDate,
          supplierObservations: data.supplierObservations,
        },
        include: {
          supplier: true,
          status: true,
        },
      });

      // Actualizar precios de items
      if (data.items) {
        for (const item of data.items) {
          await tx.supplyQuotationItem.update({
            where: {
              quotationId_requestItemId: {
                quotationId: data.quotationId,
                requestItemId: item.requestItemId,
              },
            },
            data: {
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              supplierNotes: item.supplierNotes,
            },
          });
        }
      }

      // Auditoría
      await this.auditLogger.log({
        action: "REGISTER_MANUAL",
        entity: "SupplyQuotation",
        entityId: quotation.id,
        userId,
        metadata: {
          totalAmount: data.totalAmount,
          ...metadata,
        },
      });

      return quotation;
    });
  }

  /**
   * Generar folio de cotización
   */
  private async generateFolio(prefix: string, padding: number): Promise<string> {
    const lastQuotation = await this.prisma.supplyQuotation.findFirst({
      where: {
        folio: {
          startsWith: prefix,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let nextNumber = 1;
    if (lastQuotation) {
      const currentNumber = parseInt(lastQuotation.folio.replace(prefix + "-", ""));
      nextNumber = currentNumber + 1;
    }

    return `${prefix}-${String(nextNumber).padStart(padding, "0")}`;
  }

  /**
   * Obtener cotización por ID
   */
  async getById(id: string) {
    return await this.prisma.supplyQuotation.findUnique({
      where: { id },
      include: {
        request: {
          include: {
            installation: true,
            requester: true,
            creator: true,
          },
        },
        supplier: true,
        status: true,
        items: {
          include: {
            requestItem: {
              include: {
                category: true,
                unit: true,
              },
            },
          },
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }
}

export const supplyQuotationService = new SupplyQuotationService();

// Tipos auxiliares
export interface CreateQuotationInput {
  requestId: string;
  supplierId: string;
  itemIds: string[];
  internalObservations?: string;
  sendImmediately?: boolean; // TRUE para enviar al proveedor inmediatamente
  forceUnavailable?: boolean; // TRUE para forzar items ya cotizados
}

export interface ManualQuotationInput {
  quotationId: string;
  netAmount: number;
  iva: number;
  totalAmount: number;
  deliveryTime?: number;
  paymentConditions?: string;
  validityDate?: Date;
  supplierObservations?: string;
  items?: {
    requestItemId: string;
    unitPrice?: number;
    totalPrice?: number;
    supplierNotes?: string;
  }[];
}

export interface ItemAvailability {
  requestItemId: string;
  isAvailable: boolean;
  quotationCount: number;
  existingQuotations: {
    quotationFolio: string;
    supplierName: string;
    statusName: string;
    createdAt: Date;
  }[];
}

class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}
```

### 5.3. Catalog Service

**Ubicación:** `lib/services/insumos/catalog-service.ts`

```typescript
import { prisma } from "@/lib/prisma";

export class CatalogService {
  private readonly prisma = prisma;

  /**
   * Obtener todos los catálogos necesarios para formularios
   */
  async getCatalogDataForRequest() {
    const [categories, units, installations, users, suppliers, statuses] =
      await Promise.all([
        // Usar MntSupplyCategory existente
        this.prisma.mntSupplyCategory.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        }),
        this.prisma.unitMaster.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        }),
        // Usar MntInstallation existente
        this.prisma.mntInstallation.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
        }),
        this.prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, email: true },
          orderBy: { firstName: "asc" },
        }),
        // Usar MntSupplier existente
        this.prisma.mntSupplier.findMany({
          where: { isActive: true },
          orderBy: { legalName: "asc" },
        }),
        this.prisma.supplyRequestStatusMaster.findMany({
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        }),
      ]);

    return {
      categories,
      units,
      installations,
      users,
      suppliers,
      statuses,
    };
  }

  /**
   * Obtener historial de artículos para autocompletado
   */
  async getItemHistory(searchTerm: string, limit = 10) {
    const items = await this.prisma.supplyRequestItem.groupBy({
      by: ["itemName", "unitId"],
      where: {
        itemName: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      _count: {
        itemName: true,
      },
      orderBy: {
        _count: {
          itemName: "desc",
        },
      },
      take: limit,
    });

    // Enriquecer con datos de unidad
    const enriched = await Promise.all(
      items.map(async (item) => {
        const unit = await this.prisma.unitMaster.findUnique({
          where: { id: item.unitId },
        });
        return {
          itemName: item.itemName,
          unit,
          count: item._count.itemName,
        };
      })
    );

    return enriched;
  }
}

export const catalogService = new CatalogService();
```

---

## 6. Custom Hooks

### 6.1. Query Keys

**Ubicación:** `lib/hooks/query-keys.ts`

```typescript
// Agregar al archivo existente
export const insumosQueryKeys = {
  all: ["insumos"] as const,
  
  requests: {
    all: () => [...insumosQueryKeys.all, "requests"] as const,
    list: (filters: any) => [...insumosQueryKeys.requests.all(), filters] as const,
    detail: (id: string) => [...insumosQueryKeys.requests.all(), id] as const,
  },
  
  quotations: {
    all: () => [...insumosQueryKeys.all, "quotations"] as const,
    list: (requestId: string) => [...insumosQueryKeys.quotations.all(), requestId] as const,
    detail: (id: string) => [...insumosQueryKeys.quotations.all(), id] as const,
  },
  
  catalogs: {
    all: () => [...insumosQueryKeys.all, "catalogs"] as const,
    categories: () => [...insumosQueryKeys.catalogs.all(), "categories"] as const,
    units: () => [...insumosQueryKeys.catalogs.all(), "units"] as const,
    suppliers: () => [...insumosQueryKeys.catalogs.all(), "suppliers"] as const,
    itemHistory: (search: string) => [...insumosQueryKeys.catalogs.all(), "itemHistory", search] as const,
  },
};
```

### 6.2. Hook de Solicitudes

**Ubicación:** `lib/hooks/insumos/use-supply-requests.ts`

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insumosQueryKeys } from "../query-keys";
import { toast } from "sonner";

export function useSupplyRequests(filters: any) {
  return useQuery({
    queryKey: insumosQueryKeys.requests.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const res = await fetch(`/api/v1/insumos/requests?${params}`);
      if (!res.ok) throw new Error("Error al cargar solicitudes");
      return res.json();
    },
    staleTime: 30 * 1000, // 30 segundos
  });
}

export function useSupplyRequest(id: string) {
  return useQuery({
    queryKey: insumosQueryKeys.requests.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/v1/insumos/requests/${id}`);
      if (!res.ok) throw new Error("Error al cargar solicitud");
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minuto
  });
}

export function useCreateSupplyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/v1/insumos/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al crear solicitud");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insumosQueryKeys.requests.all() });
      toast.success("Solicitud creada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
```

### 6.3. Hook de Formulario de Solicitud

**Ubicación:** `lib/hooks/insumos/use-supply-request-form.ts`

```typescript
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useCallback } from "react";
import { createSupplyRequestSchema } from "@/lib/validations/insumos";

export interface UseSupplyRequestFormProps {
  catalogs: any;
  currentUser: any;
  initialData?: any;
}

export function useSupplyRequestForm({
  catalogs,
  currentUser,
  initialData,
}: UseSupplyRequestFormProps) {
  // 1. Valores por defecto
  const defaultValues = useMemo(() => {
    return {
      installationId: initialData?.installationId || "",
      requesterId: initialData?.requesterId || currentUser.id,
      requesterDescription: initialData?.requesterDescription || "",
      internalObservations: initialData?.internalObservations || "",
      items: initialData?.items || [
        {
          itemName: "",
          categoryId: "",
          quantity: 1,
          unitId: "",
          requesterDescription: "",
          internalNotes: "",
        },
      ],
    };
  }, [initialData, currentUser]);

  // 2. Inicializar formulario
  const methods = useForm({
    resolver: zodResolver(createSupplyRequestSchema),
    defaultValues,
    mode: "onChange",
  });

  // 3. Field Array para items
  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "items",
  });

  // 4. Handlers especializados
  const handleAddItem = useCallback(() => {
    append({
      itemName: "",
      categoryId: "",
      quantity: 1,
      unitId: "",
      requesterDescription: "",
      internalNotes: "",
    });
  }, [append]);

  const handleRemoveItem = useCallback(
    (index: number) => {
      if (fields.length > 1) {
        remove(index);
      }
    },
    [fields.length, remove]
  );

  const handleItemNameSelect = useCallback(
    (index: number, itemName: string, unitId: string) => {
      methods.setValue(`items.${index}.itemName`, itemName);
      methods.setValue(`items.${index}.unitId`, unitId);
    },
    [methods]
  );

  // 5. Validaciones custom
  const validateItems = useCallback(() => {
    const items = methods.getValues("items");
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName || !item.categoryId || !item.unitId || item.quantity <= 0) {
        return false;
      }
    }
    return true;
  }, [methods]);

  // 6. Retornar API del hook
  return {
    methods,
    fields,
    handlers: {
      handleAddItem,
      handleRemoveItem,
      handleItemNameSelect,
    },
    validators: {
      validateItems,
    },
    state: {
      isValid: methods.formState.isValid,
      isDirty: methods.formState.isDirty,
    },
  };
}
```

---

## 7. Componentes Visuales

### 7.1. Badges de Estado

**Ubicación:** `components/insumos/StatusBadges.tsx`

```typescript
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

interface StatusBadgeProps {
  status: {
    code: string;
    name: string;
    color: string;
    icon?: string;
  };
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const Icon = status.icon ? (Icons[status.icon as keyof typeof Icons] as LucideIcon) : null;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      className={`${sizeClasses[size]} font-medium`}
      style={{
        backgroundColor: `${status.color}20`,
        color: status.color,
        borderColor: status.color,
      }}
    >
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {status.name}
    </Badge>
  );
}
```

### 7.2. Tooltip de Folio

**Ubicación:** `components/insumos/FolioTooltip.tsx`

```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { StatusBadge } from "./StatusBadges";
import { formatDate } from "@/lib/utils/date-utils";

interface FolioTooltipProps {
  request: {
    folio: string;
    createdAt: Date;
    status: any;
    installation: { name: string };
    requester: { name: string };
    requesterDescription: string;
  };
}

export function FolioTooltip({ request }: FolioTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
            {request.folio}
            <Info className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm p-4">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Folio</p>
              <p className="font-semibold">{request.folio}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha de Creación</p>
              <p className="font-medium">{formatDate(request.createdAt, "DD-MM-YYYY HH:mm")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <StatusBadge status={request.status} size="sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Instalación</p>
              <p className="font-medium">{request.installation.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solicitante</p>
              <p className="font-medium">{request.requester.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Descripción</p>
              <p className="text-sm">{request.requesterDescription}</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### 7.3. Grilla de Items (Excel-like)

**Ubicación:** `components/insumos/ItemsGrid.tsx`

```typescript
"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { ItemNameAutocomplete } from "./ItemNameAutocomplete";
import { CategorySelect } from "./CategorySelect";
import { UnitSelect } from "./UnitSelect";

interface ItemsGridProps {
  catalogs: any;
}

export function ItemsGrid({ catalogs }: ItemsGridProps) {
  const { control, register, setValue, watch } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const handleAddRow = () => {
    append({
      itemName: "",
      categoryId: "",
      quantity: 1,
      unitId: "",
    });
  };

  const handleRemoveRow = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-slate-100 dark:bg-slate-800 font-semibold text-sm">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Artículo</div>
        <div className="col-span-3">Categoría</div>
        <div className="col-span-2">Cantidad</div>
        <div className="col-span-2">Unidad</div>
      </div>

      {/* Rows */}
      <div className="divide-y dark:divide-slate-700">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-12 gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            {/* Número */}
            <div className="col-span-1 flex items-center justify-center text-sm font-medium text-slate-600">
              {index + 1}
            </div>

            {/* Artículo (Autocompletar) */}
            <div className="col-span-4">
              <ItemNameAutocomplete
                index={index}
                onSelect={(itemName, unitId) => {
                  setValue(`items.${index}.itemName`, itemName);
                  setValue(`items.${index}.unitId`, unitId);
                }}
              />
            </div>

            {/* Categoría */}
            <div className="col-span-3">
              <CategorySelect
                {...register(`items.${index}.categoryId`)}
                categories={catalogs.categories}
              />
            </div>

            {/* Cantidad */}
            <div className="col-span-2">
              <Input
                type="number"
                min={1}
                step={0.01}
                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                className="w-full"
              />
            </div>

            {/* Unidad */}
            <div className="col-span-2 flex items-center gap-2">
              <UnitSelect
                {...register(`items.${index}.unitId`)}
                units={catalogs.units}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveRow(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer con botón agregar */}
      <div className="p-3 border-t dark:border-slate-700">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRow}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Fila
        </Button>
      </div>
    </div>
  );
}
```

### 7.4. Selector de Artículos para Cotización (`SendToQuotationDialog`)

**Ubicación:** `components/insumos/SendToQuotationDialog.tsx`

**Propósito**: Permitir seleccionar artículos de una solicitud para enviar a cotizar, con **filtrado visual automático** de artículos ya cotizados.

```typescript
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertCircle, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle as AlertCircleIcon } from "lucide-react";

interface SupplyRequestItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: { name: string; abbreviation: string };
  category: { name: string };
}

interface SendToQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  items: SupplyRequestItem[];
  supplierId: string;
  onConfirm: (selectedItemIds: string[], forceUnavailable: boolean) => void;
}

interface ItemAvailability {
  requestItemId: string;
  isAvailable: boolean;
  quotationCount: number;
  existingQuotations: {
    quotationFolio: string;
    supplierName: string;
    statusName: string;
  }[];
}

function useItemsAvailability(itemIds: string[]) {
  return useQuery<{ data: ItemAvailability[] }>({
    queryKey: ["quotations", "availability", itemIds],
    queryFn: async () => {
      const res = await fetch("/api/v1/insumos/quotations/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestItemIds: itemIds }),
      });
      if (!res.ok) throw new Error("Error al verificar disponibilidad");
      return res.json();
    },
    enabled: itemIds.length > 0,
  });
}

export function SendToQuotationDialog({
  open,
  onOpenChange,
  requestId,
  items,
  supplierId,
  onConfirm,
}: SendToQuotationDialogProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showQuoted, setShowQuoted] = useState(false); // Toggle para mostrar artículos cotizados

  const { data: availabilityData, isLoading } = useItemsAvailability(
    items.map((i) => i.id)
  );
  const availability = availabilityData?.data || [];

  // Filtrar artículos disponibles y cotizados
  const availableItems = items.filter((item) => {
    const itemAvailability = availability.find((a) => a.requestItemId === item.id);
    return itemAvailability?.isAvailable !== false;
  });

  const quotedItems = items.filter((item) => {
    const itemAvailability = availability.find((a) => a.requestItemId === item.id);
    return itemAvailability?.isAvailable === false;
  });

  // Reset selección al cerrar/abrir
  useEffect(() => {
    if (!open) {
      setSelectedItems([]);
      setShowQuoted(false);
    }
  }, [open]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(availableItems.map((i) => i.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleToggleItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  const hasForced = quotedItems.some((item) => selectedItems.includes(item.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar Artículos para Cotizar</DialogTitle>
          <DialogDescription>
            Seleccione los artículos que desea enviar a cotización con este proveedor.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex  items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Badge con contador de artículos cotizados */}
            {quotedItems.length > 0 && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <AlertCircleIcon className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {quotedItems.length} artículo(s) ya cotizado(s) (ocultos por defecto)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuoted(!showQuoted)}
                  className="shrink-0"
                >
                  {showQuoted ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Mostrar Cotizados
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Tabla de artículos disponibles */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Artículos Disponibles ({availableItems.length})
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            availableItems.length > 0 &&
                            selectedItems.length >=availableItems.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Insumo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Unidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No hay artículos disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      availableItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={(checked) =>
                                handleToggleItem(item.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.category.name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell>{item.unit.abbreviation}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Tabla de artículos cotizados (condicional) */}
            {showQuoted && quotedItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Artículos Ya Cotizados ({quotedItems.length})
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox disabled />
                        </TableHead>
                        <TableHead>Insumo</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Cotizaciones Activas</TableHead>
                        <TableHead>Forzar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotedItems.map((item) => {
                        const itemAvailability = availability.find(
                          (a) => a.requestItemId === item.id
                        );
                        const isSelected = selectedItems.includes(item.id);

                        return (
                          <TableRow
                            key={item.id}
                            className="opacity-50 bg-slate-50 dark:bg-slate-900/50"
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) =>
                                  handleToggleItem(item.id, checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell className="line-through font-medium">
                              {item.itemName}
                            </TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-amber-700 border-amber-700">
                                {itemAvailability?.quotationCount} cotización(es)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isSelected && (
                                <Badge variant="destructive" className="text-xs">
                                  ⚠️ Forzado
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Alert de advertencia */}
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Advertencia</AlertTitle>
                  <AlertDescription>
                    Los artículos marcados como "Forzado" ya están en otras cotizaciones activas.
                    Incluirlos puede generar conflictos al aprobar. Si se aprueba otra cotización
                    con estos artículos primero, esta cotización será rechazada automáticamente.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(selectedItems, hasForced);
              onOpenChange(false);
            }}
            disabled={selectedItems.length === 0 || isLoading}
            className="bg-[#283c7f] hover:bg-[#1e2f5f] text-white"
          >
            Enviar a Cotización ({selectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Características Clave**:
- ✅ **Ocultar por defecto**: Artículos cotizados están ocultos inicialmente
- ✅ **Botón toggle**: Muestra/Oculta artículos cotizados con icono 👁️
- ✅ **Indicador visual**: Badge con contador de cotizaciones activas
- ✅ **Tachado y opacidad**: Los artículos cotizados tienen `line-through` y `opacity-50`
- ✅ **Advertencia de forzado**: Badge rojo con ⚠️ cuando se selecciona un artículo cotizado
- ✅ **Alert descriptivo**: Explica las consecuencias de forzar artículos ya cotizados
- ✅ **Query en tiempo real**: Usa React Query para verificar disponibilidad antes de mostrar
- ✅ **Sin restricción de roles**: Cualquier usuario con permiso "Gestiona Cotizaciones" puede forzar

---

## 8. API Routes

### 8.1. GET - Listar Solicitudes

**Ubicación:** `app/api/v1/insumos/requests/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session-server";
import { supplyRequestService } from "@/lib/services/insumos/supply-request-service";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filters = {
      statusId: searchParams.get("statusId") || undefined,
      installationId: searchParams.get("installationId") || undefined,
      folio: searchParams.get("folio") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      skip: parseInt(searchParams.get("skip") || "0"),
      take: parseInt(searchParams.get("take") || "20"),
    };

    const result = await supplyRequestService.list(filters);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error en GET /api/v1/insumos/requests:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener solicitudes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const request = await supplyRequestService.create(body, session.user.id, {
      ip: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/v1/insumos/requests:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear solicitud" },
      { status: 500 }
    );
  }
}
```

### 8.2. GET - Detalle de Solicitud

**Ubicación:** `app/api/v1/insumos/requests/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session-server";
import { supplyRequestService } from "@/lib/services/insumos/supply-request-service";

interface RouteContext {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const request = await supplyRequestService.getById(params.id);
    if (!request) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error: any) {
    console.error(`Error en GET /api/v1/insumos/requests/${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || "Error al obtener solicitud" },
      { status: 500 }
    );
  }
}
```

### 8.3. POST - Crear Cotización

**Ubicación:** `app/api/v1/insumos/quotations/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session-server";
import { supplyQuotationService } from "@/lib/services/insumos/supply-quotation-service";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos
    const hasPermission = await modulePermissionService.userHasPermission(
      session.user.id,
      "insumos",
      "gestiona_cotizaciones"
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "No tiene permisos para gestionar cotizaciones" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const quotation = await supplyQuotationService.createQuotation(
      body,
      session.user.id,
      {
        ip: req.headers.get("x-forwarded-for") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      }
    );

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    console.error("Error en POST /api/v1/insumos/quotations:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear cotización" },
      { status: 500 }
    );
  }
}
```

### 8.4. POST - Verificar Disponibilidad de Artículos

**Ubicación:** `app/api/v1/insumos/quotations/check-availability/route.ts`

**Propósito**: Endpoint consumido en tiempo real por el componente `SendToQuotationDialog` para verificar qué artículos ya están cotizados antes de crear una nueva cotización.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session-server";
import { supplyQuotationService } from "@/lib/services/insumos/supply-quotation-service";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { requestItemIds } = await req.json();

    if (!requestItemIds || !Array.isArray(requestItemIds)) {
      return NextResponse.json(
        { error: "requestItemIds debe ser un array" },
        { status: 400 }
      );
    }

    const availability = await supplyQuotationService.checkItemsAvailability(requestItemIds);

    return NextResponse.json({ data: availability });
  } catch (error: any) {
    console.error("Error en POST /api/v1/insumos/quotations/check-availability:", error);
    return NextResponse.json(
      { error: error.message || "Error al verificar disponibilidad" },
      { status: 500 }
    );
  }
}
```

**Respuesta Ejemplo**:
```json
{
  "data": [
    {
      "requestItemId": "uuid-1",
      "isAvailable": true,
      "quotationCount": 0,
      "existingQuotations": []
    },
    {
      "requestItemId":"uuid-2",
      "isAvailable": false,
      "quotationCount": 2,
      "existingQuotations": [
        {
          "quotationFolio": "COT-0001",
          "supplierName": "Proveedor A",
          "statusName": "Enviada",
          "createdAt": "2026-02-15T10:00:00Z"
        },
        {
          "quotationFolio": "COT-0002",
          "supplierName": "Proveedor B",
          "statusName": "Recibida",
          "createdAt": "2026-02-20T14:30:00Z"
        }
      ]
    }
  ]
}
```

### 8.5. POST - Aprobar Cotización

**Ubicación:** `app/api/v1/insumos/quotations/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session-server";
import { supplyQuotationService } from "@/lib/services/insumos/supply-quotation-service";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar permisos (requiere "aprueba_cotizaciones")
    const hasPermission = await modulePermissionService.userHasPermission(
      session.user.id,
      "insumos",
      "aprueba_cotizaciones"
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "No tiene permisos para aprobar cotizaciones" },
        { status: 403 }
      );
    }

    const quotation = await supplyQuotationService.approveQuotation(
      params.id,
      session.user.id,
      {
        ip: req.headers.get("x-forwarded-for") || "unknown",
      }
    );

    return NextResponse.json(quotation);
  } catch (error: any) {
    console.error(`Error en POST /api/v1/insumos/quotations/${params.id}/approve:`, error);
    return NextResponse.json(
      { error: error.message || "Error al aprobar cotización" },
      { status: 500 }
    );
  }
}
```

### 8.6. POST - Rechazar Cotización

**Ubicación:** `app/api/v1/insumos/quotations/[id]/reject/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session-server";
import { supplyQuotationService } from "@/lib/services/insumos/supply-quotation-service";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const hasPermission = await modulePermissionService.userHasPermission(
      session.user.id,
      "insumos",
      "aprueba_cotizaciones"
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "No tiene permisos para rechazar cotizaciones" },
        { status: 403 }
      );
    }

    const { reason } = await req.json();

    const quotation = await supplyQuotationService.rejectQuotation(
      params.id,
      reason || "Sin motivo especificado",
      session.user.id
    );

    return NextResponse.json(quotation);
  } catch (error: any) {
    console.error(`Error en POST /api/v1/insumos/quotations/${params.id}/reject:`, error);
    return NextResponse.json(
      { error: error.message || "Error al rechazar cotización" },
      { status: 500 }
    );
  }
}
```

### 8.7. PATCH - Marcar como "No Cotizado"

**Ubicación:** `app/api/v1/insumos/quotations/[id]/mark-not-quoted/route.ts`

**Propósito**: Cambiar el estado a "No Cotizado" cuando el proveedor no responde, liberando los artículos sin eliminar el registro histórico.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session-server";
import { supplyQuotationService } from "@/lib/services/insumos/supply-quotation-service";
import { modulePermissionService } from "@/lib/services/permissions/module-permission-service";

interface RouteContext {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const hasPermission = await modulePermissionService.userHasPermission(
      session.user.id,
      "insumos",
      "gestiona_cotizaciones"
    );

    if (!hasPermission) {
      return NextResponse.json(
        { error: "No tiene permisos para gestionar cotizaciones" },
        { status: 403 }
      );
    }

    const quotation = await supplyQuotationService.markAsNotQuoted(
      params.id,
      session.user.id
    );

    return NextResponse.json(quotation);
  } catch (error: any) {
    console.error(`Error en PATCH /api/v1/insumos/quotations/${params.id}/mark-not-quoted:`, error);
    return NextResponse.json(
      { error: error.message || "Error al marcar como no cotizado" },
      { status: 500 }
    );
  }
}
```

---

## 9. Sistema de Reportes

### 9.1. Reporte de Solicitud (PDF)

**Ubicación:** `lib/reports/modules/insumos/supply-request-report.ts`

```typescript
import { SupplyRequestService } from "@/lib/services/insumos/supply-request-service";
import { formatDate } from "@/lib/utils/date-utils";
import { formatCurrency } from "@/lib/utils/chile-utils";

export async function generateSupplyRequestPDF(requestId: string) {
  // Implementación usando el motor de PDF existente
  // Similar a los reportes de Actividades y Mantención
  
  const supplyRequestService = new SupplyRequestService();
  const request = await supplyRequestService.getById(requestId);
  
  if (!request) {
    throw new Error("Solicitud no encontrada");
  }

  // Estructura del PDF:
  // 1. Header con logos y folio
  // 2. Datos generales (Instalación, Solicitante, Fecha, Estado)
  // 3. Tabla de ítems
  // 4. Tabla de cotizaciones (si existen)
  // 5. Footer con firma y observaciones

  // Retornar buffer del PDF
  return pdfBuffer;
}
```

### 9.2. Reporte de Cotización (PDF)

**Ubicación:** `lib/reports/modules/insumos/supply-quotation-report.ts`

```typescript
export async function generateQuotationPDF(quotationId: string) {
  // Similar estructura que Supply Request PDF
  // Incluir:
  // - Datos del proveedor
  // - Items cotizados con precios
  // - Condiciones de pago y entrega
  // - Vigencia de la cotización
}
```

### 9.3. Reporte Excel

**Ubicación:** `lib/reports/modules/insumos/supply-request-excel.ts`

```typescript
import { ExcelEngine } from "@/lib/reports/core/excel-engine";

export async function generateSupplyRequestExcel(filters: any) {
  const engine = new ExcelEngine();
  
  // Columnas
  const columns = [
    { header: "Folio", key: "folio", width: 15 },
    { header: "Estado", key: "status", width: 15 },
    { header: "Instalación", key: "installation", width: 25 },
    { header: "Solicitante", key: "requester", width: 25 },
    { header: "Fecha", key: "date", width: 15 },
    { header: "Items", key: "itemCount", width: 10 },
    { header: "Cotizaciones", key: "quotationCount", width: 12 },
  ];

  // Datos (consultar desde servicio)
  // ...

  return engine.generate(data, columns, "Solicitudes de Insumos");
}
```

---

## 10. Lógica de Gestión de Cotizaciones (Resumen Ejecutivo)

Esta sección documenta las **reglas de negocio críticas** para la gestión de cotizaciones de insumos, basadas en los requisitos del cliente.

### 10.1. Flujo de Estados de Cotización

```
[Pending] --enviar--> [Sent] --respuesta--> [Received] --aprobar--> [Approved] ✅
     |                      |                        |                      
     +--rechazar------------|------------------------+--rechazar--> [Rejected] ❌
                            |
                            +--no responde--> [Not Quoted] 📋
```

**Aclaraciones**:
- Una cotización en estado **"Sent"** NO puede eliminarse (solo cambiar a "Not Quoted")
- Una cotización **"Approved"** es inmutable (sus artículos ya no están disponibles)
- Una cotización **"Rejected"** libera todos sus artículos automáticamente

### 10.2. Disponibilidad de Artículos

#### Regla 1: Liberación al Rechazar
✅ **SÍ**: Al rechazar manualmente una cotización, todos sus artículos vuelven a estar disponibles para cotizar.

```typescript
// Ejemplo:
Cotización A (Rechazada): Artículos [1, 2, 3] → Liberados ✅
// Ahora puedo crear:
Cotización B: Artículos [1, 2] ✅
Cotización C: Artículos [3] ✅
```

#### Regla 2: Sin Límite de Cotizaciones Simultáneas
✅ **NO HAY LÍMITE**: Un mismo artículo puede estar en múltiples cotizaciones activas simultáneamente.

```typescript
// Ejemplo válido:
Cotización A (Sent): Artículo 2
Cotización B (Sent): Artículo 2
Cotización C (Received): Artículo 2
// Total: 3 cotizaciones del mismo artículo ✅
```

#### Regla 3: Forzado con Advertencia Visual
✅ **PERMITIDO CON ADVERTENCIA**: Al crear una cotización, los artículos ya cotizados deben:
- Estar **ocultos por defecto** (no aparecer en la lista inicial)
- Mostrarse al hacer clic en botón "Mostrar Cotizados" (con icono 👁️)
- Aparecer **tachados** y con **opacidad reducida**
- Mostrar un **badge con el contador** de cotizaciones activas
- Si se seleccionan, mostrar badge rojo **"⚠️ Forzado"**
- Setear `isForced = true` en la base de datos

**Propósito**: Evitar confusión del cliente sobre por qué hay menos artículos en el listado.

### 10.3. Aprobación y Rechazo Automático

#### Regla 4: Rechazo Automático en Cascada
✅ **AUTOMÁTICO**: Al aprobar una cotización, todas las cotizaciones activas con artículos en común se rechazan automáticamente.

```typescript
// Escenario:
Solicitud: 5 artículos [1, 2, 3, 4, 5]

// Cotizaciones:
Cotización A (Proveedor X): Artículos [2, 3, 4, 5]
Cotización B (Proveedor Y): Artículos [1, 2]       // Artículo 2 en común
Cotización C (Proveedor Z): Artículos [3, 4]       // Artículos 3,4 en común

// Al aprobar Cotización A:
✅ Cotización A → Aprobada (artículos 2,3,4,5 asignados)
❌ Cotización B → Rechazada AUTOMÁTICAMENTE (por conflicto en artículo 2)
❌ Cotización C → Rechazada AUTOMÁTICAMENTE (por conflicto en artículos 3,4)

// Artículos liberados:
🔓 Artículo 1 (de Cotización B) → LIBERADO ✅
// Ahora puedo crear:
Cotización D (Proveedor W): Artículo [1] ✅
```

**Lógica**:
1. Identificar artículos de cotización aprobada: `[2, 3, 4, 5]`
2. Buscar cotizaciones activas con al menos uno de esos artículos
3. Rechazar esas cotizaciones con motivo: `"Rechazado automáticamente por aprobación de cotización A"`
4. Los artículos **únicos** de esas cotizaciones rechazadas quedan **liberados**

#### Regla 5: Prohibición de Aprobación Parcial
❌ **PROHIBIDO**: No se puede aprobar/rechazar artículos individuales de una cotización.

```typescript
// ❌ NO PERMITIDO:
Cotización A: Artículos [2, 3, 4]
Acción: "Aprobar solo artículo 2, rechazar 3 y 4" ❌

// ✅ CORRECTO:
Acción: "Aprobar toda la Cotización A" (todos sus artículos)
Acción: "Rechazar toda la Cotización A" (todos sus artículos)
```

**Razón**: Evitar que se modifiquen los valores originales de la cotización del proveedor.

**Aprobación Parcial VÁLIDA** (entre cotizaciones):
```typescript
// Escenario:
Cotización A: Artículos [1, 2, 3]
Cotización B: Artículos [4, 5]

// ✅ VÁLIDO:
Aprobar Cotización A (artículos 1,2,3) ✅
Rechazar Cotización B (artículos 4,5) ❌
// No hay conflicto porque no comparten artículos
```

### 10.4. Estado "Not Quoted"

✅ **PROPÓSITO**: Registrar proveedores que no respondieron en el plazo, sin eliminar el historial.

```typescript
// Flujo:
Cotización A (Sent el 01/03/2026)
  ↓ (pasan 5 días, proveedor no responde)
Usuario: Click en "Marcar como No Cotizado"
  ↓
Cotización A → Estado: "Not Quoted" 📋
Artículos de Cotización A → LIBERADOS ✅
```

**Diferencia con Eliminación**:
- ❌ **Eliminar**: Borra el registro (no recomendado post-envío)
- ✅ **Not Quoted**: Mantiene el registro para auditoría, pero libera artículos

### 10.5. Casos de Uso Prácticos

#### Caso 1: Cotización Simple sin Conflictos
```typescript
Solicitud: 3 artículos [A, B, C]

Acciones:
1. Crear Cotización 1 (Proveedor X): [A, B] → Sent
2. Proveedor X responde → Received
3. Aprobar Cotización 1 → ✅ Approved
4. Artículo C queda libre → Crear Cotización 2 (Proveedor Y): [C]
```

#### Caso 2: Múltiples Cotizaciones con Conflicto
```typescript
Solicitud: 5 artículos [1, 2, 3, 4, 5]

Acciones:
1. Crear Cotización A (Proveedor X): [1, 2, 3] → Sent
2. Crear Cotización B (Proveedor Y): [2, 3, 4] → Sent (⚠️ 2 artículos forzados)
3. Crear Cotización C (Proveedor Z): [4, 5] → Sent (⚠️ 1 artículo forzado)
4. Proveedor Y responde → Cotización B: Received
5. Aprobar Cotización B:
   ✅ Cotización B → Approved (artículos 2,3,4)
   ❌ Cotización A → Rejected AUTO (por conflicto en 2,3)
   ❌ Cotización C → Rejected AUTO (por conflicto en 4)
   🔓 Artículo 1 (de A) → LIBERADO
   🔓 Artículo 5 (de C) → LIBERADO
6. Crear Cotización D (Proveedor W): [1, 5] ✅
```

#### Caso 3: Proveedor No Responde
```typescript
Solicitud: 2 artículos [X, Y]

Acciones:
1. Crear Cotización A (Proveedor X): [X, Y] → Sent (01/03)
2. Esperar 5 días...
3. Proveedor X no responde → Marcar como "Not Quoted" 📋
4. Artículos X, Y → LIBERADOS ✅
5. Crear Cotización B (Proveedor Z): [X, Y] → Nueva oportunidad
```

### 10.6. Validaciones en Service Layer

```typescript
// Validaciones críticas en QuotationService:

✅ checkItemsAvailability() - Verificar disponibilidad en tiempo real
✅ create() - Validar y marcar items forzados (isForced = true)
✅ reject() - Liberar artículos al rechazar
✅ approve() - Ejecutar rechazo automático de conflictos
✅ markAsNotQuoted() - Cambiar estado sin eliminar registro
❌ delete() - NO permitir eliminación post-envío
❌ partialApprove() - NO permitir aprobación de items individuales
```

### 10.7. Flujo de UI para Crear Cotización

```
Usuario: Click en "Enviar a Cotización"
  ↓
Abrir Dialog "SendToQuotationDialog"
  ↓
Cargar availability de artículos (API call)
  ↓
Mostrar artículos DISPONIBLES (sin cotizar) ✅
Ocultar artículos COTIZADOS 🙈
  ↓
Mostrar badge: "3 artículos ya cotizados (ocultos)"
  ↓
Usuario: Click en botón "Mostrar Cotizados" 👁️
  ↓
Mostrar tabla adicional con artículos cotizados:
  - Tachados (line-through)
  - Opacidad 50%
  - Badge con contador: "2 cotizaciones activas"
  - Checkbox habilitado (para forzar)
  ↓
Usuario: Selecciona artículo cotizado
  ↓
Mostrar badge rojo "⚠️ Forzado"
Mostrar Alert: "Este artículo ya está en otras cotizaciones"
  ↓
Usuario: Confirmar
  ↓
API: POST /quotations con { items, forceUnavailable: true }
  ↓
Service: Marcar items con isForced = true
  ↓
Éxito: Cotización creada ✅
```

---

## 11. Mapeo de Modelos Existentes

### 11.1. MntSupplier → Proveedor en Cotizaciones

**Campos utilizados del modelo existente:**

```typescript
// Modelo: MntSupplier (tabla: mnt_suppliers)
interface SupplierMapping {
  id: string;                    // ID único UUID
  rut: string;                   // RUT del proveedor (único)
  businessLine: string;          // Giro comercial
  legalName: string;             // Razón social (para documentos legales)
  fantasyName: string | null;    // Nombre de fantasía (para UI)
  contactName: string | null;    // Nombre del contacto principal
  phone: string | null;          // Teléfono de contacto
  contactEmail: string | null;   // Email para envío de cotizaciones
  activityEmails: Json | null;   // Emails adicionales (JSON array)
  address: string | null;        // Dirección física
  isActive: boolean;             // Estado activo/inactivo
}

// Uso en SupplyQuotation
const supplier = await prisma.mntSupplier.findUnique({
  where: { id: quotation.supplierId }
});

// Display en UI
<div>
  <h3>{supplier.fantasyName || supplier.legalName}</h3>
  <p>RUT: {formatRUT(supplier.rut)}</p>
  <p>Contacto: {supplier.contactName}</p>
  <p>Email: {supplier.contactEmail}</p>
</div>
```

**API para obtener proveedores:**
- Endpoint existente: `GET /api/v1/mantencion/suppliers`
- Se debe crear alias: `GET /api/v1/insumos/suppliers` (proxy al endpoint de mantención)

---

### 11.2. MntSupplyCategory → Categoría de Items

**Campos utilizados del modelo existente:**

```typescript
// Modelo: MntSupplyCategory (tabla: mnt_supply_categories)
interface CategoryMapping {
  id: string;               // ID único UUID
  name: string;             // Nombre único de la categoría
  description: string | null; // Descripción
  isActive: boolean;        // Estado activo/inactivo
}

// Relación: SupplyRequestItem.categoryId → MntSupplyCategory.id

// Uso en formularios
const categories = await prisma.mntSupplyCategory.findMany({
  where: { isActive: true },
  orderBy: { name: "asc" }
});

// Display en Select
<Select>
  {categories.map(cat => (
    <SelectItem key={cat.id} value={cat.id}>
      {cat.name}
    </SelectItem>
  ))}
</Select>
```

**Categorías a agregar en seed (ampliar seed-mantencion.ts):**
- ✅ Repuestos (existente)
- ✅ Herramientas (existente)
- ✅ Consumibles (existente)
- ➕ Insumos y Materiales
- ➕ Víveres
- ➕ Elementos de Protección Personal
- ➕ Artículos de Limpieza
- ➕ Útiles de Oficina
- ➕ Equipos

---

### 11.3. MntInstallation → Instalación en Solicitud

**Campos utilizados del modelo existente:**

```typescript
// Modelo: MntInstallation (tabla: mnt_installations)
interface InstallationMapping {
  id: string;                    // ID único UUID
  name: string;                  // Nombre de la instalación
  folio: string | null;          // Folio interno
  internalCode: string | null;   // Código interno
  installationType: string | null; // Tipo de instalación
  latitude: number | null;       // Coordenada geográfica
  longitude: number | null;      // Coordenada geográfica
  farmingCenterId: string | null; // ID del centro de cultivo
  description: string | null;    // Descripción
  observations: string | null;   // Observaciones
  isActive: boolean;             // Estado activo/inactivo
}

// Relación: SupplyRequest.installationId → MntInstallation.id

// Uso en formularios
const installations = await prisma.mntInstallation.findMany({
  where: { isActive: true },
  include: { farmingCenter: true },
  orderBy: { name: "asc" }
});

// Display en Select con información extendida
<Select>
  {installations.map(inst => (
    <SelectItem key={inst.id} value={inst.id}>
      {inst.name} {inst.folio ? `(${inst.folio})` : ''}
    </SelectItem>
  ))}
</Select>
```

**API para obtener instalaciones:**
- Endpoint existente: `GET /api/v1/mantencion/installations`
- Se debe crear alias: `GET /api/v1/insumos/installations` (proxy al endpoint de mantención)

---

### 11.4. User → Solicitante y Aprobadores

**Campos utilizados del modelo existente:**

```typescript
// Modelo: User (tabla: users)
interface UserMapping {
  id: string;              // ID único UUID
  firstName: string;       // Nombre
  lastName: string;        // Apellido
  email: string;           // Email único
  rut: string | null;      // RUT chileno
  phone: string | null;    // Teléfono
  isActive: boolean;       // Estado activo/inactivo
}

// Relaciones múltiples en SupplyRequest:
// - SupplyRequest.requesterId → User.id (Solicitante)
// - SupplyRequest.createdBy → User.id (Creador)
// - SupplyQuotation.createdBy → User.id (Creador cotización)
// - SupplyQuotation.approvedBy → User.id (Aprobador)

// Display de nombre completo
const fullName = `${user.firstName} ${user.lastName}`;

// Uso en selects (solo usuarios activos)
const users = await prisma.user.findMany({
  where: { isActive: true },
  select: { id: true, firstName: true, lastName: true, email: true },
  orderBy: { firstName: "asc" }
});
```

---

## 12. Endpoints de Alias (API Proxies)

Para mantener la consistencia y evitar duplicación, se deben crear endpoints alias que redirijan a los endpoints existentes de mantención:

**Ubicación:** `app/api/v1/insumos/catalogs/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session-server";
import { catalogService } from "@/lib/services/insumos/catalog-service";

/**
 * GET /api/v1/insumos/catalogs
 * Obtiene todos los catálogos necesarios para formularios de insumos
 * (Reutiliza: MntSupplier, MntSupplyCategory, MntInstallation)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const catalogs = await catalogService.getCatalogDataForRequest();

    return NextResponse.json(catalogs);
  } catch (error: any) {
    console.error("Error en GET /api/v1/insumos/catalogs:", error);
    return NextResponse.json(
      { error: error.message || "Error al obtener catálogos" },
      { status: 500 }
    );
  }
}
```

**Beneficio:** Un solo endpoint que retorna todos los catálogos necesarios, abstrayendo el origen de los datos (mantención vs. insumos).

---

## 10. Plan de Implementación por Sprints

### Sprint 1: Fundamentos (1 semana)

**Objetivo:** Configuración de base de datos, permisos y seeds

- [ ] Migración Prisma con modelos nuevos (UnitMaster, SupplyRequest, etc.)
- [ ] **Ampliar seed de categorías** en `seed-mantencion.ts` (MntSupplyCategory)
- [ ] Seed de unidades de medida (UnitMaster)
- [ ] Seeds de estados (Solicitud, Items, Cotizaciones)
- [ ] Configuración en `app_setting`
- [ ] Archivo fallback de configuración
- [ ] Service Layer: `SupplyRequestService` básico
- [ ] Service Layer: `CatalogService`
- [ ] Testing de seeds
- [ ] **Verificar CRUD de Proveedores** en `/mantencion/configuracion/proveedores`
- [ ] **Verificar CRUD de Instalaciones** en `/mantencion/configuracion/instalaciones`

### Sprint 2: Crear Solicitud (1.5 semanas)

**Objetivo:** Formulario de creación completo

- [ ] Estructura de rutas `/insumos/crear`
- [ ] Custom Hook: `useSupplyRequestForm`
- [ ] Componente `ItemsGrid` (Excel-like)
- [ ] Componente `ItemNameAutocomplete`
- [ ] Componente `CreateRequestClient` (móvil)
- [ ] Componente `CreateRequestDesktop`
- [ ] Server Actions para crear solicitud
- [ ] API Route: `POST /api/v1/insumos/requests`
- [ ] Validaciones con Zod
- [ ] Testing de creación

### Sprint 3: Bandeja de Solicitudes (1 semana)

**Objetivo:** Listado con filtros y acciones

- [ ] Estructura de rutas `/insumos/solicitudes`
- [ ] Custom Hook: `useSupplyRequests`
- [ ] Componente `RequestsTable`
- [ ] Definición de columnas con sorting
- [ ] Componente `RequestFilters`
- [ ] Componente `FolioTooltip`
- [ ] Componente `ItemsTooltip`
- [ ] Componente `StatusBadge`
- [ ] API Route: `GET /api/v1/insumos/requests`
- [ ] Prefetching de solicitudes

### Sprint 4: Detalle de Solicitud (1.5 semanas)

**Objetivo:** Vista completa con tabs

- [ ] Estructura de rutas `/insumos/[id]`
- [ ] Componente `RequestDetailClient` (móvil)
- [ ] Componente `RequestDetailDesktop`
- [ ] Componente `ItemsTab`
- [ ] Componente `QuotationsTab`
- [ ] Componente `HistoryTab`
- [ ] API Route: `GET /api/v1/insumos/requests/[id]`
- [ ] Integración con AuditLog
- [ ] Testing de navegación

### Sprint 5: Gestión de Cotizaciones (2 semanas)

**Objetivo:** Flujo completo de cotizaciones

- [ ] Service Layer: `SupplyQuotationService`
- [ ] Componente `SendToQuotationDialog`
- [ ] Componente `QuotationDetailDialog`
- [ ] Componente `SendEmailDialog`
- [ ] Componente `ManualQuotationDialog`
- [ ] API Route: `POST /api/v1/insumos/quotations`
- [ ] API Route: `PATCH /api/v1/insumos/quotations/[id]`
- [ ] Flujo de envío de email a proveedores
- [ ] Registro manual de cotizaciones
- [ ] Upload de adjuntos

### Sprint 6: Aprobaciones (1 semana)

**Objetivo:** Flujo de aprobaciones con permisos

- [ ] Verificación de permisos por acción
- [ ] Botones de aprobar/rechazar en QuotationsTab
- [ ] Componente `ApprovalDialog` con observaciones
- [ ] API Route: `PATCH /api/v1/insumos/quotations/[id]/approve`
- [ ] API Route: `PATCH /api/v1/insumos/quotations/[id]/reject`
- [ ] Actualización automática de estados de items
- [ ] Notificaciones por email según permisos
- [ ] Testing de aprobaciones

### Sprint 7: Mantenedor de Unidades (3 días)

**Objetivo:** CRUD único de Unidades de Medida

> **⚠️ IMPORTANTE:** Los mantenedores de Proveedores, Categorías e Instalaciones YA EXISTEN.
> 
> - **Proveedores:** Usar `/mantencion/configuracion/proveedores`
> - **Categorías:** Ampliar seed de `MntSupplyCategory`
> - **Instalaciones:** Usar `/mantencion/configuracion/instalaciones`

> **📁 CONVENCIÓN DE UBICACIÓN (AGENTS.md)**:
> - **Mantenedores Globales** (reutilizables entre módulos): `/mantenedores/` ← **Unidades va aquí**
> - **Mantenedores Específicos** (solo para un módulo): `/[modulo]/configuracion/`

- [ ] Mantenedor de Unidades (`/mantenedores/unidades`)
- [ ] Componente `UnitsTable` con sorting
- [ ] Componente `UnitForm` (código, nombre, abreviación, categoría)
- [ ] API Routes: `GET/POST /api/v1/insumos/units`
- [ ] API Route: `GET/PATCH/DELETE /api/v1/insumos/units/[id]`
- [ ] Patrón `BaseMaintainer` aplicado
- [ ] Validación de códigos duplicados

### Sprint 8: Reportes y Optimizaciones (1 semana)

**Objetivo:** Reportes y refinamiento

- [ ] Reporte PDF de Solicitud
- [ ] Reporte PDF de Cotización
- [ ] Reporte Excel de Solicitudes
- [ ] Reporte Excel de Cotizaciones
- [ ] Optimización de queries (índices)
- [ ] Testing de performance
- [ ] Refinamiento de UI/UX
- [ ] Documentación de usuario

---

## Resumen Ejecutivo

### Tabla de Códigos de Estados (MAYÚSCULAS)

> **📌 CONVENCIÓN DEL PROYECTO:** Siguiendo el patrón del módulo de Actividades, todos los códigos de estados maestros utilizan **MAYÚSCULAS** (ej: `PEN`, `APROB`, `RECH`).

#### Estados de Solicitud (`SupplyRequestStatusMaster`)

| Código | Nombre | Descripción | Color | Icono |
|--------|--------|-------------|-------|-------|
| `PENDIENTE` | Pendiente | Solicitud creada, pendiente de gestión | #f59e0b | Clock |
| `EN_PROCESO` | En Proceso | Solicitud en proceso de cotización | #3b82f6 | RefreshCw |
| `APROBADA` | Aprobada | Solicitud aprobada | #10b981 | CheckCircle |
| `RECHAZADA` | Rechazada | Solicitud rechazada | #ef4444 | XCircle |
| `ANULADA` | Anulada | Solicitud anulada | #6b7280 | Ban |
| `FINALIZADA` | Finalizada | Solicitud finalizada con entrega completa | #8b5cf6 | CheckCheck |

#### Estados de Items (`SupplyItemStatusMaster`)

| Código | Nombre | Descripción | Color | Icono |
|--------|--------|-------------|-------|-------|
| `PENDIENTE` | Pendiente | Item pendiente de cotización | #f59e0b | Clock |
| `COTIZADO` | Cotizado | Item enviado a cotización | #3b82f6 | FileText |
| `AUTORIZADO` | Autorizado | Item autorizado para compra | #8b5cf6 | ShieldCheck |
| `APROBADO` | Aprobado | Item aprobado | #10b981 | CheckCircle |
| `RECHAZADO` | Rechazado | Item rechazado | #ef4444 | XCircle |
| `ENTREGADO` | Entregado | Item entregado | #059669 | PackageCheck |
| `NO_DISPONIBLE` | No Disponible | Item no disponible en el mercado | #6b7280 | PackageX |

#### Estados de Cotización (`QuotationStatusMaster`)

| Código | Nombre | Descripción | Color | Icono |
|--------|--------|-------------|-------|-------|
| `PENDIENTE` | Pendiente | Cotización creada pero no enviada | #9ca3af | Clock |
| `ENVIADA` | Enviada | Cotización enviada al proveedor, esperando respuesta | #3b82f6 | Send |
| `RECIBIDA` | Recibida | Proveedor ha respondido con precios | #f59e0b | Mail |
| `NO_COTIZADO` | No Cotizado | Proveedor no respondió en el plazo establecido | #6b7280 | CalendarX |
| `APROBADA` | Aprobada | Cotización aprobada, artículos bloqueados | #10b981 | CheckCircle |
| `RECHAZADA` | Rechazada | Rechazada manualmente o por aprobación de otra | #ef4444 | XCircle |

---

### Auditoría de Mantenedores Existentes

Durante el análisis del proyecto, se identificaron los siguientes recursos **REUTILIZABLES**:

| Recurso | Modelo Prisma | Estado | Ubicación CRUD | Acción |
|---------|---------------|--------|----------------|--------|
| Proveedores | `MntSupplier` | ✅ Implementado | `/mantencion/configuracion/proveedores` | **Reutilizar** |
| Categorías | `MntSupplyCategory` | ✅ Parcial (3 categorías) | Seed en `seed-mantencion.ts` | **Ampliar seed** |
| Instalaciones | `MntInstallation` | ✅ Implementado | `/mantencion/configuracion/instalaciones` | **Reutilizar** |
| Unidades de Medida | - | ❌ No existe | - | **Crear desde cero** |

**Impacto en el desarrollo:**
- ✅ **Reducción de 2 semanas** en Sprint 7 (Mantenedores)
- ✅ **Consistencia** con módulos existentes (Mantención)
- ✅ **Datos compartidos** entre Solicitud de Insumos y Órdenes de Trabajo
- ✅ **Menos duplicación** de código y datos maestros

---

### Métricas del Módulo

- **Modelos Prisma Nuevos:** 7 (reutiliza 3 existentes: MntSupplier, MntSupplyCategory, MntInstallation)
- **Mantenedores Nuevos:** 1 (solo Unidades; reutiliza Proveedores e Instalaciones)
- **Servicios:** 3 (SupplyRequestService, SupplyQuotationService, CatalogService)
- **Rutas de Página:** 6
- **API Endpoints:** 8
- **Custom Hooks:** 3
- **Componentes Reutilizables:** 15+
- **Permisos:** 3 (Gestiona, Aprueba, Autoriza)
- **Notificaciones:** 4 eventos
- **Tiempo Estimado:** 9 semanas (2.25 meses) - Reducido por reutilización de mantenedores

### Dependencias Críticas

- Sistema de Permisos Normalizado (módulo `permissions`)
- Sistema de Notificaciones (módulo `notifications`)
- Sistema de Auditoría (`AuditLogger`)
- **Módulo de Instalaciones (`MntInstallation`)** ✅ Existente
- **Módulo de Proveedores (`MntSupplier`)** ✅ Existente
- **Módulo de Categorías (`MntSupplyCategory`)** ✅ Existente
- Módulo de Usuarios (`User`)

### Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad de la grilla Excel-like | Media | Alto | Usar librería especializada (react-table) |
| Performance con muchos items | Media | Medio | Implementar paginación y virtualización |
| Gestión de adjuntos grandes | Baja | Alto | Validar tamaño antes de upload, usar S3/storage |
| Notificaciones masivas | Baja | Medio | Implementar cola de emails (Bull/Redis) |

---

## Notas Finales

Este plan sigue estrictamente las **Reglas del Proyecto** (AGENTS.md):

✅ **Service Layer Pattern** para toda la lógica de negocio  
✅ **Custom Hooks Composables** para formularios complejos  
✅ **Query Keys Centralizadas** con React Query  
✅ **Componentes Adaptativos** (Client/Desktop) para vistas operativas  
✅ **Sistema de Permisos Normalizado** con tablas relacionales  
✅ **Sistema de Notificaciones** basado en permisos  
✅ **Patrón de Mantenedores** (`BaseMaintainer`) para CRUDs  
✅ **Auditoría y Trazabilidad** en todas las acciones críticas  
✅ **Responsividad Móvil-Primero** en todos los componentes  
✅ **Modo Oscuro** 100% compatible  

**Propósito:** Garantizar una implementación escalable, mantenible y alineada con los estándares de arquitectura del proyecto.

---

## Anexo: Lecciones Aprendidas y Mejores Prácticas

### 🔍 Auditoría de Recursos Existentes

**Antes de crear cualquier mantenedor nuevo:**

1. **Buscar en el Schema de Prisma** (`prisma/schema.prisma`):
   ```bash
   # Buscar modelos relacionados
   grep -i "model.*Supplier\|model.*Category\|model.*Installation" prisma/schema.prisma
   ```

2. **Explorar rutas de mantención** (`app/mantencion/configuracion/`):
   - Verificar si existe CRUD implementado
   - Analizar estructura de datos y relaciones

3. **Revisar seeds existentes** (`prisma/seeds/`):
   - Identificar datos maestros ya poblados
   - Evaluar si se pueden ampliar en lugar de duplicar

**Resultado esperado:**
- ✅ Reducción de tiempo de desarrollo
- ✅ Consistencia entre módulos
- ✅ Evitar duplicación de datos maestros
- ✅ Facilitar futuras integraciones

---

### 📦 Reutilización vs. Creación

**Cuándo REUTILIZAR un modelo existente:**
- El modelo tiene la estructura necesaria (>70% de campos coinciden)
- Ya existe un CRUD funcional y accesible
- Los datos son compartidos entre módulos (proveedores, instalaciones, áreas)
- La lógica de negocio es compatible

**Cuándo CREAR un modelo nuevo:**
- La estructura es fundamentalmente diferente
- Requiere campos específicos no existentes en otros modelos
- La lógica de negocio es única del módulo
- Evita acoplamiento excesivo entre módulos

**En este módulo:**
- ✅ **REUTILIZAR:** MntSupplier, MntSupplyCategory, MntInstallation
- ✨ **CREAR:** UnitMaster, SupplyRequest, SupplyQuotation (lógica única)

---

### 🔗 Estrategia de Integración

**Para integrar con modelos existentes:**

1. **Documentar el mapeo de campos** (ver sección [Mapeo de Modelos Existentes](#11-mapeo-de-modelos-existentes))
2. **Crear endpoints de alias** si es necesario (ej: `/api/v1/insumos/catalogs`)
3. **Usar el CatalogService** para abstraer el origen de los datos
4. **Mantener nomenclatura consistente** en las relaciones de Prisma

**Ejemplo de relación correcta:**
```prisma
model SupplyQuotation {
  supplierId String @map("supplier_id") @db.Uuid
  
  // Usar el modelo existente, no crear uno nuevo
  supplier MntSupplier @relation(fields: [supplierId], references: [id])
}
```

---

### 🎯 Checklist de Validación Pre-Implementación

Antes de iniciar el Sprint 1 de cualquier módulo nuevo:

- [ ] **Auditar modelos Prisma** relacionados (usar `grep` en schema.prisma)
- [ ] **Explorar CRUDs existentes** en `/mantencion/configuracion/` y `/mantenedores/`
- [ ] **Revisar seeds** en `prisma/seeds/` para datos maestros
- [ ] **Documentar mantenedores reutilizables** en el plan de implementación
- [ ] **Ajustar estimaciones de tiempo** según recursos existentes
- [ ] **Crear sección de "Mapeo de Modelos"** si se reutilizan recursos
- [ ] **Definir estrategia de integración** (endpoints de alias, service layer, etc.)

**Beneficios:**
- 🚀 Acelera el desarrollo (reducción de 1-2 semanas en promedio)
- 🎯 Mantiene consistencia arquitectónica
- 📊 Mejora la calidad de las estimaciones
- 🔄 Facilita el mantenimiento futuro

---

### 📝 Documentación para Futuros Desarrolladores

Siempre incluir en el plan de implementación:

1. **Tabla de Recursos Existentes** (ver inicio de este documento)
2. **Sección de Mapeo de Modelos** con ejemplos de código
3. **Sección de "Notas de Integración"** en el Schema Prisma
4. **Endpoints de alias** si se reutilizan APIs de otros módulos
5. **Recordatorios en seeds** sobre datos compartidos

**Template de documentación:**
```markdown
## 🔄 Reutilización de Mantenedores Existentes

| Componente | Modelo | Ubicación CRUD | Acción |
|------------|--------|----------------|--------|
| [Nombre] | `[Modelo]` | `/ruta/crud` | ✅ Reutilizar / ➕ Ampliar |

### Mapeo de Campos
[Documentar campos relevantes y su uso]

### API Endpoints
[Listar endpoints existentes y alias necesarios]
```

---

**Fin del Plan de Implementación - Módulo de Solicitud de Insumos**

---

_Este documento es un artefacto vivo. Debe actualizarse conforme se descubran nuevos recursos reutilizables o se identifiquen dependencias no documentadas._
