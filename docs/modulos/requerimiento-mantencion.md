# Módulo Principal: Sistema de Mantenimiento (`/mantencion`)

## Descripción y Propósito General

Este documento define la arquitectura lógica y el flujo funcional para la construcción de un módulo robusto de Mantenimiento. Su objetivo es registrar, dar seguimiento y resolver requerimientos (incidencias o fallas) en los activos de la empresa, abarcando desde que un usuario levanta la alerta, pasando por la aprobación de la jefatura, hasta la intervención técnica y el cierre final. El módulo operará de forma independiente bajo la ruta raíz `/mantencion`.

> [!IMPORTANT]
> **Optimización Multi-dispositivo**: Este módulo será utilizado en partes iguales desde dispositivos celulares y computadores, por lo tanto, las interfaces deben estar optimizadas para ambas visualizaciones (Mobile-First / Adaptativo). De ser necesario, se podrán crear componentes especializados para cada vista, permitiendo ofrecer interfaces específicas que garanticen una experiencia de usuario fluida y funcional en cualquier resolución.

## Vistas del Módulo y Reglas de Visibilidad

### 1. Ingreso de Requerimiento (`/mantencion/ingreso`)

Página orientada al usuario operativo para registrar la solicitud inicial.

- **Funcionalidad Principal**: Selector en cascada donde el usuario define la ubicación progresiva del problema (Instalación -> Área -> Sistema -> Equipo) y describe el tipo de falla.
- **Buscador Global de Equipos**: Para acelerar el proceso, se incluirá un buscador tipo "Command Palette" o Modal donde el usuario puede escribir cualquier fragmento del nombre del equipo, área, sistema o instalación. Al seleccionar un resultado, el selector en cascada se auto-completará con los valores jerárquicos correspondientes.
- **Evidencia Fotográfica**: El sistema permitirá adjuntar múltiples imágenes como evidencia inicial. La arquitectura de almacenamiento será agnóstica al proveedor, permitiendo configurar servicios como **Cloudflare R2** o **Cloudinary** según se requiera.
- **Manejo de Permisos (Instalaciones)**:
  - Las opciones que se despliegan en el selector de "Instalación" dependen estrictamente de las instalaciones que le hayan sido asignadas al usuario activo en su perfil.
  - **Excepción Administrador**: Un usuario con el rol o bandera de Administrador Global no requiere tener asignaciones individuales y podrá ver el listado total de las instalaciones de la organización de manera predeterminada.

#### Mockup Visual (Ingreso):

```text
+-------------------------------------------------------------+
| [ BUSCAR EQUIPO GLOBAL (LUPA) ] <--- Abre Modal de Búsqueda |
+-------------------------------------------------------------+
| NAVE/INSTALACIÓN: [ Seleccione Nave v ]                     |
| ÁREA:             [ Seleccione Área v ]                     |
| SISTEMA:          [ Seleccione Sistema v ]                  |
| EQUIPO:           [ Seleccione Equipo v ]                   |
+-------------------------------------------------------------+
| TIPO DE FALLA:    [ Seleccione Tipo v ]                     |
| DESCRIPCIÓN:                                                |
| [                                                         ] |
| [                                                         ] |
+-------------------------------------------------------------+
| EVIDENCIA (FOTOS): [ [+] AGREGAR IMAGENES ]                 |
+-------------------------------------------------------------+
|                          [ ENVIAR REQUERIMIENTO ]           |
+-------------------------------------------------------------+
```

#### Mockup Visual (Buscador Global - Modal):

```text
+-------------------------------------------------------------+
| BUSCAR EQUIPOS                                          [X] |
| Filtra por nombre del equipo, área, sistema o instalación.  |
+-------------------------------------------------------------+
| [ buscar equipo, área, sistema...                       ] |
+-------------------------------------------------------------+
| A.I.S. (Clase A) (Furuno - FA-170)                          |
| Área: Puente de gobierno • Sistema: Equipos                 |
| Instalación: Rio dulce IV             [Click p/ seleccionar]|
+-------------------------------------------------------------+
| Compas Satelital (Furuno - SC-70)                           |
| Área: Puente de gobierno • Sistema: Equipos                 |
| Instalación: Rio dulce IV             [Click p/ seleccionar]|
+-------------------------------------------------------------+
| [ CERRAR ]                               [ USAR SELECCIONADO ] |
+-------------------------------------------------------------+
```

