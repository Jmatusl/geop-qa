---
trigger: always_on
---

# Estándares del Proyecto

Este documento define las reglas de oro para el desarrollo del sistema. Deben seguirse estrictamente para garantizar consistencia y calidad.

## 1. Arquitectura y Tecnologías

- **Stack**: Next.js 15 (App Router), Prisma, PostgreSQL, TailwindCSS.
- **Seguridad**:
  - Sesiones gestionadas mediante cookies `httpOnly`, `secure` y `sameSite: lax`.
  - Validación de esquemas con Zod en todas las entradas.
  - Validación de esquemas con Zod en todas las entradas.
  - No exponer logs técnicos o errores directos de base de datos al cliente.
  - **Middleware/Proxy**: En este proyecto, la lógica de middleware reside estrictamente en `proxy.ts` (reemplaza al estándar `middleware.ts`). No debe contener lógica de negocio ni llamadas a Base de Datos. Su uso es exclusivo para redirecciones ligeras y gestión de cookies. Toda autorización compleja debe residir en Layouts o Server Components.

## 2. Interfaz de Usuario (UI/UX)

- **Componentes**: Usar exclusivamente `shadcn/ui` y `lucide-react`.
- **Modo Oscuro**: Todas las vistas deben ser 100% compatibles con el modo oscuro usando variables de `next-themes`.
- **Feedback**: Usar `sonner` para notificaciones y estados de carga (loading skeletons o spinners) en todas las acciones asíncronas.
- **Responsividad**: Diseño móvil-primero. No usar anchos fijos; usar clases de grid o flex de Tailwind.
- **Layout y Espaciado**:
  - **Ancho Completo**: Las vistas principales y formularios de gestión deben utilizar siempre el ancho completo disponible del contenedor padre (`w-full`). Los layouts o wrappers de página deben envolver el contenido siempre con un `<div className="w-full">{children}</div>` para evitar restricciones de ancho. Evitar contenedores centrados con ancho fijo (`max-w-X`) que desperdicien espacio en pantallas grandes, a menos que sea una vista de lectura simple.
  - **Componentes de Formulario**: Todos los inputs, selects y elementos interactivos dentro de un formulario deben ocupar el 100% del ancho de su contenedor (`w-full`) para garantizar alineación y consistencia visual.
  - **Padding en Contenedores**: Cuando se implemente un `container` como primer hijo de un `main` o layout principal, no debe incluir `p-4` por defecto a menos que se especifique lo contrario.
  - **Layouts de Módulos (Wrappers)**: Los layouts internos (`layout.tsx`) de cada módulo no deben aplicar paddings extensos ni clases restrictivas como `container mx-auto` por defecto. Deben permitir el paso del ancho completo (`w-full`) para que las páginas hijas gestionen su propia densidad de datos, evitando márgenes redundantes o "raros".
  - **Modales y Diálogos**: Para formularios complejos o selectores extensos dentro de un `Dialog` o `Sheet`, se debe utilizar explícitamente la clase `w-[80vw]! max-w-[80vw]!` para fijar el ancho al **80% del viewport** y maximizar el área de trabajo en pantallas grandes.
- **Formularios**:
  - Desactivar autocompletado nativo (`autoComplete="off"`) en todos los campos sensibles o de gestión para evitar ruido visual.
  - **Gestión de RUT (Regla de Oro)**:
    - **Formato Dual**: El usuario debe ver los datos con formato (ej: RUT con puntos y guion) en los inputs, pero el Backend debe recibir siempre data limpia (solo números y letra).
    - **Visualización**: El RUT debe mostrarse **siempre** formateado (XX.XXX.XXX-X) en tablas, fichas, tarjetas y cualquier vista de consulta utilizando obligatoriamente la utilidad `formatRUT()`.
    - **Sanitización**: Los valores como el DV del RUT deben normalizarse a mayúscula ('K') antes de persistir o validar. No declarar funciones de validación ad-hoc; usar siempre `validateRUT()` de `lib/utils/chile-utils.ts`.
- **Contraste y Accesibilidad (Dark Mode)**:
  - **Botones Primarios**: Aquellos con fondos oscuros (ej: Azul Corporativo `#283c7f`) deben forzar siempre `text-white` tanto para el texto como para los iconos (ej: `<Save className="text-white" />`).
  - **Botones Secundarios**: Para variantes `outline`, `ghost` o similares, se debe usar la utilidad `dark:text-white` para asegurar que el contenido sea legible frente a fondos negros o grises muy oscuros.
- **Diálogos de Confirmación**:
  - **Prohibición**: No usar la función nativa `window.confirm()` o `confirm()`.
  - **Estándar**: Usar exclusivamente el componente `AlertDialog` de `shadcn/ui`. Esto garantiza coherencia visual, soporte para modo oscuro y una experiencia de usuario premium (evitando bloqueos del hilo principal del navegador).
