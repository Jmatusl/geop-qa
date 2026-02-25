# Propuesta: Sistema Centralizado de Permisos y Notificaciones por Módulo

**Fecha**: 25 de febrero de 2026  
**Objetivo**: Centralizar y normalizar la gestión de permisos operativos y notificaciones desde el mantenedor de usuarios (`/mantenedores/usuarios`), permitiendo escalabilidad para futuros módulos.

---

## 📊 Análisis del Sistema Actual

### Ubicaciones actuales:
- `/mantencion/configuracion/sistema` → Notificaciones + Aprobaciones (incluyendo Aprobación Cruzada)
- `/actividades/configuracion/sistema` → Notificaciones + Permisos operativos por usuario

### Almacenamiento actual:
Utiliza la tabla `app_setting` (clave-valor JSON) con las siguientes keys:

| Key | Contenido |
|-----|-----------|
| `mnt_system_rules` | `{ autoApprovalEnabled, crossApprovalEnabled, crossApprovers: [userId], storageProvider, ... }` |
| `mnt_notification_rules` | `{ emailEnabled, onNewRequest, onApproval, onReprogram, onClose }` |
| `act_system_rules` | `{ folioPrefix, autoAssign, storageProvider }` |
| `act_notification_rules` | `{ emailEnabled, onNewRequest, onAssign, onStatusChange, onComplete }` |
| `act_user_permissions` | `[{ userId, permissions: ['autoriza', 'chequea', 'revisa', 'recepciona'] }]` |

---

## ❌ Problemas Identificados

### 1. **Falta de Normalización**
- Permisos almacenados como JSON sin relaciones FK (foreign keys)
- No se aprovechan constraints de base de datos (CASCADE, UNIQUE)
- Dificulta queries de "qué usuarios tienen permiso X en módulo Y"

### 2. **No Escalable**
- Cada módulo nuevo requiere crear keys únicas en `app_setting`
- No hay una interfaz unificada para gestionar permisos
- Código duplicado entre módulos

### 3. **Mantenibilidad**
- Configuraciones dispersas en múltiples rutas
- No hay auditoría de cambios de permisos
- No se puede revocar permisos de forma transaccional

### 4. **UX Inconsistente**
- Usuarios deben navegar a diferentes rutas según el módulo
- No hay vista consolidada de "todos mis permisos"

---

## ✅ Propuesta: Arquitectura Normalizada

### Estructura de Base de Datos (Nueva)

```prisma
// ============================================
// MÓDULOS DEL SISTEMA
// ============================================
model Module {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code        String   @unique @db.VarChar(50)  // 'actividades', 'mantencion', 'inventario'
  name        String   @db.VarChar(100)
  description String?
  icon        String?  @db.VarChar(50)           // Nombre del icono de Lucide
  isActive    Boolean  @default(true) @map("is_active")
  displayOrder Int     @default(0) @map("display_order")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  // Relaciones
  permissions          ModulePermission[]
  userPermissions      UserModulePermission[]
  notificationSettings ModuleNotificationSetting[]
  approvalRules        ModuleApprovalRule[]

  @@map("modules")
}

// ============================================
// CATÁLOGO DE PERMISOS POR MÓDULO
// ============================================
model ModulePermission {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  moduleId    String   @map("module_id") @db.Uuid
  code        String   @db.VarChar(50)  // 'autoriza', 'chequea', 'recepciona'
  name        String   @db.VarChar(100)
  description String?
  category    String?  @db.VarChar(50)  // 'approval', 'operation', 'admin'
  isActive    Boolean  @default(true) @map("is_active")
  displayOrder Int     @default(0) @map("display_order")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  module      Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  userPermissions UserModulePermission[]

  @@unique([moduleId, code])
  @@index([moduleId])
  @@map("module_permissions")
}

// ============================================
// PERMISOS OTORGADOS A USUARIOS
// ============================================
model UserModulePermission {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  moduleId     String   @map("module_id") @db.Uuid
  permissionId String   @map("permission_id") @db.Uuid
  grantedAt    DateTime @default(now()) @map("granted_at") @db.Timestamptz(6)
  grantedBy    String?  @map("granted_by") @db.Uuid
  expiresAt    DateTime? @map("expires_at") @db.Timestamptz(6)
  
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  module     Module           @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  permission ModulePermission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  grantedByUser User?         @relation("PermissionGrantedBy", fields: [grantedBy], references: [id])

  @@unique([userId, permissionId])
  @@index([userId])
  @@index([moduleId])
  @@index([permissionId])
  @@map("user_module_permissions")
}

// ============================================
// CONFIGURACIONES DE NOTIFICACIONES
// ============================================
model ModuleNotificationSetting {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  moduleId    String   @map("module_id") @db.Uuid
  eventKey    String   @map("event_key") @db.VarChar(100)  // 'onNewRequest', 'onApproval'
  eventName   String   @map("event_name") @db.VarChar(200)
  description String?
  isEnabled   Boolean  @default(true) @map("is_enabled")
  recipients  Json?    // { type: 'role' | 'user' | 'dynamic', ids: [...] }
  template    String?  @db.VarChar(100)  // ID de plantilla de correo
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  module Module @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([moduleId, eventKey])
  @@index([moduleId])
  @@map("module_notification_settings")
}

// ============================================
// REGLAS DE APROBACIÓN
// ============================================
model ModuleApprovalRule {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  moduleId         String   @map("module_id") @db.Uuid
  ruleKey          String   @map("rule_key") @db.VarChar(100)  // 'crossApproval', 'autoApproval'
  ruleName         String   @map("rule_name") @db.VarChar(200)
  description      String?
  isEnabled        Boolean  @default(false) @map("is_enabled")
  configuration    Json?    // { crossApprovers: [userId], autoApprovalTypes: [...] }
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  updatedBy        String?  @map("updated_by") @db.Uuid
  
  module    Module @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  updatedByUser User? @relation("ApprovalRuleUpdatedBy", fields: [updatedBy], references: [id])

  @@unique([moduleId, ruleKey])
  @@index([moduleId])
  @@map("module_approval_rules")
}
```

