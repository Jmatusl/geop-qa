## contexto:
El módulo /dashboard/mantencion/solicitud-insumos gestiona el abastecimiento de bienes tangibles (repuestos, herramientas, consumibles) con trazabilidad granular por ítem.

Funcionalidades Principales:
Bandeja de Solicitudes

KPIs en tiempo real (Pendientes, En Cotización, Aprobadas, Rechazadas)
Filtros por estado, fecha, instalación y folio
Visualización de estados por ítem mediante badges
Creación de Solicitudes

Formulario con grilla tipo Excel para carga masiva
Autocompletado de artículos basado en historial
Categorías aplicables a todos los ítems
Validación de cantidad, unidad y nombre por fila
Flujo de Cotizaciones (3 niveles de permisos):

Gestiona Cotizaciones: Crea cotizaciones, selecciona ítems y proveedores
Aprueba Cotizaciones: Registra ofertas y elige proveedor ganador por ítem
Autoriza Cotizaciones: Aprobación gerencial final y generación de orden de compra
Trazabilidad

Seguimiento end-to-end de cada ítem
Historial de precios por SKU
Audit log de aprobaciones
Estados:
Solicitud: Pendiente, En Proceso, Aprobada, Rechazada, Anulada, Finalizada
Ítems: Pendiente, Cotizado, Autorizado, Aprobado, Rechazado, Entregado, No Disponible
El sistema permite control granular: cada ítem tiene su propio ciclo de vida independiente dentro de la misma solicitud.

## Permisos del módulo de Insumos

### Permisos utilizados

- **Gestiona Cotizaciones**
Puede crear y editar cotizaciones en solicitudes de insumos
- **Autoriza Cotizaciones**
Puede generar reportes finales de cotizaciones aprobadas
- **Aprueba Cotizaciones**
Puede aprobar o rechazar cotizaciones en solicitudes de insumos
---

## Categorias de insumos ## 
debe ser un mantenedor que tenga almenos los siguientes categorias
- Insumos y Materiales
- Viveres 

## configuraciones del modulode insumos ## 
crear configuración para prefijo de folio, por defecto "SI"

## Estados que puede tener la solicitud de insunmos
- Pendiente
- En Proceso
- Aprobada
- Rechazada
- Anulada
- Finalizada

## Estados Items (de los insumos dentro de la solicitud)
- Pendiente
- Cotizado
- Autorizado
- Aprobado
- Rechazado
- Entregado
- No Disponible


### Acciones permitidas por cada permiso

| Permiso                   | Acciones permitidas                                                                                       |
|---------------------------|----------------------------------------------------------------------------------------------------------|
| **Gestiona Cotizaciones** | Puede crear y editar cotizaciones en solicitudes de insumos.                                             |
| **Autoriza Cotizaciones** | Puede generar reportes finales de cotizaciones aprobadas.                                                |
| **Aprueba Cotizaciones**  | Puede aprobar o rechazar cotizaciones en solicitudes de insumos.                                         |

---

## Flujos y descripción de formularios del módulo de Solicitud de Insumos

---

### 1. `/solicitud-insumos/crear`

**Descripción:**  
Formulario para crear una nueva solicitud de insumos de mantención.

**Flujo:**
- El usuario accede al formulario de creación.
- Completa los campos requeridos: instalación, solicitante, categoria, Descripción solicitante, Observaciones Internas (Opcional).

 **Lista de insumos:**
 es una tabla con formato similar a excel el cual permite ingresar
- Nombre del articulo: autocompletar con registros ingresados anteriormente, si se selecciona un valor del autocompletado debe llenar el valor de unidad usada en ese articulo.
- Categoría
- Cantidad 
- Unidad (autocompletar con maestro de Unidades)

**Acciones principales:**
- Botones Para agregar fila a la tabla al final o eliminar ultima fila de la tabla.
- Agregar insumos a la lista.
- Editar/eliminar insumos antes de guardar.
- Guardar la solicitud.
- Validar que todos los insumos tengan valores validos (Nombre, Cantidad: numerica, solo positivos, formato con separador de miles),Unidad 

---

### 2. `/solicitud-insumos/solicitud-insumos`

**Descripción de la interfaz:**  
Vista de tabla resumen de solicitudes de insumos.

**Elementos principales:**
- Barra superior con filtros (estado, fecha, área, responsable, Nº Solicitud).
- Botón para crear nueva solicitud.
- Tabla de solicitudes.