- **Patrón de UI Móvil para Formularios Operativos**:
  - **Infraestructura base**: El `<main>` del `DashboardShell` no debe tener padding en móvil (`lg:px-4 lg:py-6`). Esto permite que los formularios se extiendan hasta los bordes de la pantalla en dispositivos móviles.
  - **Header de navegación interno**: Todo formulario operativo (Ingreso de Requerimiento, Ingreso de Bodega, etc.) debe implementar un header de navegación propio para móvil (`lg:hidden`) que incluya:
    - Botón `[ < ]` (`ChevronLeft`) para `router.back()`, con borde redondeado.
    - Ícono representativo del módulo (de `lucide-react`).
    - Título en **MAYÚSCULAS BOLD** (`font-extrabold uppercase tracking-wide`).
    - Fecha de hoy formateada (`DD-MM-AA`) alineada a la derecha.
    - Fondo blanco (`bg-white dark:bg-slate-900`) con borde inferior (`border-b border-border`).
    - **Sin ningún tipo de padding lateral propio** — el flush lo provee el `<main>` sin padding.
  - **Ocultar textos descriptivos en móvil**: El bloque de título (`<h1>`) y descripción de la página deben ser `hidden lg:flex` en móvil. El header interno ya sirve como contexto suficiente.
  - **Barra de acción fija inferior**: En móvil, los botones de acción principal y secundaria deben ir en una barra fija (`fixed bottom-0 left-0 right-0 lg:hidden`) con fondo blanco y sombra superior. Estructura: `[Volver]` (outline, `shrink-0`) + `[Acción Principal]` (`flex-1`, fondo azul corporativo).
  - **Formulario**: agregar `pb-20 lg:pb-0` al `<form>` para evitar que el contenido quede tapado por la barra fija inferior.
  - **Contenidos secundarios**: Elementos como tablas de referencia, campos de descripción larga o ayudas contextuales que consumen demasiado espacio deben ocultarse en móvil (`hidden lg:block`) y reemplazarse por mecanismos alternativos (botón ⓘ que abre un `Dialog`, etc.).
  - **Adjuntos en móvil**: Los upload zones no deben mostrarse como zona de drag-and-drop grande. En su lugar, usar un botón compacto icónico que:
    - Muestra el conteo de archivos adjuntos.
    - Cambia de color (gris → verde esmeralda `bg-emerald-500`) al tener archivos.
    - Incluye un punto indicador (`green dot`) en la esquina superior derecha.
    - Al pulsarlo, alterna (`toggle`) la visibilidad de un panel de previews con grid 3 columnas y botón eliminar siempre visible (sin hover).
- **Patrón de UI Desktop para Formularios Operativos**:
  - **Estética de Contenedores**: Usar un redondeado más suave y moderno (`rounded-xl`). Evitar radios muy grandes como `2xl` o `3xl` para mantener una apariencia profesional y estructurada.
  - **Header de Formulario**:
    - **Fondo**: No usar fondos de colores sólidos vibrantes (como azul oscuro). Usar fondos neutros (`bg-white` / `dark:bg-slate-900`) con bordes sutiles (`border border-border`) para un diseño más limpio ("Airy design").
    - **Distribución**: Los controles principales del encabezado (selectores de contexto, botones de búsqueda rápida) deben alinearse a la derecha (`justify-end`).
    - **Espaciado**: El contenedor de estos controles debe ocupar aproximadamente el **60% del ancho**, dejando un **40% de espacio libre ("aire") a la izquierda** para mejorar el enfoque visual.
  - **Sombreado**: Aplicar sombras muy sutiles (`shadow-sm`) para separar visualmente las secciones del fondo sin crear demasiado ruido.

## 3. Patrón de Mantenedores (CRUD)

Para cualquier módulo administrativo (Usuarios, Roles, Menús, etc.):

- **Vista Única**: Implementar el patrón Tabla/Formulario en una sola página. La tabla se oculta para mostrar el formulario (`setMode('edit' | 'create' | 'table')`).
- **Data Management**: Usar `TanStack Table` para listados y `TanStack Query` para caching y mutaciones.
- **Interactividad**: Toda tabla debe incluir un botón de refresco (`RefreshCw`) que:
  - Esté deshabilitado mientras se cargan los datos (`isLoading` o `isFetching`).
  - Muestre una animación de rotación (`animate-spin`) durante la carga.
- **Invalidación**: Al guardar un registro exitosamente, siempre invalidar la query de la tabla relacionada para refrescar los datos.
- **Deep Linking (Edición por URL) y Prevención de Flickering**: Todo mantenedor debe soportar el acceso directo a la edición de un registro mediante el parámetro `edit` en el query string (ej: `?edit=UUID`).
  - **Estado Inicial (Anti-Flicker)**: El estado de la vista (`externalMode`) debe inicializarse evaluando estáticamente la presencia del parámetro `edit` (ej: `useState(editId ? "edit" : "table")`). Esto evita el "flicker" o parpadeo visual donde la tabla se dibuja por unos milisegundos antes de montar el formulario.
  - **Transición de Carga (Spinner)**: Mientras se obtiene el registro individual desde la API (ej: usando React Query), el callback `renderForm` del `BaseMaintainer` no debe intentar montar campos de formulario vacíos. En su lugar, si la vista está en modo `"edit"` y la `initialData` todavía es nula o indefinida, se debe retornar inmediatamente un spinner de carga centrado para dar fluidez.
- **Navegación Intuitiva**: El campo identificador principal en las tablas (ej: Nombre, Código) debe ser un botón o link que dispare el modo edición, facilitando el acceso rápido sin depender exclusivamente del menú de acciones.
- **Sincronización de URL**: Al abrir el formulario de edición, se debe actualizar la URL con el parámetro correspondiente (`?edit=X`). Al cerrar, cancelar o guardar éxito, se debe remover dicho parámetro limpiar la URL en la barra del navegador (sin recargar la página) para no afectar estados posteriores.

## 4. Sistema de Reportes (Excel/PDF)

- **Ubicación**: Todos los reportes residen en `lib/reports/`.
- **Estructura Engine/Module**:
  - `lib/reports/core/`: Motores técnicos base (ExcelEngine, etc.) que manejan el branding (logos, fuentes corporativas) y estilos de la librería.
  - `lib/reports/modules/`: Definiciones específicas por módulo (columnas, mapeo de datos de BD).
- **Proceso**: Los reportes deben generarse en caliente y enviarse como buffer; no se almacenan archivos en el disco del servidor.

## 5. Auditoría y Trazabilidad

- **AuditLogger**: Es obligatorio registrar acciones críticas (creación, edición, borrado, carga masiva, cambios en configuración).
- **Metadata**: Los logs deben incluir metadata útil (ID del recurso afectado, valores previos si aplica).
- **Contexto**: Siempre capturar IP e User-Agent en el servidor mediante utilidades centralizadas.

## 6. Configuraciones

- **Base de Datos**: Las configuraciones de negocio (UI, SSO, correos) se almacenan en `app_setting` como JSONb.
- **Fallbacks**: Siempre definir un valor por defecto en `lib/config/ui-config-fallback.json` para evitar errores si la clave no existe en la BD.
- **Servidor**: Leer configuraciones preferiblemente en Server Components para mayor seguridad.

## 7. Auxiliares y Utilidades (Helpers)

Para evitar la duplicación de código y mejorar la mantenibilidad:

- **Ubicación**: Todas las funciones de utilidad deben residir en `lib/utils/`.
- **Categorización**: Las funciones deben agruparse en archivos especializados por contexto:
  - `lib/utils/chile-utils.ts`: Validaciones de RUT, formatos de moneda local, etc.
  - `lib/utils/text-utils.ts`: Capitalización, truncado, manipulación de strings.
  - `lib/utils/date-utils.ts`: Formateo de fechas, cálculos de periodos (extendiendo date-fns si es necesario).
- **Prohibición**: No declarar funciones de utilidad complejas (como validaciones de RUT) directamente dentro de componentes o esquemas de validación.

## 8. Convenciones de Código y Estructura

- **TypeScript**: Uso estricto de tipos. Evitar `any` a menos que sea estrictamente necesario para integraciones externas (como buffers de respuesta).
- **Nomenclatura**:
  - Componentes: `PascalCase` (ej: `UserForm.tsx`).
  - Hooks: `camelCase` con prefijo `use` (ej: `useUsers.ts`).
  - API Routes: Carpetas con nombre de recurso y archivo `route.ts`.
  - Migraciones (Prisma): Los nombres deben escribirse estrictamente en **Español** (ej: `npx prisma migrate dev --name inicializacion_sistema`).
- **Directorio `lib/`**:
  - `lib/auth/`: Lógica de sesiones y validación.
  - `lib/hooks/`: Hooks de TanStack Query para el frontend.
  - `lib/utils/`: Funciones puras y helpers globales.
- **Validación Práctica**: Antes de implementar una nueva funcionalidad, verificar siempre si existe un patrón comparable ya implementado en el Módulo 1 para replicarlo.

## 8. Estructura de Directorios

Se debe respetar la siguiente organización de carpetas para mantener el orden del proyecto:

- **`app/`**: Rutas y vistas de Next.js.
  - `app/api/v1/`: Endpoints de la API, organizados por recurso.
  - `app/(auth)/`: Rutas de autenticación (login, recover, reset).
  - `app/(dashboard)/`: Vistas protegidas tras el login.
- **`components/`**: Componentes de React.
  - `components/ui/`: Componentes base de shadcn/ui.
  - `components/layout/`: Sidebar, Header, Breadcrumbs.
  - `components/[modulo]/`: Componentes específicos por área (ej: `components/audit/`).
- **`lib/`**: Lógica centralizada.
  - `lib/auth/`: Validación de sesiones y tokens.
  - `lib/hooks/`: Hooks de React Query y utilidades del cliente.
  - `lib/reports/`: Motores y definiciones de Excel/PDF.
  - `lib/config/`: Archivos JSON de fallback y tipos globales.
- **`prisma/`**: Definición de base de datos (`schema.prisma`) y scripts de `seed.ts`.
- **`docs/`**: Documentación técnica y manuales de usuario.
- **`.agent/rules/`**: Estas reglas de comportamiento e instrucciones para la IA.

## 9. Croquis de Estructura (Shell)

```
/
├── prisma/
│   ├── schema.prisma              # Modelos de datos
│   ├── migrations/                # Historial SQL
│   └── seed.ts                    # Datos maestros iniciales
│
├── app/
│   ├── (auth)/                    # Autenticación (Login, Recovery, Reset)
│   ├── (dashboard)/               # Vistas protegidas (Layout + Sidebar)
│   ├── api/v1/                    # Endpoints REST organizados por recurso
│   ├── layout.tsx                 # Root Layout y Providers
│   └── globals.css                # Estilos globales y variables de tema
│
├── components/
│   ├── ui/                        # Componentes Shadcn (primitivos)
│   ├── layout/                    # Componentes de marco (Sidebar, Header)
│   ├── maintainer/                # Patrón base para CRUDs
│   └── [modulo]/                  # Componentes específicos por área
│
├── lib/
│   ├── auth/                      # Lógica de seguridad y sesiones
│   ├── reports/                   # Generación de Excel/PDF (Engines/Modules)
│   ├── hooks/                     # TanStack Query y Custom Hooks
│   ├── utils/                     # Helpers y funciones puras
│   └── config/                    # Configuración estática y fallbacks
│
├── public/                        # Assets estáticos (logos, imágenes)
└── docs/                          # Documentación técnica y funcional
```

## 10. Gestión de Textos de UI (Externalización Modular)

Para facilitar la edición y mantenimiento de textos sin modificar la lógica del código:

- **Ubicación**: Los textos de UI deben externalizarse a archivos JSON en `lib/config/ui/`.
- **Organización por Ruta**: Los archivos deben agruparse por "Ruta Padre" o unidad de negocio (ej: `lib/config/ui/maintainers.json` para todas las rutas bajo `/mantenedores/`).
- **Estructura Interna**:
  - Una sección `common` para textos reutilizables en el módulo.
  - Secciones específicas por cada página o vista hija.
- **Implementación**: Las páginas deben importar su configuración al inicio y mapear los textos a los componentes (ej: `BaseMaintainer`).
- **Prioridad**: Los textos estáticos de la interfaz no deben guardarse en la base de datos a menos que se requiera explícitamente edición por parte del usuario final.

## 11. Comentarios y Documentación

- **Idioma**: Todos los comentarios en el código deben escribirse estrictamente en **Español**.
- **Brevedad**: Los comentarios deben ser concisos y directos, explicando el "por qué" o la lógica compleja, no el "qué" (el código debe ser autoexplicativo).
- **Consistencia**: Unificar el estilo de comentarios en todo el proyecto.

## 12. Ordenamiento en Tablas (Sorting)

Para garantizar una experiencia de usuario fluida y consistente en todas las tablas de datos (`DataTable`):

- **Lógica de 3 Estados**:
  - El ordenamiento debe ser cíclico: **Sin Orden** → **Ascendente** → **Descendente** → **Sin Orden**.
  - No usar selects ni dropdowns externos; la interacción debe ser directa en el encabezado de la columna.

- **Estabilidad Visual (Layout Shift)**:
  - **Regla de Oro**: Siempre se debe reservar el espacio del icono de ordenamiento (ej: un `div` vacío de `w-4 h-4`) cuando la columna no está ordenada.
  - Esto es crítico para evitar que el ancho de la columna "salte" o se redimensione al hacer clic, lo cual degrada la UX.