---

## 🎯 Ventajas de la Nueva Arquitectura

### ✅ Escalabilidad
- **Agregar un nuevo módulo** = Solo insertar registros en las tablas (`Module`, `ModulePermission`)
- No requiere modificar código ni rutas existentes

### ✅ Normalización
- Foreign keys aseguran integridad referencial
- Cascades automáticos al eliminar módulos/usuarios
- Queries eficientes con índices

### ✅ Auditoría
- Campo `grantedBy` registra quién otorgó cada permiso
- Timestamps en todas las tablas
- Posibilidad de logs adicionales con triggers

### ✅ UX Unificada
- **Una sola pestaña** en `/mantenedores/usuarios` para gestionar **todos** los permisos
- Vista consolidada por módulo con tabs dinámicos
- Expansión automática al agregar módulos

### ✅ Seguridad
- Permisos con expiración opcional (`expiresAt`)
- Revocar permisos de forma transaccional
- Validación en backend con helpers tipados

---

## 🛠️ Plan de Implementación

### **Sprint 1: Migración de Base de Datos**
1. Crear migración Prisma con las 5 nuevas tablas
2. Script de seed para poblar módulos iniciales:
   ```typescript
   const modules = [
     { code: 'actividades', name: 'Actividades', icon: 'ClipboardList' },
     { code: 'mantencion', name: 'Mantención', icon: 'Wrench' },
     { code: 'inventario', name: 'Inventario', icon: 'Package' },
     { code: 'reportes', name: 'Reportes', icon: 'FileText' },
   ];
   ```
3. Script de migración de datos antiguos (`app_setting` → tablas normalizadas)

### **Sprint 2: Service Layer para Permisos**
Crear `lib/services/permissions/module-permission-service.ts`:

