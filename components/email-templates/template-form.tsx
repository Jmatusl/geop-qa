"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmailTemplate, useUpdateEmailTemplate } from "@/lib/hooks/use-email-templates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo } from "react";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateEmailHtml } from "@/lib/email/templates/base-template";

const formSchema = z.object({
    subject: z.string().min(1, "El asunto es requerido"),
    htmlContent: z.string().min(1, "El contenido HTML es requerido"),
    description: z.string().optional(),
});

interface TemplateFormProps {
    mode: 'create' | 'edit';
    initialData: EmailTemplate | null;
    onCancel: () => void;
    onSuccess: () => void;
}

export function TemplateForm({ mode, initialData, onCancel, onSuccess }: TemplateFormProps) {
    const { mutate: updateTemplate, isPending } = useUpdateEmailTemplate();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            subject: "",
            htmlContent: "",
            description: "",
        },
    });

    // Watch for live preview
    const htmlContent = form.watch("htmlContent");

    useEffect(() => {
        if (initialData) {
            form.reset({
                subject: initialData.subject,
                htmlContent: initialData.htmlContent,
                description: initialData.description || "",
            });
        }
    }, [initialData, form]);

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        if (mode === 'edit' && initialData) {
            updateTemplate(
                { id: initialData.id, data: values },
                { onSuccess }
            );
        }
    };

    const variables = initialData?.variables as string[] || [];

    return (
        <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-200px)]">
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Contenido del Correo</CardTitle>
                                <CardDescription>Edita el asunto y el cuerpo HTML del correo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Asunto</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="htmlContent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contenido HTML</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    {...field}
                                                    className="font-mono text-sm min-h-[400px]"
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Puedes usar HTML estándar. El estilo debe ser inline para mayor compatibilidad.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onCancel}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-[#283c7f] text-white">
                                {isPending ? "Guardando..." : "Guardar Cambios"}
                            </Button>
                        </div>
                    </form>
                </Form>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Variables Disponibles</CardTitle>
                            <CardDescription>
                                Se sustituirán automáticamente en la vista previa y en el envío real.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {variables.length > 0 ? (
                                    variables.map((variable) => (
                                        <Badge key={variable} variant="secondary" className="font-mono">
                                            {variable}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-muted-foreground">No hay variables definidas.</span>
                                )}
                            </div>

                            <Alert className="mt-6 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <AlertTitle className="text-blue-800 dark:text-blue-300">Nota sobre el Logo</AlertTitle>
                                <AlertDescription className="text-blue-700 dark:text-blue-400 mt-2 text-xs">
                                    El logo del correo se inserta automáticamente desde la Configuración de UI del sistema.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {initialData && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalles Técnicos</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Código:</span>
                                    <span className="font-mono font-medium">{initialData.code}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ID:</span>
                                    <span className="font-mono text-xs">{initialData.id}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <div className="flex-1 h-full min-h-[600px] bg-slate-100 dark:bg-slate-900 rounded-lg p-4 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-full max-w-[600px] mb-2 flex justify-between items-center px-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vista Previa en Vivo</span>
                    <Badge variant="outline" className="text-[10px] bg-background">Modo Escritorio</Badge>
                </div>
                <EmailPreview
                    htmlContent={htmlContent}
                    initialData={initialData}
                />
            </div>
        </div>
    );
}

// ---- Preview Component ----

function EmailPreview({ htmlContent, initialData }: { htmlContent: string; initialData: EmailTemplate | null }) {
    const mockData = useMemo(() => {
        if (initialData?.code === 'USER_CREATION') {
            return {
                name: 'Juanito Pérez',
                action_url: '#',
                expiration: '7 días'
            };
        }
        if (initialData?.code === 'PASSWORD_RESET') {
            return {
                name: 'María González',
                action_url: '#',
                expiration: '24 horas'
            };
        }
        return {
            name: 'Usuario Prueba',
            action_url: '#',
            expiration: 'un tiempo determinado'
        };
    }, [initialData]);

    const fullHtml = useMemo(() => {
        try {
            const config = {
                global: {
                    logo_src: '/sotex/sotex_lightMode.png',
                    client_logo_src: '/sotex/sotex_lightMode.png', // Demo para preview (usamos light para que se vea)
                    primary_color: '#283c7f',
                    background_color: '#f9fafb',
                    company_name: 'SOTEX (Preview)',
                    show_footer_branding: true,
                    show_client_logo: true
                },
                templates: {}
            };

            return generateEmailHtml(
                'custom',
                config,
                mockData as any,
                htmlContent
            );
        } catch (e) {
            return `Error generando preview: ${e}`;
        }
    }, [htmlContent, mockData]);

    return (
        <div className="w-full h-full bg-white rounded-md overflow-hidden shadow-lg border border-slate-200">
            <iframe
                srcDoc={fullHtml}
                className="w-full h-full border-none"
                title="Email Preview"
                sandbox="allow-same-origin"
            />
        </div>
    );
}
