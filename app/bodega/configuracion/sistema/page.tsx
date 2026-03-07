"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, Image as ImageIcon, Mail, Package, ShieldAlert, Zap, Info, ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBodegaConfig, useUpdateBodegaConfig } from "@/lib/hooks/bodega/use-bodega-config";

// Componente reutilizable para toggle de configuración
function ConfigToggle({ title, description, icon, checked, onChange }: { title: string; description: string; icon: ReactNode; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm">
      <div className="pr-4">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-semibold">{title}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function TablePreview() {
  return (
    <div className="overflow-hidden rounded-md border text-xs">
      <div className="bg-muted px-3 py-2 text-center text-muted-foreground">Vista Previa de la Tabla</div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="border p-2 text-left">ID Artículo</th>
            <th className="border p-2 text-left">Artículo</th>
            <th className="border p-2 text-center">Cantidad</th>
            <th className="border p-2 text-right">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2">250-6527</td>
            <td className="border p-2">Filtro Caterpillar</td>
            <td className="border p-2 text-center">64</td>
            <td className="border p-2 text-right">$ 1.280.000</td>
          </tr>
          <tr>
            <td className="border p-2">7W-2326</td>
            <td className="border p-2">Filtro Aceite</td>
            <td className="border p-2 text-center">24</td>
            <td className="border p-2 text-right">$ 360.000</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const MOVEMENT_VARIABLES_TIP = "Variables: {NUMERO}, {REFERENCIA}, {RESPONSABLE}, {BODEGA_ORIGEN}, {MOTIVO}... Tip: Use **texto** para negritas.";
const MOVEMENT_MOTIVO_TIP = "{MOTIVO} corresponde al campo de justificación y observaciones en /bodega/ingreso-bodega y /bodega/retiro-bodega.";

export default function BodegaConfiguracionSistemaPage() {
  const { data: configData } = useBodegaConfig();
  const updateConfig = useUpdateBodegaConfig();

  const generalConfig = configData?.BODEGA_GENERAL_CONFIG || {};
  const notificationConfig = configData?.BODEGA_NOTIFICACIONES_CONFIG || {};

  const [rules, setRules] = useState({
    bypassSeries: false,
    fifoEstricto: false,
    autoEjecutarOc: false,
    autoVerificarIngresos: false,
    autoAprobarRetiros: false,
    entregaInmediata: false,
    evidenciaIngresos: false,
    evidenciaRetiros: false,
    ocultarTransito: false,
  });

  const [notifications, setNotifications] = useState({
    ingresosEnabled: false,
    ingresosTabla: false,
    egresosEnabled: false,
    egresosTabla: false,
    transferenciasEnabled: false,
    transferenciasTabla: false,
    transferenciasDestinatarios: "",
    transferenciasAsunto: "",
    transferenciasMensaje: "Estimado,\n\nLe informamos que se ha procesado una transferencia entre bodegas correctamente.",
    ingresosDestinatarios: "",
    ingresosAsunto: "",
    ingresosMensaje: "Estimado,\n\nLe informamos que se ha procesado un ingreso a bodega correctamente.",
    egresosDestinatarios: "",
    egresosAsunto: "",
    egresosMensaje: "Estimado,\n\nLe informamos que su retiro ha sido procesado correctamente en el sistema.",
  });

  // Sincronizar estado cuando carga la config desde la API
  useEffect(() => {
    if (!configData) return;

    setRules({
      bypassSeries: generalConfig.permitir_bypass_series || false,
      fifoEstricto: generalConfig.trazabilidad_ingresos || false,
      autoEjecutarOc: generalConfig.auto_ejecutar_oc || false,
      autoVerificarIngresos: generalConfig.auto_verificar_ingresos || false,
      autoAprobarRetiros: generalConfig.auto_aprobar_solicitudes || false,
      entregaInmediata: generalConfig.entrega_inmediata || false,
      evidenciaIngresos: generalConfig.ingresos_evidencia_obligatoria || false,
      evidenciaRetiros: generalConfig.egresos_evidencia_obligatoria || false,
      ocultarTransito: generalConfig.ocultar_transito || false,
    });

    setNotifications({
      ingresosEnabled: notificationConfig.ingresos?.enabled || false,
      ingresosTabla: notificationConfig.ingresos?.incluir_tabla || false,
      egresosEnabled: notificationConfig.egresos?.enabled || false,
      egresosTabla: notificationConfig.egresos?.incluir_tabla || false,
      transferenciasEnabled: notificationConfig.transferencias?.enabled || false,
      transferenciasTabla: notificationConfig.transferencias?.incluir_tabla || false,
      transferenciasDestinatarios: notificationConfig.transferencias?.destinatarios || "",
      transferenciasAsunto: notificationConfig.transferencias?.asunto || "",
      transferenciasMensaje: notificationConfig.transferencias?.mensaje_personalizado || "Estimado,\n\nLe informamos que se ha procesado una transferencia entre bodegas correctamente.",
      ingresosDestinatarios: notificationConfig.ingresos?.destinatarios || "",
      ingresosAsunto: notificationConfig.ingresos?.asunto || "",
      ingresosMensaje: notificationConfig.ingresos?.mensaje_personalizado || "Estimado,\n\nLe informamos que se ha procesado un ingreso a bodega correctamente.",
      egresosDestinatarios: notificationConfig.egresos?.destinatarios || "",
      egresosAsunto: notificationConfig.egresos?.asunto || "",
      egresosMensaje: notificationConfig.egresos?.mensaje_personalizado || "Estimado,\n\nLe informamos que su retiro ha sido procesado correctamente en el sistema.",
    });
  }, [configData]);

  const handleSave = async () => {
    await updateConfig.mutateAsync({
      key: "BODEGA_GENERAL_CONFIG",
      value: {
        permitir_bypass_series: rules.bypassSeries,
        trazabilidad_ingresos: rules.fifoEstricto,
        auto_ejecutar_oc: rules.autoEjecutarOc,
        auto_verificar_ingresos: rules.autoVerificarIngresos,
        auto_aprobar_solicitudes: rules.autoAprobarRetiros,
        entrega_inmediata: rules.entregaInmediata,
        ingresos_evidencia_obligatoria: rules.evidenciaIngresos,
        egresos_evidencia_obligatoria: rules.evidenciaRetiros,
        ocultar_transito: rules.ocultarTransito,
      },
      description: "Configuraciones generales del módulo de bodega",
      category: "BODEGA",
    });

    await updateConfig.mutateAsync({
      key: "BODEGA_NOTIFICACIONES_CONFIG",
      value: {
        ingresos: {
          enabled: notifications.ingresosEnabled,
          incluir_tabla: notifications.ingresosTabla,
          destinatarios: notifications.ingresosDestinatarios,
          asunto: notifications.ingresosAsunto,
          mensaje_personalizado: notifications.ingresosMensaje,
        },
        egresos: {
          enabled: notifications.egresosEnabled,
          incluir_tabla: notifications.egresosTabla,
          destinatarios: notifications.egresosDestinatarios,
          asunto: notifications.egresosAsunto,
          mensaje_personalizado: notifications.egresosMensaje,
        },
        transferencias: {
          enabled: notifications.transferenciasEnabled,
          incluir_tabla: notifications.transferenciasTabla,
          destinatarios: notifications.transferenciasDestinatarios,
          asunto: notifications.transferenciasAsunto,
          mensaje_personalizado: notifications.transferenciasMensaje,
        },
      },
      description: "Configuración de notificaciones de bodega",
      category: "BODEGA",
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Header con navegación */}
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon" className="h-9 w-9 shrink-0 dark:text-white">
          <Link href="/bodega/configuracion">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reglas del Sistema</h1>
          <p className="text-sm text-muted-foreground">Comportamiento global, aprobación y notificaciones automáticas del inventario.</p>
        </div>
      </div>

      {/* Comportamiento y Reglas */}
      <div className="space-y-4">
        <h2 className="border-b pb-2 text-sm font-black uppercase tracking-widest text-muted-foreground">Comportamiento y Reglas</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ConfigToggle
            title="Bypass de Series"
            description="Omitir series obligatorias bajo justificación administrativa."
            icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}
            checked={rules.bypassSeries}
            onChange={(value) => setRules((current) => ({ ...current, bypassSeries: value }))}
          />
          <ConfigToggle
            title="FIFO Estricto"
            description="Obliga a seleccionar ingresos específicos para cada retiro."
            icon={<Package className="h-4 w-4 text-emerald-600" />}
            checked={rules.fifoEstricto}
            onChange={(value) => setRules((current) => ({ ...current, fifoEstricto: value }))}
          />
          <ConfigToggle
            title="Auto-ejecutar Ingresos por OC"
            description="Los ingresos desde OC saltan el flujo de aprobación y cargan stock inmediato."
            icon={<Zap className="h-4 w-4 text-blue-600" />}
            checked={rules.autoEjecutarOc}
            onChange={(value) => setRules((current) => ({ ...current, autoEjecutarOc: value }))}
          />
          <ConfigToggle
            title="Auto-verificar Ingresos"
            description="Omite el diálogo de confirmación y valida el stock automáticamente al registrar ingresos."
            icon={<ShieldAlert className="h-4 w-4 text-purple-600" />}
            checked={rules.autoVerificarIngresos}
            onChange={(value) => setRules((current) => ({ ...current, autoVerificarIngresos: value }))}
          />
          <ConfigToggle
            title="Auto-Aprobar Retiros"
            description="Omite el diálogo de gestión manual y aprueba automáticamente las solicitudes internas."
            icon={<Zap className="h-4 w-4 text-orange-600" />}
            checked={rules.autoAprobarRetiros}
            onChange={(value) => setRules((current) => ({ ...current, autoAprobarRetiros: value }))}
          />
          <ConfigToggle
            title="Entrega Inmediata de Solicitudes"
            description="Procesa la salida de bodega directamente sin diálogos adicionales al registrar retiros."
            icon={<Zap className="h-4 w-4 text-red-600" />}
            checked={rules.entregaInmediata}
            onChange={(value) => setRules((current) => ({ ...current, entregaInmediata: value }))}
          />
          <ConfigToggle
            title="Evidencia en Ingresos"
            description="Obliga a adjuntar al menos una imagen para registrar ingresos."
            icon={<ImageIcon className="h-4 w-4 text-orange-600" />}
            checked={rules.evidenciaIngresos}
            onChange={(value) => setRules((current) => ({ ...current, evidenciaIngresos: value }))}
          />
          <ConfigToggle
            title="Evidencia en Retiros"
            description="Obliga a adjuntar al menos una imagen para registrar retiros rápidos."
            icon={<ImageIcon className="h-4 w-4 text-red-600" />}
            checked={rules.evidenciaRetiros}
            onChange={(value) => setRules((current) => ({ ...current, evidenciaRetiros: value }))}
          />
          <div className="lg:col-span-2">
            <ConfigToggle
              title='Ocultar "TRANSITO"'
              description="Oculta la bodega de tránsito en el maestro de bodegas. Si no existe, se creará automáticamente."
              icon={<Package className="h-4 w-4 text-slate-600" />}
              checked={rules.ocultarTransito}
              onChange={(value) => setRules((current) => ({ ...current, ocultarTransito: value }))}
            />
          </div>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="space-y-4">
        <h2 className="border-b pb-2 text-sm font-black uppercase tracking-widest text-muted-foreground">Notificaciones de Movimientos</h2>

        <Tabs defaultValue="ingresos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ingresos" className="uppercase font-bold text-xs tracking-wider">
              Ingresos
            </TabsTrigger>
            <TabsTrigger value="egresos" className="uppercase font-bold text-xs tracking-wider">
              Egresos / Retiros
            </TabsTrigger>
            <TabsTrigger value="transferencias" className="uppercase font-bold text-xs tracking-wider">
              Transferencias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ingresos" className="mt-4">
            {/* Aviso de Ingresos */}
            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-base">Aviso de Ingresos a Bodega</CardTitle>
                      <CardDescription>Notificar cuando se reciba nueva mercadería.</CardDescription>
                    </div>
                  </div>
                  <Switch checked={notifications.ingresosEnabled} onCheckedChange={(value) => setNotifications((current) => ({ ...current, ingresosEnabled: value }))} />
                </div>
              </CardHeader>
              {notifications.ingresosEnabled && (
                <CardContent className="space-y-3">
                  <Label>Destinatarios</Label>
                  <Textarea
                    value={notifications.ingresosDestinatarios}
                    onChange={(e) => setNotifications((c) => ({ ...c, ingresosDestinatarios: e.target.value }))}
                    placeholder="correo@empresa.cl, otro@empresa.cl"
                    autoComplete="off"
                  />
                  <div className="flex items-start gap-2 rounded-md border bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                    <Info className="mt-0.5 h-3.5 w-3.5" />
                    <span>Correos separados por coma (,) o punto y coma (;).</span>
                  </div>
                  <Label>Asunto del Correo</Label>
                  <Input
                    value={notifications.ingresosAsunto}
                    onChange={(e) => setNotifications((c) => ({ ...c, ingresosAsunto: e.target.value }))}
                    placeholder="Ej: Aviso de Ingreso: {NUMERO}"
                    autoComplete="off"
                  />
                  <Label>Mensaje Personalizado</Label>
                  <Textarea value={notifications.ingresosMensaje} onChange={(e) => setNotifications((c) => ({ ...c, ingresosMensaje: e.target.value }))} autoComplete="off" className="min-h-30" />
                  <div className="flex items-center gap-2">
                    <Switch checked={notifications.ingresosTabla} onCheckedChange={(value) => setNotifications((current) => ({ ...current, ingresosTabla: value }))} />
                    <Label>Incluir tabla de detalle de items</Label>
                  </div>
                  {notifications.ingresosTabla && <TablePreview />}
                  <Label>Detalles del Movimiento (Pie de página)</Label>
                  <Textarea
                    className="min-h-27.5 font-mono text-xs"
                    defaultValue={"**Motivo del Movimiento:**\n{MOTIVO}\n\n**Detalles del Movimiento:**\nFolio Interno: {NUMERO}"}
                    autoComplete="off"
                  />
                  <div className="flex items-start gap-2 rounded-md border bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="space-y-1">
                      <p>{MOVEMENT_VARIABLES_TIP}</p>
                      <p>{MOVEMENT_MOTIVO_TIP}</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="egresos" className="mt-4">
            {/* Aviso de Egresos */}
            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-orange-600" />
                    <div>
                      <CardTitle className="text-base">Aviso de Egresos / Retiros</CardTitle>
                      <CardDescription>Notificar cuando se entreguen repuestos o salgan artículos.</CardDescription>
                    </div>
                  </div>
                  <Switch checked={notifications.egresosEnabled} onCheckedChange={(value) => setNotifications((current) => ({ ...current, egresosEnabled: value }))} />
                </div>
              </CardHeader>
              {notifications.egresosEnabled && (
                <CardContent className="space-y-3">
                  <Label>Destinatarios</Label>
                  <Textarea
                    value={notifications.egresosDestinatarios}
                    onChange={(e) => setNotifications((c) => ({ ...c, egresosDestinatarios: e.target.value }))}
                    placeholder="correo@empresa.cl, otro@empresa.cl"
                    autoComplete="off"
                  />
                  <div className="flex items-start gap-2 rounded-md border bg-orange-50 p-2 text-xs text-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
                    <Info className="mt-0.5 h-3.5 w-3.5" />
                    <span>Correos separados por coma (,) o punto y coma (;).</span>
                  </div>
                  <Label>Asunto del Correo</Label>
                  <Input
                    value={notifications.egresosAsunto}
                    onChange={(e) => setNotifications((c) => ({ ...c, egresosAsunto: e.target.value }))}
                    placeholder="Ej: Aviso de Retiro: {NUMERO}"
                    autoComplete="off"
                  />
                  <Label>Mensaje Personalizado</Label>
                  <Textarea value={notifications.egresosMensaje} onChange={(e) => setNotifications((c) => ({ ...c, egresosMensaje: e.target.value }))} autoComplete="off" className="min-h-30" />
                  <div className="flex items-center gap-2">
                    <Switch checked={notifications.egresosTabla} onCheckedChange={(value) => setNotifications((current) => ({ ...current, egresosTabla: value }))} />
                    <Label>Incluir tabla de detalle de items</Label>
                  </div>
                  {notifications.egresosTabla && <TablePreview />}
                  <Label>Detalles del Movimiento (Pie de página)</Label>
                  <Textarea
                    className="min-h-27.5 font-mono text-xs"
                    defaultValue={"**Motivo del Movimiento:**\n{MOTIVO}\n\n**Detalles del Retiro/Entrega:**\nFolio Interno: {NUMERO}"}
                    autoComplete="off"
                  />
                  <div className="flex items-start gap-2 rounded-md border bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="space-y-1">
                      <p>{MOVEMENT_VARIABLES_TIP}</p>
                      <p>{MOVEMENT_MOTIVO_TIP}</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="transferencias" className="mt-4">
            {/* Aviso de Transferencias */}
            <Card className="rounded-xl border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-purple-600" />
                    <div>
                      <CardTitle className="text-base">Aviso de Transferencias Internas</CardTitle>
                      <CardDescription>Notificar cuando se transfiera mercancía entre bodegas.</CardDescription>
                    </div>
                  </div>
                  <Switch checked={notifications.transferenciasEnabled} onCheckedChange={(value) => setNotifications((current) => ({ ...current, transferenciasEnabled: value }))} />
                </div>
              </CardHeader>
              {notifications.transferenciasEnabled && (
                <CardContent className="space-y-3">
                  <Label>Destinatarios</Label>
                  <Textarea
                    value={notifications.transferenciasDestinatarios}
                    onChange={(e) => setNotifications((c) => ({ ...c, transferenciasDestinatarios: e.target.value }))}
                    placeholder="correo@empresa.cl, otro@empresa.cl"
                    autoComplete="off"
                  />
                  <div className="flex items-start gap-2 rounded-md border bg-purple-50 p-2 text-xs text-purple-800 dark:bg-purple-950/20 dark:text-purple-300">
                    <Info className="mt-0.5 h-3.5 w-3.5" />
                    <span>Correos separados por coma (,) o punto y coma (;).</span>
                  </div>
                  <Label>Asunto del Correo</Label>
                  <Input
                    value={notifications.transferenciasAsunto}
                    onChange={(e) => setNotifications((c) => ({ ...c, transferenciasAsunto: e.target.value }))}
                    placeholder="Ej: Aviso de Transferencia: {NUMERO}"
                    autoComplete="off"
                  />
                  <Label>Mensaje Personalizado</Label>
                  <Textarea
                    value={notifications.transferenciasMensaje}
                    onChange={(e) => setNotifications((c) => ({ ...c, transferenciasMensaje: e.target.value }))}
                    className="min-h-30"
                    autoComplete="off"
                  />
                  <div className="flex items-center gap-2">
                    <Switch checked={notifications.transferenciasTabla} onCheckedChange={(value) => setNotifications((current) => ({ ...current, transferenciasTabla: value }))} />
                    <Label>Incluir tabla de detalle de items</Label>
                  </div>
                  {notifications.transferenciasTabla && <TablePreview />}
                  <Label>Detalles del Movimiento (Pie de página)</Label>
                  <Textarea
                    className="min-h-27.5 font-mono text-xs"
                    defaultValue={"**Motivo del Movimiento:**\n{MOTIVO}\n\n**Detalles de la Transferencia:**\nFolio Interno: {NUMERO}"}
                    autoComplete="off"
                  />
                  <div className="flex items-start gap-2 rounded-md border bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="space-y-1">
                      <p>{MOVEMENT_VARIABLES_TIP}</p>
                      <p>{MOVEMENT_MOTIVO_TIP}</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-end">
        <Button className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white" onClick={handleSave} disabled={updateConfig.isPending}>
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