```typescript
export class ModulePermissionService {
  /**
   * Verificar si un usuario tiene un permiso específico
   */
  async userHasPermission(userId: string, moduleCode: string, permissionCode: string): Promise<boolean> {
    const permission = await prisma.userModulePermission.findFirst({
      where: {
        userId,
        module: { code: moduleCode },
        permission: { code: permissionCode },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });
    return !!permission;
  }

  /**
   * Obtener todos los permisos de un usuario en un módulo
   */
  async getUserPermissions(userId: string, moduleCode: string): Promise<string[]> {
    const permissions = await prisma.userModulePermission.findMany({
      where: {
        userId,
        module: { code: moduleCode },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: { permission: true }
    });
    return permissions.map(p => p.permission.code);
  }

  /**
   * Otorgar permisos a un usuario
   */
  async grantPermissions(
    userId: string,
    moduleCode: string,
    permissionCodes: string[],
    grantedBy: string
  ): Promise<void> {
    const module = await prisma.module.findUnique({
      where: { code: moduleCode },
      include: { permissions: true }
    });
    if (!module) throw new Error('Módulo no encontrado');

    const permissions = module.permissions.filter(p => 
      permissionCodes.includes(p.code)
    );

    await prisma.$transaction(
      permissions.map(perm =>
        prisma.userModulePermission.upsert({
          where: {
            userId_permissionId: {
              userId,
              permissionId: perm.id
            }
          },
          create: {
            userId,
            moduleId: module.id,
            permissionId: perm.id,
            grantedBy
          },
          update: {}
        })
      )
    );
  }

  /**
   * Revocar permisos de un usuario
   */
  async revokePermissions(
    userId: string,
    moduleCode: string,
    permissionCodes: string[]
  ): Promise<void> {
    await prisma.userModulePermission.deleteMany({
      where: {
        userId,
        module: { code: moduleCode },
        permission: { code: { in: permissionCodes } }
      }
    });
  }
}

export const modulePermissionService = new ModulePermissionService();
```

### **Sprint 3: Componente Centralizado de Permisos**
Crear componente `PermissionsTab` en `/mantenedores/usuarios`:

```tsx
// components/users/PermissionsTab.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, ClipboardList, Wrench, FileText, Shield } from "lucide-react";

interface Module {
  id: string;
  code: string;
  name: string;
  icon: string;
  permissions: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
  }>;
}

interface Props {
  userId: string;
  modules: Module[];
  userPermissions: Record<string, string[]>; // moduleCode → permissionCodes[]
  onPermissionToggle: (moduleCode: string, permissionCode: string) => void;
}

const ICON_MAP: Record<string, any> = {
  ClipboardList,
  Wrench,
  Package,
  FileText,
};

export default function PermissionsTab({ modules, userPermissions, onPermissionToggle }: Props) {
  return (
    <Tabs defaultValue={modules[0]?.code} className="w-full">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2">
        {modules.map((module) => {
          const Icon = ICON_MAP[module.icon] || Shield;
          const activeCount = userPermissions[module.code]?.length || 0;
          
          return (
            <TabsTrigger
              key={module.code}
              value={module.code}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <span>{module.name}</span>
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {activeCount}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {modules.map((module) => (
        <TabsContent key={module.code} value={module.code} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {ICON_MAP[module.icon] && <ICON_MAP[module.icon] className="h-5 w-5" />}
                Permisos de {module.name}
              </CardTitle>
              <CardDescription>
                Seleccione los permisos operativos para este usuario en el módulo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {/* Agrupar por categoría */}
                  {['approval', 'operation', 'admin'].map((category) => {
                    const categoryPerms = module.permissions.filter(
                      (p) => p.category === category
                    );
                    if (categoryPerms.length === 0) return null;

                    return (
                      <div key={category} className="space-y-3">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase">
                          {category === 'approval' && '🔒 Aprobaciones'}
                          {category === 'operation' && '⚙️ Operaciones'}
                          {category === 'admin' && '👤 Administración'}
                        </h4>
                        {categoryPerms.map((perm) => (
                          <div
                            key={perm.id}
                            className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                          >
                            <Checkbox
                              id={`${module.code}-${perm.code}`}
                              checked={userPermissions[module.code]?.includes(perm.code)}
                              onCheckedChange={() =>
                                onPermissionToggle(module.code, perm.code)
                              }
                            />
                            <div className="space-y-1 flex-1">
                              <Label
                                htmlFor={`${module.code}-${perm.code}`}
                                className="text-sm font-semibold cursor-pointer"
                              >
                                {perm.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

### **Sprint 4: Integración en Mantenedor de Usuarios**
Agregar pestaña "Permisos" en `/mantenedores/usuarios/[id]`:

```tsx
// app/mantenedores/usuarios/[id]/page.tsx
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="roles">Roles</TabsTrigger>
    <TabsTrigger value="permissions">Permisos por Módulo</TabsTrigger>
    <TabsTrigger value="sessions">Sesiones</TabsTrigger>
  </TabsList>

  <TabsContent value="permissions">
    <PermissionsTab
      userId={user.id}
      modules={modules}
      userPermissions={userPermissions}
      onPermissionToggle={handleTogglePermission}
    />
  </TabsContent>