- **Configuración Centralizada**:
  - En el archivo de definición de columnas (`columns.tsx`), se debe declarar una constante `SORTABLE_COLUMNS` (objeto simple) al inicio.
  - Esto permite habilitar o deshabilitar el ordenamiento de campos específicos (ej: `rut: true`, `role: false`) sin modificar la lógica JSX compleja.

- **Estrategia de Datos**:
  - Para mantenedores estándar (paginación simple < 100 items por página), preferir **ordenamiento en cliente** (`Client-side Sorting` con `useMemo`). Esto evita refetching innecesario y hace la interfaz más reactiva ("snappy").

## 13. Gestión de Versiones (Git)

- **Idioma**: Todos los mensajes de commit deben escribirse estrictamente en **Español**.
- **Formato**: Usar Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`).
- **Prohibición**: No realizar `git push` de forma automática; el usuario debe revisar y ejecutar el envío manualmente.

## 14. Patrón de Componentes Adaptativos por Dispositivo

Para vistas complejas que requieren una experiencia radicalmente diferente entre móvil y escritorio (formularios operativos, vistas de detalle, gestión de recursos), se debe aplicar el patrón **"Componentes Adaptativos"** en lugar de gobernar todo el layout desde un único archivo con clases `lg:`.

### Cuándo aplicarlo

- El layout de móvil y escritorio son estructuralmente distintos (ej: una columna vs. dos columnas + tabs).
- Un solo componente se volvería difícil de mantener por la cantidad de clases `hidden lg:block` / `lg:hidden`.
- La experiencia de cada dispositivo tiene flujos o subcomponentes propios.

### Estructura de archivos

```
app/[modulo]/[ruta]/
├── page.tsx                      # Orquestador — renderiza uno u otro componente
└── components/
    ├── [Nombre]Client.tsx        # Versión MÓVIL (lg:hidden en page.tsx)
    └── [Nombre]Desktop.tsx       # Versión ESCRITORIO (hidden lg:block en page.tsx)
```

### Implementación en `page.tsx`

El `page.tsx` actúa como orquestador puro: obtiene los datos del servidor y los pasa a ambos componentes. La visibilidad se controla exclusivamente con CSS (sin JavaScript ni detección de `user-agent`):

```tsx
return (
  <div className="w-full">
    {/* Versión móvil */}
    <div className="lg:hidden">
      <ComponenteClient request={request} catalogs={catalogs} currentUser={session.user} />
    </div>
    {/* Versión escritorio */}
    <div className="hidden lg:block">
      <ComponenteDesktop request={request} catalogs={catalogs} currentUser={session.user} />
    </div>
  </div>
);
```

### Reglas de implementación

- **Sin modificar el componente móvil**: Al implementar el escritorio, el componente móvil existente (`*Client.tsx`) no debe tocarse. Todo el rediseño va al nuevo `*Desktop.tsx`.
- **Props idénticas**: Ambos componentes reciben exactamente las mismas props desde `page.tsx` para evitar lógica dual en el servidor.
- **Server Actions compartidas**: Ambos componentes importan y usan las mismas Server Actions. No duplicar lógica de negocio.
- **Layout de escritorio (Patrón Ingreso)**: Los componentes de escritorio deben seguir la estética del formulario `/mantencion/ingreso`:
  - `h1` + descripción sobre fondo gris al inicio de la página.
  - Header blanco con borde inferior (`border-b`) con controles a la **derecha** (selector principal, fecha, etc.).
  - Un único card grande (`bg-white rounded-xl border shadow-sm`) que engloba todo el contenido.
  - Divisores verticales (`1px bg-border`) para separar zonas dentro del card.
  - Tabs (`shadcn/ui Tabs`) al pie del card, en **ancho completo**, para secciones secundarias.

## 15. Consistencia en Tablas de Listado y Mantenedores

Todas las tablas de listado (ej: `/actividades/listado`) deben mantener **paridad funcional** con los mantenedores (`BaseMaintainer` + `DataTable`):

### Encabezados Sortables (Columnas)
- **Icono de Ordenamiento**: Debe usar `ArrowUp` (↑) para ascendente y `ArrowDown` (↓) para descendente, **no chevrones**.
- **Reserva de Espacio**: Siempre reservar espacio para el icono aunque no haya ordenamiento activo (un `div` vacío de `w-4 h-4`). Evita layout shift.
- **Componente `SortableHeader`**: Las tablas que soporten ordenamiento deben usar un componente reutilizable similar a la implementación en `/organization/areas/columns.tsx`.
- **Configuración Centralizada**: Declarar una constante `SORTABLE_COLUMNS` (objeto booleano) al inicio del componente para definir qué camposexplícitamente son sortables.
- **Visual Feedback**: El botón de ordenamiento debe tener un hover visual (`hover:bg-accent/50` o similar) para indicar que es interactivo.

### Paginación (Footer)
- **Estructura de Tres Secciones**:
  1. **Izquierda**: Total de registros (ej: "Total: 120 registros").
  2. **Centro**: Indicador de página actual (ej: "Página 1").
  3. **Derecha**: Botones de navegación (Primera, Anterior, Siguiente, Última página).
- **Responsividad**: En dispositivos pequeños, ocultar botones de "Primera" y "Última" página (usar `hidden lg:flex`).
- **Selector de Filas por Página**: Si la tabla es paginada, incluir un selector `<Select>` para cambiar cantidad de registros (10, 20, 30, 40, 50, 100).
- **Styling Consistente**: Usar `text-sm text-slate-600 dark:text-slate-400` para texto, con `dark:hover:bg-slate-700` en botones.

### Contenido de Celdas
- **Folio (Identificadores Primarios)**: Nunca debe permitir ruptura de líneas (`whitespace-nowrap`). Si usa más de una línea, ajusta el ancho de columna.
- **Texto Descriptivo**: Limitar con `line-clamp-1` o `truncate` + `max-w-*` para evitar desbordes visuales.
- **Iconos e Indicadores**: Usar `flex-shrink-0` para evitar compresión no deseada. Agrupar múltiples iconos con `gap-1.5`.

### Excepciones
- Las tablas de lectura pura (sin acciones batch) pueden omitir el checkbox de selección.
- Las tablas de un solo item pueden simplificar la paginación si `total < pageSize`.

**Propósito**: Asegurar una experiencia coherente entre mantenedores y listados, mejorando consistencia visual y funcional en toda la aplicación.

## 16. Service Layer Pattern (Arquitectura Avanzada)

Para mantener la lógica de negocio separada de la capa de presentación y facilitar el testing, se debe aplicar el patrón **Service Layer**.

### Estructura de Servicios

```
lib/
└── services/
    ├── actividades/
    │   ├── requirement-service.ts
    │   └── activity-service.ts
    └── mantencion/
        ├── request-service.ts
        └── work-report-service.ts