**Columnas de la tabla (labels):**

Columnas               
- FOLIO
- Estado
- Des. Solicitante
- Instalación
- Fecha
- Items
- Estados Items 
- Acciones

## Detalle de las columnas: ##
FOLIO: muestra el folio de la solictud y debe tener un icono que lleme un tooltip que muestre la siguiente información:
- numero de folio 
- fecha de creación
- Estdo de la solictud
- Instalación 
- Solicitante
- descripcion

Items: debe mostrar la cantidad de items de la solictud, en un quiebre de linea debe mostrar la cantidad de solictudes creadas para esta solicitud.
en esta linea debe haber un tooltip que muestre:
Total Cotizaciones: Cantidad total de cotizaciones y cuántas están aprobadas (ejemplo: "Total Cotizaciones 1 | Aprobado 1").
Ícono de visualización: Permite ver el detalle de la cotización.
Código de Cotización: Ejemplo: "COT-0009".
Monto de la Cotización: Monto total de la cotización (ejemplo: "$1.785.000").
Estado de la Cotización: Estado actual (ejemplo: "Aprobado"), mostrado con un badge o etiqueta.
Proveedor: Nombre del proveedor asociado a la cotización (ejemplo: "ERWIN COILLLAN MARTINEZ").
OC: Número de orden de compra asociada, con ícono y número (ejemplo: "35925").
Esta información se 


**Opciones del menú de acciones:**
- Ver Detalle
- Editar Solicitud (si el estado lo permite)
- Eliminar Solicitud (si el estado lo permite)
- Descargar PDF
- Ver Historial
- Solicitante
- 
---

**Funciones del filtro:**
- Filtrar por estado (Pendiente, Aprobada, Rechazada, etc.)
- Filtrar por fecha (rango de fechas de creación)
- Filtrar por área (área solicitante)
- Filtrar por responsable (nombre del responsable)
- Buscar por Nº Solicitud (número específico)

---
## Detalle de la solictud `/solicitud-insumos/{id}` (id de la solictud)

**Descripción de la interfaz:**  
Vista de detalle de una solicitud de insumos específica.

**Elementos principales:**
- **Encabezado:**  
  - Folio de la solicitud (con tooltip que muestra: número de folio, fecha de creación, estado, instalación, solicitante y descripción).
  - Estado actual de la solicitud (badge).
  - Botones de acciones principales (por ejemplo: Editar, Descargar PDF, Ver Historial, si el estado lo permite).

- **Información general:**  
  - Instalación
  - Solicitante
  - Área
  - Fecha de solicitud
  - Observaciones generales

- **Tabs de navegación:**  
  La interfaz incluye tabs para organizar la información:
  - **Items:**  
    Tabla de items solicitados, con columnas:
      - Nombre del artículo
      - Categoría
      - Cantidad
      - Unidad
      - Estado del item (badge)
      - Cotizaciones (con tooltip que muestra: código de cotización, monto, estado, proveedor, OC)
      - Acciones (por ejemplo: Ver detalle de cotización, editar/eliminar item si corresponde)
  - **Cotizaciones:**  
    Tab específico donde se visualizan todas las cotizaciones asociadas a la solicitud.  
    Incluye:
      - Listado de cotizaciones con información de estado, proveedor, monto, OC y acciones disponibles según permisos.
      - Tooltips con detalles de cada cotización.
      - Acciones para aprobar/rechazar cotizaciones, ver detalle, descargar PDF, etc.

Acciones del menú en la tabla de resumen de cotizaciones
1. Ver Detalle

Abre un modal o panel lateral con toda la información de la cotización seleccionada.
Muestra: código, monto, estado, proveedor, OC, lista de items cotizados, historial de cambios y observaciones.
Permite visualizar los documentos adjuntos (PDF, XML, etc.) si existen.
2. Editar Cotización

Disponible solo si el estado de la cotización lo permite (por ejemplo, si está “Pendiente” o “Cotizado”).
Abre un formulario para modificar los datos de la cotización: monto, proveedor, items, observaciones.
Al guardar, valida los cambios y actualiza la cotización en la base de datos.
3. Eliminar Cotización

