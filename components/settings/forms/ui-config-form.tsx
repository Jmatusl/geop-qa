"use client";

import { useForm } from "react-hook-form";
import { Loader2, Save, Type, Palette, Layout, ShieldHalf, Mail, Globe, Monitor, Smartphone, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useUpdateSetting, AppSetting } from "@/lib/hooks/use-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoManager } from "../logo-manager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UIConfigFormProps {
  setting: AppSetting;
}

export function UIConfigForm({ setting }: UIConfigFormProps) {
  const { mutate: updateSetting, isPending } = useUpdateSetting();
  const [openAuthCards, setOpenAuthCards] = useState<Record<string, boolean>>({
    login: true,
    logos: false,
    recover: false,
    reset: false,
  });

  const toggleAuthCard = (card: string) => {
    setOpenAuthCards((prev) => ({ ...prev, [card]: !prev[card] }));
  };

  const form = useForm({
    defaultValues: setting.value,
  });

  useEffect(() => {
    if (setting.value) form.reset(setting.value);
  }, [setting.value, form]);

  const onSubmit = (data: any) => {
    updateSetting({ id: setting.id, value: data });
  };

  return (
    <Card className="border-none shadow-none bg-transparent pt-2">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Apariencia y Experiencia</CardTitle>
            <CardDescription>Personaliza la identidad visual, comportamientos de navegación y textos de comunicación del sistema.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <Tabs defaultValue="general" className="w-full mb-2 pb-2">
              <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground w-full max-w-2xl mb-2">
                <TabsTrigger
                  value="general"
                  className="flex-1 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all h-10"
                >
                  <Palette className="h-4 w-4" />
                  <span>General</span>
                </TabsTrigger>
                <TabsTrigger
                  value="branding"
                  className="flex-1 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all h-10"
                >
                  <Globe className="h-4 w-4" />
                  <span>Branding</span>
                </TabsTrigger>
                <TabsTrigger
                  value="navigation"
                  className="flex-1 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all h-10"
                >
                  <Layout className="h-4 w-4" />
                  <span>Navegación</span>
                </TabsTrigger>
                <TabsTrigger value="auth" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all h-10">
                  <ShieldHalf className="h-4 w-4" />
                  <span>Autenticación</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB: GENERAL */}
              <TabsContent value="general" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Type className="h-4 w-4 text-primary" />
                        Identidad del Sitio
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título Pestaña (HTML)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="ej: Sistema Certificaciones" />
                              </FormControl>
                              <FormDescription>Nombre que aparece en la pestaña del navegador.</FormDescription>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="version"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Versión</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="ej: 1.0.0" />
                              </FormControl>
                              <FormDescription>Identificador de versión visible en footer/sidebar.</FormDescription>
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción Meta</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Descripción global del sistema" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Palette className="h-4 w-4 text-primary" />
                        Estilos Globales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="primary_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color Primario</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input {...field} className="font-mono text-xs" />
                                <div className="w-10 h-10 rounded-md border shadow-sm shrink-0" style={{ backgroundColor: field.value }} />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="header_color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color de Cabecera</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input {...field} className="font-mono text-xs" />
                                <div className="w-10 h-10 rounded-md border shadow-sm shrink-0" style={{ backgroundColor: field.value }} />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Separator />
                      <FormField
                        control={form.control}
                        name="dark_mode_enable"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                              <FormLabel>Modo Oscuro</FormLabel>
                              <FormDescription className="text-[10px]">Permitir cambio de tema</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="showBreadcrumb"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                            <div className="space-y-0.5">
                              <FormLabel>Breadcrumbs</FormLabel>
                              <FormDescription className="text-[10px]">Rutas de navegación visibles</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* TAB: BRANDING (LOGOS) */}
              <TabsContent value="branding" className="space-y-6 mt-0">
                <ScrollArea className="h-[70vh] pr-4">
                  <div className="space-y-8 pb-8">
                    <Card>
                      <CardContent className="pt-6">
                        <FormField
                          control={form.control}
                          name="logo"
                          render={({ field }) => (
                            <LogoManager
                              title="Logo Principal (Corporativo)"
                              description="Se utiliza en el Sidebar y navegación principal."
                              value={field.value}
                              onChange={field.onChange}
                              action={
                                <Button type="submit" disabled={isPending} className="w-full bg-[#283c7f] hover:bg-[#1f2f65] text-white shadow-sm h-10 text-xs mt-2">
                                  {isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin text-white" /> : <Save className="mr-2 h-3 w-3 text-white" />}
                                  Guardar
                                </Button>
                              }
                            />
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <FormField
                          control={form.control}
                          name="logo_cliente"
                          render={({ field }) => (
                            <LogoManager
                              title="Logo del Cliente"
                              description="Logo secundario o del cliente específico."
                              value={field.value}
                              onChange={field.onChange}
                              action={
                                <Button type="submit" disabled={isPending} className="w-full bg-[#283c7f] hover:bg-[#1f2f65] text-white shadow-sm h-10 text-xs mt-2">
                                  {isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin text-white" /> : <Save className="mr-2 h-3 w-3 text-white" />}
                                  Guardar
                                </Button>
                              }
                            />
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <FormField
                          control={form.control}
                          name="isotipo"
                          render={({ field }) => (
                            <LogoManager
                              title="Isotipo (Miniatura)"
                              description="Logo simplificado para sidebar colapsado y móviles."
                              value={field.value}
                              onChange={field.onChange}
                              action={
                                <Button type="submit" disabled={isPending} className="w-full bg-[#283c7f] hover:bg-[#1f2f65] text-white shadow-sm h-10 text-xs mt-2">
                                  {isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin text-white" /> : <Save className="mr-2 h-3 w-3 text-white" />}
                                  Guardar
                                </Button>
                              }
                            />
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* TAB: NAVIGATION */}
              <TabsContent value="navigation" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Layout className="h-4 w-4 text-primary" />
                      Configuración de Barra Lateral (Aside)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="public_view_mode"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 rounded-xl border bg-muted/40 transition-colors hover:bg-muted/60">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-primary" />
                                <FormLabel className="text-base">Modo Expediente Digital</FormLabel>
                              </div>
                              <FormDescription>
                                {field.value === "FOLDER" ? "Vista de archivos y previsualización de documentos activa." : "Activar para mostrar archivos en lugar de la ficha resumida."}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value === "FOLDER"} onCheckedChange={(checked) => field.onChange(checked ? "FOLDER" : "CARD")} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="aside.show_popup"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 rounded-xl border bg-muted/40 transition-colors hover:bg-muted/60">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Popups de Info</FormLabel>
                              <FormDescription>Muestra ventanas detalladas al pasar el mouse por opciones.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="aside.show_tooltip"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 rounded-xl border bg-muted/40 transition-colors hover:bg-muted/60">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Tooltips</FormLabel>
                              <FormDescription>Muestra etiquetas flotantes sobre los iconos.</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="aside.max_width_class"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ancho Máximo (Clase Tailwind)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ej: w-64" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="aside.min_width_class"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ancho Mínimo / Colapsado (Clase Tailwind)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ej: w-20" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: AUTHENTICATION */}
              <TabsContent value="auth" className="space-y-6 mt-0">
                <ScrollArea className="h-[70vh] pr-4">
                  <div className="space-y-8 pb-8">
                    {/* LOGIN PAGE */}
                    <Collapsible open={openAuthCards.login} onOpenChange={() => toggleAuthCard("login")}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between w-full">
                              <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-primary" />
                                Página de Acceso (Login) - Contenido
                              </CardTitle>
                              <ChevronDown className={cn("h-4 w-4 transition-transform", openAuthCards.login && "rotate-180")} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField
                                control={form.control}
                                name="login_page.titulo_sistema.texto"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título Principal</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="login_page.subtitulo_sistema.texto"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Subtítulo / Eslogan</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name="login_page.form_login.titulo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título Caja Login</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="login_page.form_login.btn_login"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Texto Botón Login</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="login_page.form_login.olvidar_contrasena"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Texto "¿Olvidaste?"</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    {/* LOGOS LOGIN */}
                    <Collapsible open={openAuthCards.logos} onOpenChange={() => toggleAuthCard("logos")}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between w-full">
                              <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Globe className="h-4 w-4 text-primary" />
                                Logos de Pantalla de Acceso
                              </CardTitle>
                              <ChevronDown className={cn("h-4 w-4 transition-transform", openAuthCards.logos && "rotate-180")} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-8 pt-6">
                            <FormField
                              control={form.control}
                              name="login_page.configuracion_logos.logo_izquierdo"
                              render={({ field }) => (
                                <LogoManager
                                  title="Logo Izquierdo (Superior)"
                                  description="Configura el logo que aparece en la esquina superior izquierda de la pantalla de login."
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                            <Separator />
                            <FormField
                              control={form.control}
                              name="login_page.configuracion_logos.logo_derecho"
                              render={({ field }) => (
                                <LogoManager
                                  title="Logo Derecho (Inferior)"
                                  description="Configura el logo que aparece en la esquina inferior derecha de la pantalla de login."
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              )}
                            />
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    {/* RECOVER PASSWORD */}
                    <Collapsible open={openAuthCards.recover} onOpenChange={() => toggleAuthCard("recover")}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between w-full">
                              <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary" />
                                Recuperación de Contraseña
                              </CardTitle>
                              <ChevronDown className={cn("h-4 w-4 transition-transform", openAuthCards.recover && "rotate-180")} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-4 pt-6">
                            <FormField
                              control={form.control}
                              name="recover_page.titulo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Título</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="recover_page.subtitulo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Descripción Instrucciones</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="recover_page.btn_recover"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Texto Botón Envío</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="recover_page.success_titulo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título Éxito</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    {/* RESET PASSWORD */}
                    <Collapsible open={openAuthCards.reset} onOpenChange={() => toggleAuthCard("reset")}>
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between w-full">
                              <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ShieldHalf className="h-4 w-4 text-primary" />
                                Nueva Contraseña (Reset)
                              </CardTitle>
                              <ChevronDown className={cn("h-4 w-4 transition-transform", openAuthCards.reset && "rotate-180")} />
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="space-y-4 pt-6">
                            <FormField
                              control={form.control}
                              name="reset_page.titulo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Título</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="reset_page.subtitulo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Subtítulo</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="reset_page.btn_submit"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Texto Botón Guardar</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="reset_page.success_titulo"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título Éxito</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-4 border-t">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1f2f65] text-white shadow-lg">
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                          Guardando Cambios...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4 text-white" />
                          <span>Guardar Configuración Global</span>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs text-center">
                    Esta acción guarda todos los cambios realizados en <br />
                    <strong>todas las pestañas</strong> de apariencia simultáneamente.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