```

### Reglas de Implementación

- **Ubicación**: Todos los servicios deben residir en `lib/services/[modulo]/`.
- **Nomenclatura**: Usar sufijo `-service.ts` (ej: `requirement-service.ts`).
- **Clase de Servicio**: Cada servicio debe ser una clase TypeScript con métodos públicos para cada operación.
- **Singleton**: Exportar una instancia única del servicio al final del archivo.

### Anatomía de un Servicio

```typescript
export class RequirementService {
  private readonly prisma = prisma;
  private readonly auditLogger = AuditLogger;

  /**
   * Crear un nuevo requerimiento
   */
  async create(data: CreateRequirementInput, userId: string, metadata?: any) {
    // 1. Validar reglas de negocio
    await this.validateBusinessRules(data);

    // 2. Transacción atómica
    return await this.prisma.$transaction(async (tx) => {
      const requirement = await tx.actRequirement.create({...});
      await this.createActivities(tx, requirement.id, data.activities);
      await this.attachFiles(tx, requirement.id, data.attachments);
      await this.auditLogger.log({...});
      return requirement;
    });
  }

  /**
   * Validar reglas de negocio
   */
  private async validateBusinessRules(data: any) {
    if (data.estimatedValue > 10000000) {
      throw new BusinessRuleError("Monto requiere aprobación previa");
    }
  }
}

export const requirementService = new RequirementService();
```

### Errores Personalizados

Definir errores de negocio específicos:

```typescript
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}
```

### Server Actions Simplificadas

Las Server Actions deben ser **thin wrappers** que delegan al servicio:

```typescript
// app/actividades/ingreso/actions.ts
import { requirementService } from "@/lib/services/actividades/requirement-service";

export async function crearRequerimiento(data: CrearRequerimientoData) {
  const session = await verifySession();
  if (!session) return { success: false, error: "No autorizado" };

  try {
    const requirement = await requirementService.create(data, session.user.id);
    return { success: true, data: requirement };
  } catch (error) {
    if (error instanceof BusinessRuleError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}
```

### Beneficios

- ✅ Lógica de negocio testeable de forma aislada
- ✅ Reutilización entre API Routes y Server Actions
- ✅ Transacciones complejas más claras
- ✅ Logging y auditoría centralizada

## 17. Custom Hooks Composables

Para formularios complejos y lógica de UI reutilizable, se deben crear **Custom Hooks Composables** que encapsulen toda la lógica de negocio del cliente.

### Estructura de Hooks

```
lib/
└── hooks/
    ├── query-keys.ts              # Claves centralizadas de React Query
    ├── prefetch-helpers.ts        # Estrategias de prefetching
    ├── actividades/
    │   ├── use-requirements.ts    # Hook de listados (React Query)
    │   └── use-requirement-form.ts # Hook de formulario (React Hook Form)
    └── mantencion/
        ├── use-requests.ts
        └── use-request-form.ts
```

### Anatomía de un Hook de Formulario

```typescript
// lib/hooks/actividades/use-requirement-form.ts
export function useRequirementForm({
  initialData,
  catalogs,
  currentUser,
  isEditing = false,
}: UseRequirementFormProps) {
  // 1. Computar valores por defecto (useMemo)
  const defaultValues = useMemo(() => {...}, [initialData, catalogs]);

  // 2. Inicializar formulario
  const methods = useForm<CrearRequerimientoData>({
    resolver: zodResolver(crearRequerimientoSchema),
    defaultValues,
  });

  // 3. Handlers especializados
  const handleMasterActivitySelect = useCallback((masterId: string) => {
    const master = catalogs.masterActivityNames.find(m => m.id === masterId);
    setValue("title", master.name);
    setValue("description", master.defaultDescription);
  }, [catalogs, setValue]);

  // 4. Validaciones custom
  const validateDates = useCallback(() => {
    const estimatedDate = watch("estimatedDate");
    const activities = watch("actividades");
    // Lógica de validación...
  }, [watch]);

  // 5. Retornar API del hook
  return {
    methods,
    handlers: { handleMasterActivitySelect, addActivity, removeActivity },
    validators: { validateDates, validateAmounts },
    state: { isValid, isEditing },
  };
}
```

### Uso en Componentes

```typescript
// Componente simplificado
export default function RequirementForm({ catalogs, currentUser }) {
  const { methods, handlers, validators, state } = useRequirementForm({
    catalogs,
    currentUser,
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {/* Formulario limpio sin lógica */}
      </form>
    </FormProvider>
  );
}
```

### Beneficios

- ✅ Componentes más livianos (< 300 líneas)
- ✅ Lógica testeable de forma aislada
- ✅ Reutilización entre Client/Desktop
- ✅ Separación clara de concerns

## 18. Query Keys y Prefetching Estratégico

Para optimizar el rendimiento percibido (perceived performance), se debe implementar una estrategia de **prefetching inteligente** con React Query.

### Query Keys Centralizadas

```typescript
// lib/hooks/query-keys.ts
export const actividadesQueryKeys = {
  all: ['actividades'] as const,
  lists: () => [...actividadesQueryKeys.all, 'list'] as const,
  list: (filters: Filters) => [...actividadesQueryKeys.lists(), filters] as const,
  details: () => [...actividadesQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...actividadesQueryKeys.details(), id] as const,
  
  catalogs: {
    all: ['actividades', 'catalogs'] as const,
    masterActivities: ['actividades', 'catalogs', 'master-activities'] as const,
    users: ['actividades', 'catalogs', 'users'] as const,
  },
};
```

### Estrategias de Prefetching

#### 1. Prefetching en Hover (Links)

```typescript
<Link 
  href={`/actividades/${req.id}`}
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: actividadesQueryKeys.detail(req.id),
      queryFn: () => getRequirementDetail(req.id),
    });
  }}
