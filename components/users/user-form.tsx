"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User as UserIcon, Loader2, Save, X, Lock, Unlock, ShieldAlert, ChevronsUpDown, Check, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCreateUser, useUpdateUser, useUnlockUser, useUpdateUserAvatar, useRemoveUserAvatar } from "@/lib/hooks/use-users";
import { usePersons, Person } from "@/lib/hooks/use-persons";
import { useAllRoles } from "@/lib/hooks/use-roles";
import { cleanRUT, formatRUT, validateRUT } from "@/lib/utils/chile-utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { User } from "@/components/users/users-table-columns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionList } from "@/components/profile/session-list";
import { PermissionsTab } from "@/components/users/PermissionsTab";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { useSettings } from "@/lib/hooks/use-settings";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface UserFormProps {
  mode: "create" | "edit";
  initialData?: User | null;
  onCancel: () => void;
  onSuccess: () => void;
}

interface UserFormValues {
  firstName: string;
  lastName: string;
  rut?: string;
  email: string;
  password?: string;
  roleId: string;
  passwordMode: "MANUAL" | "AUTO";
  isGoogleSsoEnabled: boolean;
  personId?: string;
}

export function UserForm({ mode, initialData, onCancel, onSuccess }: UserFormProps) {
  const { mutate: createUser, isPending: isCreating } = useCreateUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutateAsync: updateUserAvatarAsync, isPending: isUpdatingAvatar } = useUpdateUserAvatar();
  const { mutateAsync: removeUserAvatarAsync, isPending: isRemovingAvatar } = useRemoveUserAvatar();
  const { data: roles, isLoading: rolesLoading } = useAllRoles();
  const { data: settings } = useSettings();

  const [isRutEditable, setIsRutEditable] = useState(mode === "create");
  const [showRutConfirm, setShowRutConfirm] = useState(false);

  const googleSsoConfig = settings?.find((s) => s.key === "GOOGLE_SSO_CONFIG");
  const isGoogleSsoGloballyEnabled = googleSsoConfig?.value?.enabled === true;

  const { mutate: unlockUser, isPending: isUnlocking } = useUnlockUser();

  // Person Search State
  const [personSearch, setPersonSearch] = useState("");
  const [openPersonCombobox, setOpenPersonCombobox] = useState(false);
  const { data: personsData, isLoading: isLoadingPersons } = usePersons(1, 20, personSearch);
  const persons = personsData?.data || [];

  // Lógica de detección de bloqueo
  const isLocked = useMemo(() => {
    if (mode !== "edit" || !initialData) return false;
    if (initialData.lockedUntil && new Date(initialData.lockedUntil) > new Date()) return true;
    return false;
  }, [mode, initialData]);

  const formSchema = useMemo(
    () =>
      z
        .object({
          firstName: z.string().min(2, "Mínimo 2 caracteres"),
          lastName: z.string().min(2, "Mínimo 2 caracteres"),
          rut: z
            .string()
            .optional()
            .refine(
              (val) => {
                if (!val || val.trim() === "") return true;
                return validateRUT(val);
              },
              { message: "RUT inválido" },
            ),
          email: z.string().email("Email inválido"),
          password: z.string().optional(),
          roleId: z.string().min(1, "Seleccione un rol"),
          passwordMode: z.enum(["MANUAL", "AUTO"]).default("AUTO"),
          isGoogleSsoEnabled: z.boolean().default(false),
          personId: z.string().optional(),
        })
        .superRefine((data, ctx) => {
          // En modo creación MANUAL, la contraseña es obligatoria (mínimo 8)
          if (mode === "create" && data.passwordMode === "MANUAL" && (!data.password || data.password.length < 8)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Contraseña requerida (mínimo 8 caracteres) en modo manual",
              path: ["password"],
            });
          }
          // En modo edición, si se escribe algo, debe tener al menos 8 caracteres
          if (mode === "edit" && data.password && data.password.length > 0 && data.password.length < 8) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "La nueva contraseña debe tener al menos 8 caracteres",
              path: ["password"],
            });
          }
        }),
    [mode],
  );

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      rut: initialData?.rut || "",
      email: initialData?.email || "",
      password: "",
      roleId: initialData?.role?.id || "",
      passwordMode: mode === "edit" ? "MANUAL" : "AUTO",
      isGoogleSsoEnabled: initialData?.isGoogleSsoEnabled || false,
      personId: initialData?.person?.id || "",
    },
  });

  const passwordMode = form.watch("passwordMode");

  useEffect(() => {
    if (mode === "edit" && initialData) {
      form.reset({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        rut: formatRUT(initialData.rut || ""),
        email: initialData.email,
        password: "",
        roleId: initialData.role?.id || "",
        passwordMode: "MANUAL",
        isGoogleSsoEnabled: initialData.isGoogleSsoEnabled || false,
        personId: initialData.person?.id || "",
      });
      setIsRutEditable(!initialData.rut);
    }
  }, [initialData, mode, form]);

  const onSubmit = (data: UserFormValues) => {
    const cleanData = {
      ...data,
      rut: data.rut && data.rut.trim() !== "" ? cleanRUT(data.rut) : undefined,
      password: data.password && data.password.trim() !== "" ? data.password : undefined,
    };

    if (mode === "create") {
      createUser(cleanData as any, {
        onSuccess: () => {
          onSuccess();
          form.reset();
        },
      });
    } else {
      updateUser(
        { id: initialData?.id, ...cleanData },
        {
          onSuccess: () => {
            onSuccess();
            form.reset();
          },
        },
      );
    }
  };

  return (
    <div className="w-full">
      <Card className="w-full border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserIcon className="h-5 w-5 text-[#283c7f]" />
            {mode === "create" ? "Crear Nuevo Usuario" : "Editar Usuario"}
          </CardTitle>
          <CardDescription>Complete la información del usuario.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Detalles de Cuenta</TabsTrigger>
              {mode === "edit" && <TabsTrigger value="sessions">Sesiones Activas</TabsTrigger>}
              {mode === "edit" && <TabsTrigger value="permissions">Permisos por Módulo</TabsTrigger>}
            </TabsList>

            <TabsContent value="details">
              {mode === "edit" && initialData && (
                <div className="flex flex-col items-center mb-6">
                  <AvatarUpload
                    src={initialData.avatarUrl}
                    alt={`${initialData.firstName} ${initialData.lastName}`}
                    fallback={initialData.firstName.charAt(0) + initialData.lastName.charAt(0)}
                    onUpload={async (file) => {
                      // Usar el hook directamente importado o passado por props?
                      // Necesitamos instanciar el hook dentro del componente
                      // Pero el onSubmit no es async en el hook, devuelve la mutate.
                      // AvatarUpload espera una promesa void.
                      // Vamos a instanciar los hooks arriba.
                      await updateUserAvatarAsync({ userId: initialData.id, file });
                    }}
                    onRemove={async () => {
                      await removeUserAvatarAsync(initialData.id);
                    }}
                    isLoading={isUpdatingAvatar || isRemovingAvatar}
                    priorityInfo={{
                      hasGoogleAvatar: initialData.isGoogleSsoEnabled,
                      // El objeto person en listado usuarios es parcial, pero tiene id?
                      // En getColumns User type tiene person?: { rut, ... }
                      hasPersonImage: !!initialData.person,
                    }}
                    size="lg"
                  />
                </div>
              )}

              {mode === "edit" && isLocked && (
                <Alert variant="destructive" className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertTitle className="text-red-800 dark:text-red-300">Cuenta Bloqueada</AlertTitle>
                  <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                    <p className="text-red-700 dark:text-red-400 text-sm">
                      Este usuario ha superado el máximo de intentos fallidos. Bloqueado hasta: <strong>{new Date(initialData!.lockedUntil!).toLocaleString()}</strong>
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" size="sm" disabled={isUnlocking} className="bg-red-600 hover:bg-red-700 text-white">
                          {isUnlocking ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Unlock className="mr-2 h-3 w-3" />}
                          Desbloquear Ahora
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="dark:text-white">¿Confirmar Desbloqueo?</AlertDialogTitle>
                          <AlertDialogDescription className="dark:text-gray-300">
                            Esta acción restablecerá los intentos de inicio de sesión de{" "}
                            <strong>
                              {initialData?.firstName} {initialData?.lastName}
                            </strong>{" "}
                            y permitirá el acceso inmediato. Esta intervención quedará registrada en el log de auditoría.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="dark:text-white">Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => unlockUser(initialData!.id)} className="bg-red-600 hover:bg-red-700 text-white">
                            Confirmar Desbloqueo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombres</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan" {...field} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellidos</FormLabel>
                          <FormControl>
                            <Input placeholder="Pérez" {...field} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rut"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>
                              RUT <span className="text-xs text-muted-foreground ml-1">(Opcional)</span>
                            </FormLabel>
                            {mode === "edit" && initialData?.rut && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  if (!isRutEditable) {
                                    setShowRutConfirm(true);
                                  } else {
                                    setIsRutEditable(false);
                                    form.setValue("rut", formatRUT(initialData.rut || ""));
                                  }
                                }}
                              >
                                {isRutEditable ? (
                                  <>
                                    <Unlock className="h-3 w-3 mr-1" /> Bloquear
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3 w-3 mr-1" /> Editar RUT
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isRutEditable}
                              autoComplete="off"
                              onChange={(e) => {
                                const formatted = formatRUT(e.target.value);
                                field.onChange(formatted);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="juan@ejemplo.com" type="email" {...field} autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="roleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Seleccione un rol" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rolesLoading ? (
                                <SelectItem value="loading" disabled>
                                  Cargando roles...
                                </SelectItem>
                              ) : (
                                roles?.map((role: any) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="personId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>
                            Vincular Ficha de Personal <span className="text-xs text-muted-foreground ml-1">(Opcional)</span>
                          </FormLabel>
                          <Popover open={openPersonCombobox} onOpenChange={setOpenPersonCombobox}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" role="combobox" aria-expanded={openPersonCombobox} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                  {field.value
                                    ? persons.find((person) => person.id === field.value)
                                      ? `${persons.find((person) => person.id === field.value)?.firstName} ${persons.find((person) => person.id === field.value)?.lastName}`
                                      : initialData?.person && initialData.person.id === field.value
                                        ? `${initialData.person.firstName} ${initialData.person.lastName}`
                                        : "Seleccione persona..."
                                    : "Buscar persona..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command shouldFilter={false}>
                                <div className="flex items-center border-b px-3">
                                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                  <input
                                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Buscar por nombre o RUT..."
                                    value={personSearch}
                                    onChange={(e) => setPersonSearch(e.target.value)}
                                  />
                                </div>
                                <CommandList>
                                  <CommandEmpty>No se encontraron personas.</CommandEmpty>
                                  <CommandGroup heading="Resultados">
                                    <CommandItem
                                      value="none"
                                      onSelect={() => {
                                        form.setValue("personId", "");
                                        setOpenPersonCombobox(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", field.value === "" ? "opacity-100" : "opacity-0")} />
                                      Sin vinculación
                                    </CommandItem>
                                    {persons.map((person) => (
                                      <CommandItem
                                        value={person.id}
                                        key={person.id}
                                        onSelect={() => {
                                          form.setValue("personId", person.id);
                                          setOpenPersonCombobox(false);
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", person.id === field.value ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {person.firstName} {person.lastName}
                                          </span>
                                          <span className="text-xs text-muted-foreground">{formatRUT(person.rut)}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {mode === "create" && (
                      <FormField
                        control={form.control}
                        name="passwordMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modo de Contraseña</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione modo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="AUTO">Automático (Enviar correo de activación)</SelectItem>
                                <SelectItem value="MANUAL">Manual (Asignar ahora)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {(mode === "edit" || (mode === "create" && passwordMode === "MANUAL")) && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contraseña {mode === "edit" && <span className="text-xs font-normal text-muted-foreground ml-1">(Dejar en blanco para mantener)</span>}</FormLabel>
                              <FormControl>
                                <Input placeholder="******" type="password" {...field} autoComplete="new-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {mode === "edit" && initialData && (
                          <div className="flex items-center justify-between p-4 border rounded-md bg-slate-50 dark:bg-slate-900/50">
                            <div className="space-y-1">
                              <p className="text-sm font-medium">Recuperación de Contraseña</p>
                              <p className="text-xs text-muted-foreground">Enviar un enlace al usuario para que restablezca su clave.</p>
                            </div>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={async () => {
                                toast.promise(
                                  async () => {
                                    const res = await fetch(`/api/v1/users/${initialData.id}/recover`, {
                                      method: "POST",
                                    });
                                    if (!res.ok) throw new Error("Error al enviar correo");
                                    return res.json();
                                  },
                                  {
                                    loading: "Enviando enlace...",
                                    success: "Enlace enviado exitosamente",
                                    error: "Error al enviar enlace",
                                  },
                                );
                              }}
                            >
                              <Unlock className="mr-2 h-3 w-3" /> Enviar Enlace
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center space-x-2 pt-8">
                      <FormField
                        control={form.control}
                        name="isGoogleSsoEnabled"
                        render={({ field }) => {
                          const isDisabled = !isGoogleSsoGloballyEnabled;
                          return (
                            <FormItem
                              className={`flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4 shadow-sm w-full ${isDisabled ? "opacity-60 bg-gray-50 dark:bg-gray-800/50" : ""}`}
                            >
                              <div className="space-y-1">
                                <FormLabel className={isDisabled ? "cursor-not-allowed" : "cursor-pointer"}>Habilitar Google SSO</FormLabel>
                                <p className="text-sm text-muted-foreground">Permitir inicio de sesión con Google.</p>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isDisabled} />
                              </FormControl>
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} className="dark:text-white">
                      <X className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                    <Button type="submit" disabled={isCreating || isUpdating} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                      {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4 text-white" /> Guardar
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="sessions">{mode === "edit" && initialData && <SessionList isAdminView targetUserId={initialData.id} />}</TabsContent>
            
            <TabsContent value="permissions">
              {mode === "edit" && initialData && <PermissionsTab userId={initialData.id} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={showRutConfirm} onOpenChange={setShowRutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro que desea editar el RUT?</AlertDialogTitle>
            <AlertDialogDescription>El RUT es un identificador crítico. Esta acción quedará registrada en el log de auditoría.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsRutEditable(true);
                setShowRutConfirm(false);
              }}
              className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white"
            >
              Confirmar y Editar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