### 2. Bandeja de Aprobaciones (`/mantencion/pendientes`)

Buzón gerencial o de jefaturas diseñado para dar "luz verde" a los trabajos reportados, filtrando las incidencias recién ingresadas.

- **Funcionalidad Principal**: Listar todas aquellas solicitudes en estado de revisión y permitir la acción de "Aprobar" o "Rechazar".
- **Manejo de Permisos (Visibilidad y Aprobación)**:
  - El usuario debe poseer un permiso o rol explícito que lo autorice como "Aprobador", el cual le permitirá ver y gestionar la bandeja.
  - El listado de solicitudes por aprobar se filtra obligatoriamente de acuerdo a las instalaciones que el aprobador tenga asignadas (sólo verá los problemas de su recinto/flota).
  - **Excepción Administrador**: De forma análoga al ingreso, los Administradores Globales tienen una vista panorámica de toda la empresa y pueden aprobar cualquier requerimiento existente sin restricciones geográficas.
- **Configuraciones de Aprobación**:
  - **Auto-Aprobación**: El sistema debe permitir configurar (vía ajustes maestros) si ciertos tipos de solicitudes o instalaciones permiten la "Auto-Aprobación". En este caso, el requerimiento se marca como aprobado automáticamente al ser creado, saltando este paso manual.
  - **Permisos de Aprobación Cruzada**: Se debe poder configurar si un usuario tiene permiso para aprobar solicitudes de otros usuarios, incluso si comparten el mismo rol. Esto permite que, mediante una asignación de permiso específica, un usuario pueda actuar como validador de sus pares si la operación lo requiere.

#### Mockup Visual (Pendientes):

```text
+--------------------------------------------------------------------------------------------------+
| SOLICITUDES POR APROBAR                                                                          |
+-------+------------+----------------+-------------+-------------+------------+-------+-----------+
| FOLIO | EQUIPO     | TIPO           | DESCRIPCIÓN | INSTALACIÓN | INGRESO    | FOTOS | OPCIONES  |
+-------+------------+----------------+-------------+-------------+------------+-------+-----------+
| 1024  | Generador 1| C. Preventiva  | Ruido raro  | Nave Blue   | 21/02/2026 | [I](2)| [OK] [X]  |
| 1025  | Bomba H2O  | C. Correctiva  | Fuga sello  | Planta Sur  | 22/02/2026 | [I](1)| [OK] [X]  |
+-------+------------+----------------+-------------+-------------+------------+-------+-----------+
```

### 3. Consolidado y Gestión (`/mantencion/consolidado`)

El centro de comando técnico ("Dashboard") para el seguimiento maestro, organizado en tres pestañas principales para separar el flujo operativo del administrativo.

- **Pestaña 1: Solicitudes de Mantención**: Listado completo de incidencias internas.
  - **Acción Multi-Selección**: Permite marcar varios requerimientos para "Crear Requerimiento de Trabajo" masivo.
  - **Filtros Avanzados**: Búsqueda por folio, equipo, sistema, instalación y estado.
- **Pestaña 2: Requerimiento de Trabajo**: Listado de órdenes enviadas a proveedores externos.
  - **Trazabilidad**: Muestra Folio RT, Proveedor, Título, Estado, N° OC y Fecha de Creación.
  - **Gestión Administrativa**: Permite asociar N° de Factura, Valores y Órdenes de Compra.
- **Pestaña 3: Solicitudes por Aprobar**: Acceso rápido a requerimientos en estado "SOLICITADO" o "PENDIENTE", optimizando el flujo de aprobación de jefaturas.

#### Flujo de Requerimiento de Trabajo (RT)

Cuando un requerimiento no puede ser resuelto internamente, se genera un documento de "Tercerización" formalizado como **Requerimiento de Trabajo**.

1. **Creación**: Se seleccionan las solicitudes en el Consolidado y se pulsa "Crear requerimiento de trabajo".
2. **Modal de Ingreso**:
   - **Proveedor**: Selección obligatoria del Maestro de Proveedores.
   - **Título y Descripción**: Resumen del servicio a contratar.
   - **Adjuntos de Respaldo**: Cotizaciones, correos o fotos adicionales.