>
  Ver Detalle
</Link>
```

#### 2. Prefetching de Catálogos al Montar

```typescript
// app/(dashboard)/actividades/layout.tsx
"use client";

export default function ActividadesLayout({ children }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Precargar catálogos al entrar al módulo
    prefetchActivityCatalogs(queryClient);
  }, [queryClient]);

  return <>{children}</>;
}
```

#### 3. Prefetching de Página Siguiente

```typescript
// En componente de listado
useEffect(() => {
  if (data?.total && currentPage * pageSize < data.total) {
    // Precargar siguiente página
    prefetchNextPage(queryClient, currentPage, filters);
  }
}, [currentPage, data, filters, queryClient]);
```

### Invalidación Granular

```typescript
// Helpers de invalidación
export const queryInvalidation = {
  invalidateRequirementLists: (queryClient: any) => {
    queryClient.invalidateQueries({ 
      queryKey: actividadesQueryKeys.lists() 
    });
  },
  
  invalidateRequirement: (queryClient: any, id: string) => {
    queryClient.invalidateQueries({ 
      queryKey: actividadesQueryKeys.detail(id) 
    });
  },
};
```

### Stale Times Configurados

```typescript
export const staleTimes = {
  catalogs: 5 * 60 * 1000,    // 5 minutos (cambian poco)
  lists: 30 * 1000,            // 30 segundos (actualizaciones frecuentes)
  details: 60 * 1000,          // 1 minuto
  realtime: 15 * 1000,         // 15 segundos (alta interactividad)
};
```

### Beneficios

- ✅ Navegación instantánea (perceived performance)
- ✅ Invalidación granular (no refetch de todo)
- ✅ Type-safety en query keys
- ✅ Reducción de llamadas redundantes

## 19. Aplicación de Mejoras en Futuros Módulos

Todos los nuevos módulos desarrollados **DEBEN** seguir estas arquitecturas avanzadas desde el inicio:

### Checklist de Implementación

Al crear un nuevo módulo, asegurarse de implementar:

- [ ] **Service Layer**: Crear servicio en `lib/services/[modulo]/` con lógica de negocio
- [ ] **Custom Hooks**: Crear hooks composables en `lib/hooks/[modulo]/` para formularios
- [ ] **Query Keys**: Definir query keys centralizadas en `lib/hooks/query-keys.ts`
- [ ] **Prefetching**: Implementar estrategia de prefetch en hover y navegación
- [ ] **Error Handling**: Usar errores de negocio personalizados (`BusinessRuleError`, `ValidationError`)
- [ ] **Transacciones**: Usar `$transaction` para operaciones complejas
- [ ] **Auditoría**: Registrar todas las acciones críticas con `AuditLogger`

### Ejemplo de Estructura Completa

```
app/
└── [nuevo-modulo]/
    ├── layout.tsx                          # Layout con prefetch de catálogos
    ├── page.tsx                            # Listado principal
    ├── ingreso/
    │   ├── page.tsx                        # Orquestador (Server Component)
    │   ├── actions.ts                      # Thin wrappers a servicios
    │   └── components/
    │       ├── IngresoClient.tsx           # Vista móvil
    │       └── IngresoDesktop.tsx          # Vista escritorio
    └── [id]/
        ├── page.tsx
        └── components/
            ├── DetalleClient.tsx
            └── DetalleDesktop.tsx

lib/
├── services/
│   └── [nuevo-modulo]/
│       └── [entidad]-service.ts           # Lógica de negocio
├── hooks/
│   └── [nuevo-modulo]/
│       ├── use-[entidades].ts             # Query hook (listados)
│       └── use-[entidad]-form.ts          # Form hook (formularios)
└── validations/
    └── [nuevo-modulo].ts                  # Esquemas Zod

components/
└── [nuevo-modulo]/
    └── [Componente].tsx
```

### Orden de Implementación Recomendado

1. **Sprint 1**: Service Layer + Errores personalizados
2. **Sprint 1**: Custom Hooks para formularios
3. **Sprint 2**: Query Keys + Prefetching básico
4. **Sprint 2**: Optimizaciones (prefetch avanzado, optimistic updates)
5. **Sprint 3**: Testing unitario de servicios

### Validación de Cumplimiento

Antes de considerar un módulo "completo", verificar:

- ✅ Server Actions < 100 líneas (lógica delegada a servicios)
- ✅ Componentes de formulario < 300 líneas (lógica en hooks)
- ✅ Todas las queries usan query keys centralizadas
- ✅ Prefetching implementado en links principales
- ✅ Transacciones atómicas para operaciones críticas
- ✅ Auditoría en todas las mutaciones

**Propósito**: Mantener la arquitectura escalable, testeable y mantenible a lo largo de todo el proyecto, evitando deuda técnica y facilitando el onboarding de nuevos desarrolladores.

## 20. Sistema de Permisos por Módulo

Para mantener la escalabilidad y consistencia al agregar nuevos módulos operativos con permisos y notificaciones:

### Arquitectura de Permisos

- **Centralización**: Todos los permisos operativos deben gestionarse desde `/mantenedores/usuarios/[id]` en una pestaña dedicada "Permisos por Módulo"
- **Normalización**: Usar tablas relacionales (`modules`, `module_permissions`, `user_module_permissions`) en lugar de JSON en `app_setting`
- **Service Layer**: Toda lógica de permisos debe pasar por `lib/services/permissions/module-permission-service.ts`
- **Documentación**: Ver `docs/propuesta-sistema-permisos-centralizado.md` para diseño completo

### Estructura de Base de Datos

```prisma
model Module {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  code        String   @unique  // 'actividades', 'mantencion', 'inventario'
  name        String
  icon        String?  // Nombre de icono Lucide
  isActive    Boolean  @default(true)
  emailEnabled Boolean @default(true)  // Switch global de notificaciones
  
  permissions          ModulePermission[]
  userPermissions      UserModulePermission[]
  notificationSettings ModuleNotificationSetting[]
  approvalRules        ModuleApprovalRule[]
}