</Tabs>
```

### **Sprint 5: Eliminación de Rutas Antiguas**
Deprecar y redirigir:
- `/mantencion/configuracion/sistema` → `/mantenedores/usuarios`
- `/actividades/configuracion/sistema` → `/mantenedores/usuarios`

---

## 📋 Seed de Datos Inicial

```typescript
// prisma/seeds/modules-permissions.ts
export async function seedModulesAndPermissions() {
  // 1. Crear módulos
  const actividades = await prisma.module.create({
    data: {
      code: 'actividades',
      name: 'Actividades',
      icon: 'ClipboardList',
      displayOrder: 1,
    },
  });

  const mantencion = await prisma.module.create({
    data: {
      code: 'mantencion',
      name: 'Mantención',
      icon: 'Wrench',
      displayOrder: 2,
    },
  });

  // 2. Crear permisos de Actividades
  await prisma.modulePermission.createMany({
    data: [
      {
        moduleId: actividades.id,
        code: 'autoriza',
        name: 'Autorizar Actividades',
        description: 'Permite al usuario autorizar actividades',
        category: 'approval',
        displayOrder: 1,
      },
      {
        moduleId: actividades.id,
        code: 'chequea',
        name: 'Chequear Actividades',
        description: 'Puede realizar chequeos de actividades antes de la aprobación',
        category: 'operation',
        displayOrder: 2,
      },
      {
        moduleId: actividades.id,
        code: 'revisa',
        name: 'Revisar Requerimientos',
        description: 'Puede aprobar revisiones solicitadas por otros usuarios',
        category: 'approval',
        displayOrder: 3,
      },
      {
        moduleId: actividades.id,
        code: 'recepciona',
        name: 'Recepcionar Requerimientos',
        description: 'Puede registrar recepciones de trabajo en requerimientos',
        category: 'operation',
        displayOrder: 4,
      },
    ],
  });

  // 3. Crear permisos de Mantención
  await prisma.modulePermission.createMany({
    data: [
      {
        moduleId: mantencion.id,
        code: 'aprueba',
        name: 'Aprobar Requerimientos',
        description: 'Autoriza requerimientos de mantención',
        category: 'approval',
        displayOrder: 1,
      },
      {
        moduleId: mantencion.id,
        code: 'aprobacion_cruzada',
        name: 'Aprobación Cruzada',
        description: 'Puede aprobar requerimientos de otras instalaciones',
        category: 'approval',
        displayOrder: 2,
      },
      {
        moduleId: mantencion.id,
        code: 'cierra_tecnicamente',
        name: 'Cierre Técnico',
        description: 'Puede realizar el cierre técnico de requerimientos',
        category: 'operation',
        displayOrder: 3,
      },
    ],
  });

  // 4. Crear configuraciones de notificaciones
  await prisma.moduleNotificationSetting.createMany({
    data: [
      // Actividades
      {
        moduleId: actividades.id,
        eventKey: 'onNewRequest',
        eventName: 'Nuevo Requerimiento',
        description: 'Notificar a responsables cuando se registre un nuevo requerimiento',
        isEnabled: true,
      },
      {
        moduleId: actividades.id,
        eventKey: 'onAssign',
        eventName: 'Asignación de Responsable',
        description: 'Avisar al responsable asignado',
        isEnabled: true,
      },
      // Mantención
      {
        moduleId: mantencion.id,
        eventKey: 'onNewRequest',
        eventName: 'Nuevo Requerimiento',
        description: 'Notificar a los aprobadores cuando se registre una nueva falla',
        isEnabled: true,
      },
      {
        moduleId: mantencion.id,
        eventKey: 'onApproval',
        eventName: 'Aprobaciones y Rechazos',
        description: 'Informar al solicitante sobre la decisión de la jefatura',
        isEnabled: true,
      },
    ],
  });

  // 5. Crear reglas de aprobación
  await prisma.moduleApprovalRule.create({
    data: {
      moduleId: mantencion.id,
      ruleKey: 'crossApproval',
      ruleName: 'Aprobación Cruzada',
      description: 'Permite la asignación de validadores inter-instalación',
      isEnabled: false,
      configuration: { crossApprovers: [] },
    },
  });
}
```

---

## 🔄 Script de Migración de Datos

```typescript
// scripts/migrate-permissions-to-normalized.ts
import { prisma } from '@/lib/prisma';