3. **Generación de Folio**:
   - El sistema genera un folio único con el formato `[PREFIJO]-[SECUENCIAL]`.
   - El **Prefijo** (ej: `RT`, `WR`, `OTX`) es totalmente configurable desde los ajustes maestros del módulo.
4. **Seguimiento**: El RT tiene sus propios estados (Pendiente, Aprobado, OC Generada, Facturado, Finalizado), permitiendo un control financiero y operativo independiente de la falla técnica original.
5. **Relación de Datos (Modelo Técnico)**:
   - Un **Requerimiento de Trabajo (RT)** puede agrupar múltiples **Solicitudes de Mantención** (Relación M:N via `mnt_work_requirement_relations`).
   - Los campos administrativos incluyen: N° de Orden de Compra (`oc_number`), Valor OC (`oc_value`), N° de Factura (`invoice_number`), Valor Factura (`invoice_value`) y N° de Requisición (`requisition_number`).
   - El sistema mantiene la auditoría del creador y las fechas de actualización para cada RT.

#### Mockup Visual (Consolidado Adaptativo):

```text
+----------------------------------------------------------------------------------+
| [ SOLICITUDES (15) ]  [ REQ. TRABAJO (3) ]  [ POR APROBAR (2) ]  <-- Tabs        |
+----------------------------------------------------------------------------------+
| Buscar equipo... [Sistemas v] [Instalación v] [Estado v]         [Exportar Excel]|
+----+-------+--------------------+-----------+----------------+-------+-----------+
| [x]| FOLIO | EQUIPO             | SISTEMA   | SOLICITANTE    | ESTADO| ACCIÓN    |
+----+-------+--------------------+-----------+----------------+-------+-----------+
| [ ]| RD4-2 | A.I.S. (Clase A)   | Equipos   | Jorge Vial     | [SOL] | [...]     |
| [x]| RD4-1 | TDA (K) Cubierta 1 | Tablero   | C. Sepúlveda   | [SOL] | [...]     |
+----+-------+--------------------+-----------+----------------+-------+-----------+
| 1 de 2 filas seleccionadas.                  [ CREAR REQUERIMIENTO TRABAJO ]     |
+----------------------------------------------------------------------------------+
```

#### Mockup Visual (Modal Crear RT):

```text
+-----------------------------------------------------------------------+
| CREAR REQUERIMIENTO DE TRABAJO                                    [X] |
+-----------------------------------------------------------------------+
| PROVEEDOR: [ Busque proveedor... v ] * Obligatorio                   |
| TÍTULO:    [ Nombre de la orden... ] *                                |
|                                                                       |
| DESCRIPCIÓN:                                                          |
| [ Describa el trabajo solicitado al externo...                      ] |
| [                                                                   ] |
|                                                                       |
| ADJUNTOS:  [ [+] ADJUNTAR COTIZACIÓN O FOTOS ]                        |
+-----------------------------------------------------------------------+
| [ CANCELAR ]                          [ CREAR REQUERIMIENTO TRABAJO ] |
+-----------------------------------------------------------------------+
```

### 4. Configuración del Módulo (`/mantencion/configuracion`)

Página centralizada para la gestión de preferencias y reglas de negocio del módulo, organizada en pestañas según el nivel de acceso (Usuario/Administrador).

#### Pestaña A: Mis Notificaciones (Personal)

Gestión individual de alertas para el usuario activo.

- **Notificaciones por Email**: Toggle Global.
- **Eventos a Notificar**:
  - **Nueva Solicitud**: "Recibir correo cuando se cree un requerimiento en mis instalaciones".
  - **Cambios de Estado**: "Notificarme aprobaciones, rechazos y avances (Tercerizar/In Situ)".
  - **Reprogramaciones**: "Avisarme si cambian las fechas estimadas".
  - **Cierre y Reportes**: "Recibir el PDF de cierre técnico".

#### Pestaña B: Reglas de Aprobación (Administrativo)

Configuración de la lógica de validación de requerimientos.

- **Auto-Aprobación**: Matriz de configuración para definir qué **Tipos de Requerimiento** o **Instalaciones** no requieren validación manual y pasan directo a "En Proceso".
- **Aprobación Cruzada**: Opción para permitir que jefaturas de una instalación puedan validar requerimientos de otra en caso de contingencia.
- **Jerarquía de Firmas**: Vinculación de Cargos/Responsables con los reportes generados.