model ModulePermission {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  moduleId    String
  code        String   // 'autoriza', 'chequea', 'recepciona'
  name        String
  description String?
  category    String?  // 'approval', 'operation', 'admin'
  
  module      Module   @relation(fields: [moduleId], references: [id])
  userPermissions UserModulePermission[]
  
  @@unique([moduleId, code])
}

model UserModulePermission {
  id           String   @id @default(dbgenerated("gen_random_uuid()"))
  userId       String
  moduleId     String
  permissionId String
  grantedAt    DateTime @default(now())
  grantedBy    String?
  expiresAt    DateTime?
  
  user       User             @relation(fields: [userId], references: [id])
  module     Module           @relation(fields: [moduleId], references: [id])
  permission ModulePermission @relation(fields: [permissionId], references: [id])
  
  @@unique([userId, permissionId])
}
```

### Agregar Permisos a un Nuevo Módulo

1. **Crear el módulo** (en seed o migración):
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

2. **Definir permisos del módulo**:
```typescript
await prisma.modulePermission.createMany({
  data: [
    {
      moduleId: inventario.id,
      code: 'gestiona_stock',
      name: 'Gestionar Stock',
      description: 'Puede ajustar inventario y realizar movimientos',
      category: 'operation',
    },
    {
      moduleId: inventario.id,
      code: 'aprueba_compras',
      name: 'Aprobar Órdenes de Compra',
      description: 'Autoriza órdenes de compra mayores',
      category: 'approval',
    },
  ],
});
```

3. **Verificar permisos en código**:
```typescript
// En Server Actions o API Routes
import { modulePermissionService } from '@/lib/services/permissions/module-permission-service';

const hasPermission = await modulePermissionService.userHasPermission(
  session.user.id,
  'inventario',
  'gestiona_stock'
);