async function migratePermissions() {
  console.log('🔄 Migrando permisos de app_setting a tablas normalizadas...');

  // 1. Obtener módulos
  const actividades = await prisma.module.findUnique({ where: { code: 'actividades' } });
  const mantencion = await prisma.module.findUnique({ where: { code: 'mantencion' } });

  if (!actividades || !mantencion) {
    throw new Error('Módulos no encontrados. Ejecutar seed primero.');
  }

  // 2. Migrar permisos de actividades
  const actPermissions = await prisma.appSetting.findUnique({
    where: { key: 'act_user_permissions' },
  });

  if (actPermissions?.value) {
    const permissions = actPermissions.value as any[];
    
    for (const userPerm of permissions) {
      const permissionRecords = await prisma.modulePermission.findMany({
        where: {
          moduleId: actividades.id,
          code: { in: userPerm.permissions },
        },
      });

      await prisma.userModulePermission.createMany({
        data: permissionRecords.map((perm) => ({
          userId: userPerm.userId,
          moduleId: actividades.id,
          permissionId: perm.id,
        })),
        skipDuplicates: true,
      });
    }
    console.log(`✅ Migrados ${permissions.length} usuarios de actividades`);
  }

  // 3. Migrar aprobación cruzada de mantención
  const mntRules = await prisma.appSetting.findUnique({
    where: { key: 'mnt_system_rules' },
  });

  if (mntRules?.value) {
    const rules = mntRules.value as any;
    
    await prisma.moduleApprovalRule.upsert({
      where: {
        moduleId_ruleKey: {
          moduleId: mantencion.id,
          ruleKey: 'crossApproval',
        },
      },
      create: {
        moduleId: mantencion.id,
        ruleKey: 'crossApproval',
        ruleName: 'Aprobación Cruzada',
        isEnabled: rules.crossApprovalEnabled || false,
        configuration: { crossApprovers: rules.crossApprovers || [] },
      },
      update: {
        isEnabled: rules.crossApprovalEnabled || false,
        configuration: { crossApprovers: rules.crossApprovers || [] },
      },
    });
    console.log('✅ Migrada regla de aprobación cruzada');
  }

  // 4. Migrar notificaciones
  const actNotifications = await prisma.appSetting.findUnique({
    where: { key: 'act_notification_rules' },
  });

  if (actNotifications?.value) {
    const notifs = actNotifications.value as any;
    
    for (const [key, value] of Object.entries(notifs)) {
      if (key === 'emailEnabled') continue;
      
      await prisma.moduleNotificationSetting.upsert({
        where: {
          moduleId_eventKey: {
            moduleId: actividades.id,
            eventKey: key,
          },
        },
        update: {
          isEnabled: value as boolean,
        },
        create: {
          moduleId: actividades.id,
          eventKey: key,
          eventName: key,
          isEnabled: value as boolean,
        },
      });
    }
    console.log('✅ Migradas notificaciones de actividades');
  }

  console.log('✨ Migración completada');
}

migratePermissions();
```

---

## 📊 Comparación: Antes vs Después

| Aspecto | Sistema Actual (app_setting) | Sistema Propuesto (Normalizado) |
|---------|------------------------------|----------------------------------|
| **Agregar módulo** | Modificar código + crear keys | INSERT en tabla `modules` |
| **Agregar permiso** | Editar JSON + actualizar UI | INSERT en `module_permissions` |
| **Revocar permisos** | Editar JSON manualmente | DELETE con CASCADE automático |
| **Auditoría** | No existe | `grantedBy`, `grantedAt` en cada registro |
| **Query de "usuarios con permiso X"** | Imposible sin parsear JSON | `SELECT` directo con JOIN |
| **Expiración de permisos** | No soportado | Campo `expiresAt` nativo |
| **Interfaz centralizada** | No | Tabs dinámicos en `/mantenedores/usuarios` |

---

## 🎨 Mockup de la UI Propuesta

```
/mantenedores/usuarios/[id]