Disponible solo si la cotización no ha sido aprobada ni asociada a una OC.
Solicita confirmación mediante un diálogo (no window.confirm, debe ser AlertDialog).
Al confirmar, elimina la cotización y actualiza el resumen.
4. Aprobar/Rechazar Cotización

Permite cambiar el estado de la cotización a “Aprobado” o “Rechazado”.
Solicita confirmación y, en caso de rechazo, permite ingresar una observación obligatoria.
Actualiza el estado y registra el evento en el historial.
5. Descargar PDF

Genera y descarga el documento PDF de la cotización.
Incluye todos los datos relevantes y los items cotizados.
6. Ver Historial

Abre un modal o panel con la línea de tiempo de acciones realizadas sobre la cotización.
Muestra: quién realizó cada acción, fecha, tipo de acción (creación, edición, aprobación, rechazo, etc.).
7. Asociar OC

Si la cotización está aprobada, permite asociarla a una Orden de Compra existente o crear una nueva.
Solicita datos de la OC y actualiza el vínculo en la cotización.
Cada acción está condicionada por el estado de la cotización y los permisos del usuario. El menú se adapta dinámicamente mostrando solo las opciones válidas para cada caso.

  - **Historial:**  
    Línea de tiempo o lista de eventos relevantes (creación, edición, aprobaciones, rechazos, entregas, etc.)

**Opciones de acciones disponibles:**  
Dependiendo del estado y los permisos del usuario, pueden estar disponibles acciones como:
- Editar solicitud
- Aprobar/Rechazar cotización
- Generar reporte o PDF
- Agregar observaciones
- Ver historial completo

**Tooltips destacados:**
- En el folio: muestra detalles completos de la solicitud.
- En la columna Cotizaciones de cada item: muestra el resumen de cada cotización (código, monto, estado, proveedor, OC).
- En el tab Cotizaciones: muestra información detallada de cada cotización y sus estados.

**Resumen:**  
Esta interfaz permite visualizar toda la información relevante de una solicitud de insumos, gestionar sus items y cotizaciones, y realizar acciones administrativas según los permisos y el estado actual. La navegación por tabs facilita el acceso a los detalles de items, cotizaciones y el historial de la solicitud.


## modal Enviar Ítems a Cotización
---

## Formulario "Enviar Ítems a Cotización"

**Descripción:**  
Este formulario permite seleccionar uno o varios ítems de una solicitud de insumos para enviarlos a proceso de cotización. Es utilizado cuando se requiere solicitar precios a proveedores antes de aprobar la adquisición.

**Flujo:**
1. El usuario accede al formulario desde la interfaz de detalle de la solicitud o desde la tabla de items.
2. Se muestra una lista de ítems disponibles para cotizar, cada uno con:
   - Nombre del artículo
   - Categoría
   - Cantidad
   - Unidad
   - Estado actual del ítem
   - Checkbox para seleccionar el ítem
3. El usuario selecciona los ítems que desea enviar a cotización.
4. Puede agregar observaciones generales para la cotización (campo de texto opcional).
5. Debe seleccionar uno o varios proveedores a quienes se enviará la solicitud de cotización (selector múltiple).
6. Botón para confirmar el envío ("Enviar a Cotización").
7. Al confirmar, el sistema valida que haya al menos un ítem seleccionado y un proveedor elegido.
8. Se genera una solicitud de cotización para cada proveedor seleccionado, asociando los ítems elegidos.
9. El estado de los ítems cambia a "Cotizado" y se registra el evento en el historial de la solicitud.
10. Se muestra una notificación de éxito y se actualiza la interfaz.

**Elementos principales del formulario:**
- Tabla de ítems con selección múltiple
- Selector de proveedores (autocompletar)
- Campo de observaciones
- Botón de envío
- Validaciones y mensajes de error

**Validaciones:**
- Al menos un ítem seleccionado
- Al menos un proveedor seleccionado
- Observaciones no obligatorias, pero sanitizadas

**Resumen:**  
Este formulario facilita el proceso de solicitar cotizaciones a proveedores, permitiendo seleccionar ítems específicos y gestionar el flujo de cotización de manera eficiente y trazable.

## Modal "Detalle de Cotización"

**Estructura general:**
- Título: Detalle de Cotización - [Código de Cotización]
- Subtítulo: Información completa de la cotización y sus items.
- Cuatro tarjetas resumen:
  - Estado (badge)
  - Proveedor (RUT y correo)
  - Items (cantidad total y cuántos tienen precios)
  - Total Neto (valor total, editable si corresponde)