#### Pestaña C: Almacenamiento y Sistema (Global)

Parámetros técnicos del módulo.

- **Proveedor de Evidencia**: Selector para definir el backend de imágenes (**Cloudflare R2** / **Cloudinary**) y sus respectivos endpoints.
- **Trazabilidad de Gastos**: Definir niveles de obligatoriedad para el registro de costos (Repuestos/Mano de Obra) al finalizar el trabajo.
- **Configuración de Gráficos**: Parámetros para la generación del dashboard de gastos por Equipo, Área y Sistema.

#### Mockup Visual (Configuración):

```text
+-----------------------------------------------------------------------+
| [ MIS NOTIFICACIONES ] [ REGLAS APROBACIÓN ] [ SISTEMA GLOBAL ]       |
+-----------------------------------------------------------------------+
| (•) Notificaciones por Email (Global)                                 |
|                                                                       |
| [-] Alertas por Nueva Solicitud                                       |
| [-] Alertas por Aprobación/Rechazo                                    |
| [x] Alertas por Cambio de Estado (Tercerizar/In Situ)                 |
| [x] Alertas por Reprogramación                                        |
| [-] Alertas por Cierre (PDF)                                          |
+-----------------------------------------------------------------------+
|                                                      [ GUARDAR ]      |
+-----------------------------------------------------------------------+
```

## Reglas de Negocio y Automatizaciones

1. **Gestión de Equipos, Responsables y Alertas**
   - **Sistema de Notificaciones Escalable**: Cada usuario tendrá un panel de **Preferencias de Notificación** (Checks: Creación, Cambio de Estado, Cierre, Reprogramación).
   - **Responsables Técnicos**: Un equipo puede tener múltiples técnicos responsables asociados.

2. **Flujo de Vida del Requerimiento**
   - **Estados Técnicos**: Pendiente -> Aprobado -> En Proceso -> **Reparación a Terceros (Tercerizar)** -> Finalizado.
   - **Tercerización**: Si el equipo técnico interno no puede resolver el requerimiento, se cambia al estado "Reparación a Terceros" para ser gestionado por un colaborador externo.
   - **Reprogramaciones**: Posibilidad de registrar hasta 3 fechas estimadas de solución con justificación.

---

## Trazabilidad y Auditoría (Historial de Vida del Equipo)

Para garantizar un mantenimiento predictivo y correctivo eficiente, el sistema implementa:

1.  **Timeline del Evento**: Cada reporte de falla genera un historial de "quién movió el estado", con comentarios obligatorios en caso de reprogramación o rechazo.
2.  **Historial por Activo**: Al seleccionar un equipo, el sistema debe permitir ver una pestaña de "Historial de Mantención" que compile todos los reportes (Mantenimiento) y proyectos (Actividades) pasados, facilitando el diagnóstico de fallas recurrentes.
3.  **Registro de Firmas Digitales**: Captura del ID, nombre y timestamp de los aprobadores gerenciales en cada etapa crítica.

---

## Soporte y Dependencia de Catálogos (Mantenedores Base)

A continuación se detallan los campos (Labels) exhaustivos para cada mantenedor, los cuales servirán de guía para el diseño de la base de datos:

### 1. Maestro de Instalaciones (Naves/Recintos)

- **Nombre** (Label: "Nombre" \*)
- **Folio** (Label: "Folio")
- **Código Interno** (Label: "Código Interno")
- **Tipo de Instalación** (Label: "Tipo de Instalación" - Selector)
- **Latitud** (Label: "Latitud")
- **Longitud** (Label: "Longitud")
- **Centro de Cultivo** (Label: "Centro de Cultivo" - Selector)
- **Descripción** (Label: "Descripción")
- **Observaciones** (Label: "Observaciones")
- **Estado** (Label: "Activa" - Toggle)
- **Crear Usuario** (Label: "Crear cuenta de usuario" - Condicional):
  - **Username** (Label: "Username")
  - **Email** (Label: "Email" \*)
  - **Contraseña** (Label: "Contraseña" \*)

### 2. Maestro de Áreas

- **Nombre** (Label: "Nombre" \*)
- **Descripción** (Label: "Descripción")
- **Firma de Informe** (Label: "Firma de Informe" - Selector de firmas maestros)

### 3. Maestro de Sistemas (Subáreas)