┌────────────────────────────────────────────────────────────┐
│ Juan Pérez                                       [Guardar] │
├────────────────────────────────────────────────────────────┤
│ [General] [Roles] [Permisos por Módulo] [Sesiones]        │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Permisos por Módulo                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 📋 Actividades (3) │ 🔧 Mantención (2) │ 📦 Invent.│   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ Permisos de Actividades                                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                             │
│ 🔒 Aprobaciones                                            │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ☑ Autorizar Actividades                             │   │
│ │   Permite al usuario autorizar actividades          │   │
│ │                                                      │   │
│ │ ☑ Revisar Requerimientos                            │   │
│ │   Puede aprobar revisiones solicitadas              │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ⚙️ Operaciones                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ ☐ Chequear Actividades                              │   │
│ │   Realizar chequeos antes de la aprobación          │   │
│ │                                                      │   │
│ │ ☑ Recepcionar Requerimientos                        │   │
│ │   Registrar recepciones de trabajo                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📝 Actualización de AGENTS.md

Se debe agregar una nueva sección en `AGENTS.md`:

```markdown
## 21. Sistema de Permisos por Módulo

Para mantener la escalabilidad y consistencia al agregar nuevos módulos con permisos operativos:

### Arquitectura de Permisos
- **Centralización**: Todos los permisos se gestionan desde `/mantenedores/usuarios/[id]` en la pestaña "Permisos por Módulo"
- **Normalización**: Usar tablas relacionales (`modules`, `module_permissions`, `user_module_permissions`) en lugar de JSON en `app_setting`
- **Service Layer**: Usar `modulePermissionService` para todas las operaciones de permisos

### Agregar Permisos a un Nuevo Módulo

1. **Crear el módulo** (seed o migración):
```typescript
const inventario = await prisma.module.create({
  data: {
    code: 'inventario',
    name: 'Inventario',
    icon: 'Package',
    displayOrder: 3,
  },
});
```

2. **Definir permisos**:
```typescript
await prisma.modulePermission.createMany({
  data: [
    {
      moduleId: inventario.id,
      code: 'gestiona_stock',
      name: 'Gestionar Stock',
      description: 'Puede ajustar inventario',
      category: 'operation',
    },
    {
      moduleId: inventario.id,
      code: 'aprueba_compras',
      name: 'Aprobar Compras',
      description: 'Autoriza órdenes de compra',
      category: 'approval',
    },
  ],
});
```

3. **Verificar permisos en código**:
```typescript
const hasPermission = await modulePermissionService.userHasPermission(
  userId,
  'inventario',
  'gestiona_stock'
);
```

### Prohibiciones
- ❌ **No** usar `app_setting` para nuevos permisos
- ❌ **No** crear rutas separadas de configuración por módulo
- ❌ **No** duplicar lógica de permisos
```

---

## ✅ Checklist de Implementación

- [ ] **DB**: Crear migración Prisma con 5 nuevas tablas
- [ ] **DB**: Script de seed inicial (módulos + permisos + notificaciones)
- [ ] **DB**: Script de migración de datos antiguos
- [ ] **Backend**: Crear `ModulePermissionService` en `lib/services/`
- [ ] **Backend**: Helpers para verificación de permisos (`userHasPermission`)
- [ ] **Frontend**: Componente `PermissionsTab` reutilizable
- [ ] **Frontend**: Integrar en `/mantenedores/usuarios/[id]`
- [ ] **Frontend**: Agregar tabs dinámicos por módulo
- [ ] **Testing**: Unit tests para `ModulePermissionService`
- [ ] **Testing**: Integration tests para otorgar/revocar permisos
- [ ] **Docs**: Actualizar `AGENTS.md` con la sección 21
- [ ] **Deprecation**: Redirigir rutas antiguas de configuración
- [ ] **Cleanup**: Eliminar código antiguo de `app_setting` permisos

---

## 🚀 Resultado Final

Al completar esta propuesta, el sistema tendrá:

✅ **Gestión centralizada** de permisos en una sola ubicación  
✅ **Escalabilidad ilimitada** para agregar módulos sin refactoring  
✅ **Auditoría completa** de quién otorgó qué permiso y cuándo  
✅ **UI dinámica** que se adapta automáticamente a nuevos módulos  
✅ **Integridad referencial** con constraints de base de datos  
✅ **Código limpio** sin JSON anidados ni lógica duplicada  

**Esto posicionará al proyecto para crecer de forma sostenible durante años.**
