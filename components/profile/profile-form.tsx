"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useProfile, useUpdateProfile, useUpdateAvatar, useRemoveAvatar } from "@/lib/hooks/use-profile";
import { Loader2, Save } from "lucide-react";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatRUT } from "@/lib/utils/chile-utils";
import { AvatarUpload } from "@/components/ui/avatar-upload";

const profileSchema = z.object({
  firstName: z.string().min(2, "Mínimo 2 caracteres"),
  lastName: z.string().min(2, "Mínimo 2 caracteres"),
  phone: z.string().optional(),
  rut: z.string().optional(), // Read only
  email: z.string().email().optional(), // Read only
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { mutateAsync: uploadAvatar, isPending: isUploadingAvatar } = useUpdateAvatar();
  const { mutateAsync: removeAvatar, isPending: isRemovingAvatar } = useRemoveAvatar();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      rut: "",
      email: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone || "",
        rut: formatRUT(profile.rut),
        email: profile.email,
      });
    }
  }, [profile, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    });
  };

  if (isLoading) return <div>Cargando perfil...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Datos Personales</CardTitle>
        <CardDescription>Actualice su información básica de contacto.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center mb-6">
          <AvatarUpload
            src={profile?.avatarUrl}
            alt="Avatar"
            fallback={profile?.firstName?.charAt(0) + profile?.lastName?.charAt(0)}
            onUpload={async (file) => await uploadAvatar(file)}
            onRemove={async () => await removeAvatar()}
            isLoading={isUploadingAvatar || isRemovingAvatar}
            priorityInfo={{
              hasGoogleAvatar: profile?.userIdentities?.some((id: any) => id.provider === "google" && id.isEnabled),
              hasPersonImage: !!profile?.person?.imagePath,
            }}
          />
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombres</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
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
                      <Input {...field} autoComplete="off" />
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
                    <FormLabel>RUT</FormLabel>
                    <FormControl>
                      <Input {...field} disabled className="bg-slate-100 dark:bg-slate-800" />
                    </FormControl>
                    <FormDescription>Identificador único no modificable.</FormDescription>
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
                      <Input {...field} disabled className="bg-slate-100 dark:bg-slate-800" />
                    </FormControl>
                    <FormDescription>Contacte al administrador para cambiarlo.</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+569..." autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending} className="bg-[#283c7f] hover:bg-[#1e2d5f] text-white">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4 text-white" /> Guardar Cambios
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