- **Área** (Label: "Área" \* - Selector)
- **Nombre** (Label: "Nombre" \*)
- **Descripción** (Label: "Descripción")

### 4. Maestro de Equipos

- **Nombre** (Label: "Nombre del Equipo" \*)
- **Marca** (Label: "Marca")
- **Modelo** (Label: "Modelo")
- **Número de Parte** (Label: "N° de Parte")
- **Serie** (Label: "N° de Serie/Chasis")
- **Área** (Label: "Área" \* - Selector)
- **Sistema** (Label: "Sistema" \* - Selector)
- **Comentarios** (Label: "Comentarios Técnicos")
- **Instrucciones previas** (Label: "Instrucciones previas a solicitud")
- **Vida Útil** (Label: "Vida Útil Estimada")
- **Puesta en marcha** (Label: "Fecha Puesta en Marcha")
- **Imagen de Referencia** (Adjunto + Label: "Descripción de Imagen")
- **Ficha Técnica** (Adjunto + Label: "Descripción de Documento")
- **Precio de Referencia** (Label: "Valor Referencial de Adquisición")
- **Responsables** (Relación múltiple con usuarios técnicos)

### 5. Maestro de Solicitantes

- **Nombre** (Label: "Nombre" \*)
- **Email** (Label: "Email")
- **Cargo** (Label: "Cargo (seleccione)")
- **Firma de Informe** (Adjunto/Firma Digital): Imagen para estampación automática en reportes.
- **Instalación** (Label: "Instalación" \*): Restricción de acceso "Solo tendrá acceso a la instalación seleccionada".

### 6. Maestro de Responsables

- **Usuario** (Label: "Usuario" \* - Selector de usuarios de sistema)
- **Nombre** (Label: "Nombre" \*)
- **Área** (Label: "Área" \* - Selector de áreas técnicas)

### 7. Maestro de Proveedores

- **RUT Proveedor** (Label: "RUT Proveedor" \*)
- **Giro** (Label: "Giro" \*)
- **Razón Social** (Label: "Razón Social")
- **Nombre Fantasía** (Label: "Nombre Fantasía")
- **Contacto** (Label: "Contacto")
- **Teléfono** (Label: "Teléfono")
- **Email Contacto** (Label: "Email Contacto")
- **Emails para actividades** (Label: "Gestionar Emails"): Lista de correos para envío automático de reportes.
- **Dirección** (Label: "Dirección")

### 8. Maestro de Cargos

- **Nombre** (Label: "Nombre" \*)
- **Descripción** (Label: "Descripción")

### 9. Maestro de Lugares (Actividades)

- **Nombre Lugar** (Label: "Nombre Lugar" \*)
- **Comuna** (Label: "Comuna" - Selector con buscador)
- **Habilitado** (Label: "Habilitado" - Toggle)

### 10. Maestro de Centros de Cultivo

- **Código SIEP** (Label: "Código SIEP" \*)
- **Nombre** (Label: "Nombre" \*)
- **Latitud / Longitud** (Label: "Latitud", "Longitud")
- **Responsable** (Label: "Responsable")
- **Comuna** (Label: "Comuna" - Selector)
- **Región** (Auto-calculado por Comuna)
- **Área de Producción** (Label: "Área de Producción" - Selector)
- **Empresa Propietaria** (Label: "Empresa Propietaria")
- **Ciclo de Producción** (Label: "Ciclo de Producción")
- **Descripción** (Label: "Descripción")
- **Estado** (Label: "Activo" - Toggle)

### 11. Maestro de Áreas de Producción

- **Nombre** (Label: "Nombre" \*)
- **Descripción** (Label: "Descripción")
- **Activo** (Label: "Activo" - Toggle)

### 12. Catálogos de Configuración (Seed)

- **Tipos de Requerimiento**: Carena, Mantención Correctiva, Mantención Preventiva, Mantención Programada, Overhaul, Solicitud de materiales. (Incluye Nombre y Descripción).
- **Estados de Requerimiento**: Pendiente, Aprobado, En Proceso, **Reparación a Terceros (Tercerizar)**, Finalizado, Rechazado. (Nombre, Descripción, Color HEX/Class, Orden visual).
- **Categorías Insumos**: Nombre, Descripción, Habilitado.
- **Nombres de Requerimientos/Actividades**: Nombre, Descripción, Color, Categoría Asociada.