**Tabs principales:**
1. **Items**
   - Tabla de items cotizados:
     - Nombre
     - Categoría
     - Cantidad
     - Unidad
   - Descripción ingresada por el solicitante (no visible para el proveedor)
   - Descripción interna (notas internas, no visibles para el proveedor)

2. **Información**
   - Solicitud Origen:
     - Folio
     - Instalación
     - Solicitante
     - Creada por
   - Detalles de Cotización:
     - Fecha límite de respuesta
   - Observaciones del proveedor (ingresadas manualmente)
   - Observaciones del proveedor al recibir la cotización (enlace o texto)

3. **Adjuntos**
   - Listado de archivos adjuntos (PDF, XML, etc.)
   - Cantidad de adjuntos (ejemplo: Adjuntos (0) si no hay archivos)

4. **Historial**
   - Registro de acciones realizadas en la cotización:
     - Tipo de acción (ejemplo: CREAR)
     - Descripción de la acción
     - Usuario y correo
     - Fecha y hora

**Resumen:**  
El modal organiza la información en tabs para facilitar la revisión de los items cotizados, datos de la solicitud, observaciones, adjuntos y el historial de cambios. Cada sección muestra información relevante y contextual, permitiendo una gestión completa y trazabilidad de la cotización.

---

## Modal "Enviar Cotización por Email"

**Descripción:**  
Este modal permite configurar y enviar rápidamente una cotización al proveedor por correo electrónico, incluyendo información relevante y adjuntos técnicos.

**Estructura e información mostrada:**

- **Resumen de la Cotización:**  
  - Folio (con enlace)
  - Estado (badge)
  - Cantidad de ítems
  - Proveedor (RUT)
  - Razón social

- **Email del Proveedor:**  
  - Campo prellenado con el correo del proveedor

- **Fecha Límite de Respuesta (Opcional):**  
  - Campo prellenado, editable mediante selector de fecha

- **Observaciones Adicionales (Opcional):**  
  - Campo de texto para instrucciones o detalles para el proveedor
  - Nota informativa: la observación se precarga desde la creación de la solicitud y puede editarse antes de enviar el email

- **Incluir adjuntos y especificaciones técnicas:**  
  - Checkbox para incluir automáticamente fichas técnicas y detalles de los ítems en el email

- **Botones de acción:**  
  - Cancelar
  - Enviar Email

**Resumen:**  
El modal centraliza la configuración del envío, permitiendo revisar y editar datos clave antes de notificar al proveedor. Facilita la comunicación y asegura que se adjunten los documentos técnicos necesarios.

---

## Modal "Ingresar Cotización Manual"

**Descripción:**  
Este modal permite registrar manualmente los datos de una cotización recibida por correo, teléfono u otros medios, completando precios, adjuntos y condiciones relevantes.

**Estructura e información mostrada:**

- **Información de la Cotización:**  
  - Folio (ejemplo: COT-0010)
  - Proveedor (nombre o razón social)
  - Fecha de emisión

- **Adjuntar archivos (PDF / Excel):**  
  - Botón para seleccionar y subir archivos relacionados a la cotización

- **Alerta informativa:**  
  - Mensaje que indica que la función permite ingresar manualmente los datos y que la cotización cambiará automáticamente al estado "Recibida"

- **Montos de la Cotización:**  
  - Neto (Subtotal): campo obligatorio para ingresar el monto neto
  - IVA (19%): campo calculado o editable
  - Total: suma de neto + IVA

- **Items a Cotizar:**  
  - Sección desplegable para ingresar detalles de los productos o servicios cotizados
  - Campos para precio unitario, total neto y observaciones por ítem (valores opcionales)

- **Información General:**  
  - Tiempo de Entrega General (días)
  - Condiciones de Pago (ejemplo: 30 días, contado, etc.)
  - Validez de la Cotización (fecha seleccionable)
  - Observaciones del proveedor a la solicitud de cotización (campo opcional para información adicional relevante)

- **Botones de acción:**  
  - Cancelar
  - Ingresar Cotización

**Resumen:**  
El modal facilita el registro manual de cotizaciones externas, permitiendo adjuntar documentos, ingresar montos, condiciones y observaciones, y asegurando que la cotización quede correctamente documentada y trazada en el sistema.