if (!hasPermission) {
  return { success: false, error: 'No autorizado' };
}
```

### Service Layer de Permisos

Crear `lib/services/permissions/module-permission-service.ts`:

```typescript
export class ModulePermissionService {
  /**
   * Verificar si un usuario tiene un permiso específico
   */
  async userHasPermission(
    userId: string,
    moduleCode: string,
    permissionCode: string
  ): Promise<boolean> {
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
  async getUserPermissions(
    userId: string,
    moduleCode: string
  ): Promise<string[]> {
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
}

export const modulePermissionService = new ModulePermissionService();
```

### UI Centralizada

Componente `PermissionsTab` en `/mantenedores/usuarios/[id]`:

- **Tabs dinámicos**: Uno por cada módulo activo en `modules` table
- **Categorización**: Agrupar permisos por `category` (Aprobaciones, Operaciones, Admin)
- **Badge contador**: Mostrar cantidad de permisos activos por módulo
- **Checkbox interactivo**: Toggle para otorgar/revocar permisos
- **Descripción clara**: Cada permiso muestra su `name` y `description`

### Notificaciones por Módulo

Usar tabla `ModuleNotificationSetting`:

```typescript
model ModuleNotificationSetting {
  id          String   @id @default(dbgenerated("gen_random_uuid()"))
  moduleId    String
  eventKey    String   // 'onNewRequest', 'onApproval'
  eventName   String
  description String?
  isEnabled   Boolean  @default(true)
  recipients  Json?    // { type: 'role' | 'user', ids: [...] }
  
  module Module @relation(fields: [moduleId], references: [id])
  
  @@unique([moduleId, eventKey])
}
```

**Gestión Centralizada**: Las notificaciones se administran desde `/mantenedores/notificaciones` con tabs dinámicos por módulo.

**Switch Global por Módulo**: El modelo `Module` incluye el campo `emailEnabled` (Boolean, default: true) que actúa como master switch:
- Cuando `emailEnabled = false`, todas las notificaciones del módulo están deshabilitadas, sin importar el estado individual de cada evento.
- En el componente `ModuleNotificationsManager`, el switch global deshabilita visualmente todos los toggles de eventos cuando está apagado (opacity reducida, `disabled=true`).
- API Endpoint: `PATCH /api/v1/notifications/modules/[moduleCode]/toggle-global` actualiza el campo `emailEnabled`.
- Esta funcionalidad permite a los administradores deshabilitar todas las notificaciones de un módulo de golpe sin tener que desactivar cada evento individualmente.

### Reglas de Aprobación

Para reglas como "Aprobación Cruzada" de mantención:

```typescript
model ModuleApprovalRule {
  id            String   @id @default(dbgenerated("gen_random_uuid()"))
  moduleId      String
  ruleKey       String   // 'crossApproval', 'autoApproval'
  ruleName      String
  description   String?
  isEnabled     Boolean  @default(false)
  configuration Json?    // { crossApprovers: [userId] }
  
  module Module @relation(fields: [moduleId], references: [id])
  
  @@unique([moduleId, ruleKey])
}
```

### Prohibiciones

- ❌ **No** usar `app_setting` con JSON para nuevos permisos
- ❌ **No** crear rutas `/[modulo]/configuracion/sistema` separadas
- ❌ **No** duplicar lógica de permisos en cada módulo
- ❌ **No** almacenar permisos como strings hardcodeados en el código

### Ventajas

- ✅ **Escalabilidad**: Agregar módulo = INSERT en tablas, sin código
- ✅ **Auditoría**: `grantedBy`, `grantedAt` en cada permiso
- ✅ **Integridad**: Foreign keys con CASCADE automático
- ✅ **UX unificada**: Una sola ubicación para todos los permisos
- ✅ **Expiración**: Campo `expiresAt` para permisos temporales
- ✅ **Queries eficientes**: Índices y JOINs nativos vs parsing JSON

**Propósito**: Eliminar la necesidad de refactoring al agregar nuevos módulos operativos, manteniendo una arquitectura limpia y escalable.
### Sistema de Notificaciones Basado en Permisos

El sistema de notificaciones implementa una arquitectura **multi-nivel** donde las notificaciones se envían automáticamente a los usuarios según sus permisos operativos, con capacidad de personalización individual.

#### Arquitectura de Decisión

```
¿Módulo activo y emailEnabled? NO → No enviar
                               SÍ ↓
¿Notificación habilitada globalmente? NO → No enviar
                                      SÍ ↓
¿Usuario tiene algún permiso requerido? NO → No enviar
                                         SÍ ↓
¿Usuario tiene opt-out activo? SÍ → No enviar
                                NO → ✅ ENVIAR
```

#### Estructura de Base de Datos

```prisma
model ModuleNotificationSetting {
  id                  String   @id @default(dbgenerated("gen_random_uuid()"))
  moduleId            String
  eventKey            String   // 'onNewRequest', 'onApproval'
  eventName           String
  description         String?
  isEnabled           Boolean  @default(true)
  requiredPermissions String[] // ['autoriza', 'chequea'] - Permisos que dan acceso
  template            String?
  
  module Module @relation(fields: [moduleId], references: [id])
  
  @@unique([moduleId, eventKey])
}

model UserNotificationPreference {
  id         String   @id @default(dbgenerated("gen_random_uuid()"))
  userId     String
  moduleCode String
  eventKey   String
  isOptedOut Boolean  @default(false) // Usuario desactiva notificación para sí mismo
  
  user User @relation("UserNotificationPreferences", fields: [userId], references: [id])
  
  @@unique([userId, moduleCode, eventKey])
}
```

#### Configuración Global (`/mantenedores/notificaciones` - Solo ADMIN)

- Muestra **TODOS los módulos activos** en tabs dinámicos
- Por cada evento de notificación:
  - ✅ Habilitar/Deshabilitar globalmente
  - ✅ **Vinculación a Permisos**: Define qué permisos dan acceso a recibir esa notificación
  - Ejemplo: "Nuevo Requerimiento" → requiredPermissions: ["autoriza", "chequea"]
- Switch global por módulo (`emailEnabled`) para deshabilitar todas las notificaciones del módulo de golpe

#### Preferencias Personales (`/perfil/notificaciones` - Cada usuario)

- **Filtrado Automático**: Solo muestra notificaciones donde el usuario tiene al menos uno de los permisos requeridos
- **No puede activar** notificaciones deshabilitadas globalmente
- **Puede hacer opt-out** de notificaciones específicas que le corresponden
- Tabs dinámicos por módulo (solo módulos donde tiene permisos)

#### Service Layer (`lib/services/notifications/notification-service.ts`)

```typescript
export class NotificationService {
  /**
   * Determina si un usuario debe recibir una notificación
   */
  async shouldUserReceiveNotification(
    userId: string,
    moduleCode: string,
    eventKey: string
  ): Promise<boolean>;

  /**
   * Obtiene configuración de notificaciones filtrada por permisos del usuario
   */
  async getUserNotificationConfig(userId: string): Promise<UserNotificationConfig[]>;

  /**
   * Establece preferencia de opt-out
   */
  async setUserNotificationPreference(
    userId: string,
    moduleCode: string,
    eventKey: string,
    isOptedOut: boolean
  ): Promise<void>;

  /**
   * Obtiene IDs de usuarios que deben recibir una notificación (para envío masivo)
   */
  async getUsersForNotification(
    moduleCode: string,
    eventKey: string
  ): Promise<string[]>;
}
```

#### API Routes

- `GET /api/v1/notifications/modules` - Módulos activos con notificaciones (para admin)
- `PATCH /api/v1/notifications/modules/[moduleCode]/events/[eventKey]` - Toggle global de notificación
- `PATCH /api/v1/notifications/modules/[moduleCode]/toggle-global` - Toggle switch maestro del módulo
- `GET /api/v1/notifications/preferences` - Configuración personal del usuario actual
- `PATCH /api/v1/notifications/preferences` - Actualizar opt-out personal

#### Ejemplo de Vinculación Notificación-Permisos

**Seed de Actividades:**
```typescript
{
  eventKey: "onNewRequest",
  eventName: "Nuevo Requerimiento",
  isEnabled: true,
  requiredPermissions: ["autoriza", "chequea", "revisa"], // Quienes pueden procesar
}
```

**Seed de Mantención:**
```typescript
{
  eventKey: "onApproval",
  eventName: "Aprobaciones y Rechazos",
  isEnabled: true,
  requiredPermissions: ["aprueba", "aprobacion_cruzada"], // Quienes aprueban
}
```

#### Escalabilidad Modular

Al agregar un nuevo módulo (ej: Inventario):
1. Crear módulo en tabla `modules`
2. Crear permisos (`gestiona_stock`, `aprueba_compras`)
3. Crear notificaciones **vinculadas a esos permisos**:
   ```typescript
   {
     eventKey: "onLowStock",
     requiredPermissions: ["gestiona_stock"],
     isEnabled: true
   }
   ```
4. **Sin tocar código**: Las interfaces ya muestran automáticamente:
   - `/mantenedores/notificaciones`: Nueva tab con el módulo
   - `/perfil/notificaciones`: Usuarios con permisos de inventario ven sus notificaciones

#### Prohibiciones

- ❌ **No** usar destinatarios por rol (todo se basa en permisos)
- ❌ **No** hardcodear listas de usuarios en notificaciones
- ❌ **No** crear configuraciones de notificaciones fuera de `module_notification_settings`
- ❌ **No** permitir que usuarios activen notificaciones si no tienen los permisos requeridos

#### Ventajas

- ✅ **Precisión**: Solo reciben notificaciones quienes pueden actuar
- ✅ **Autonomía**: Usuarios pueden personalizar sin afectar a otros
- ✅ **Auditoría**: Historial completo de opt-outs
- ✅ **Escalabilidad**: Agregar módulo = agregar registros, sin código
- ✅ **Rendimiento**: Queries eficientes con índices en permisos y preferencias
- ✅ **UX consistente**: Una sola ubicación para cada tipo de configuración