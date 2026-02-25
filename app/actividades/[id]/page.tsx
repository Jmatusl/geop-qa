import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";
import DetalleDesktop from "./components/DetalleDesktop";
import DetalleClient from "./components/DetalleClient";
import ResumenDesktop from "./components/ResumenDesktop";
import ResumenClient from "./components/ResumenClient";
import AdaptiveIngresoForm from "./components/AdaptiveIngresoForm";


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const req = await prisma.actRequirement.findUnique({
    where: { id },
    select: { folio: true, folioPrefix: true, title: true },
  });
  if (!req) return { title: "No encontrado" };
  return { title: `${req.folioPrefix}-${String(req.folio).padStart(4, "0")} — ${req.title}` };
}

export default async function ActividadDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect("/login");

  // Obtener requerimiento con todas sus relaciones
  const requirement = await prisma.actRequirement.findUnique({
    where: { id },
    include: {
      activityType: { select: { id: true, name: true, code: true } },
      priority: { select: { id: true, name: true, colorHex: true } },
      status: { select: { id: true, name: true, code: true, colorHex: true } },
      location: { select: { id: true, name: true } },
      area: { select: { id: true, name: true } },
      ship: { select: { id: true, name: true } },
      applicant: { select: { id: true, firstName: true, lastName: true, email: true } },
      responsible: { select: { id: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      approvedBy: { select: { id: true, firstName: true, lastName: true } },
      userCheckedBy: { select: { id: true, firstName: true, lastName: true } },
      activities: {
        include: {
          activityType: { select: { name: true } },
          responsible: { select: { firstName: true, lastName: true } },
          checkedBy: { select: { firstName: true, lastName: true } },
          supplier: { select: { id: true, fantasyName: true, legalName: true, rut: true, contactEmail: true, activityEmails: true } },
          attachments: {
            include: { uploadedBy: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: "desc" },
          },
          receptions: {
            include: {
              receivedBy: { select: { firstName: true, lastName: true } },
              evidences: true,
            },
            orderBy: { receivedAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        include: { uploadedBy: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      },
      timeline: {
        include: {
          changedBy: { select: { firstName: true, lastName: true } },
          prevStatus: { select: { name: true, colorHex: true } },
          newStatus: { select: { name: true, colorHex: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!requirement) notFound();

  // Catálogos, permisos y usuarios en paralelo para posible edición
  const [statuses, users, permissions, activityTypes, priorities, locations, ships, masterActivityNames, areas, suppliers] = await Promise.all([
    prisma.actStatusReq.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true, code: true, colorHex: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true, email: true } }),
    import("../configuracion/sistema/actions").then((m) => m.getMyActPermissions()),
    prisma.actActivityType.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.actPriority.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, colorHex: true, code: true } }),
    prisma.mntActivityLocation.findMany({ where: { isEnabled: true }, orderBy: { name: "asc" }, select: { id: true, name: true, commune: true } }),
    prisma.mntInstallation.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.actMasterActivityName.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, defaultAreaId: true, defaultApplicantUserId: true, defaultDescription: true }
    }),
    prisma.mntArea.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.mntSupplier.findMany({ where: { isActive: true }, orderBy: { fantasyName: "asc" }, select: { id: true, fantasyName: true, legalName: true, rut: true } }),
  ]);

  const catalogs = {
    activityTypes,
    priorities,
    locations,
    users,
    ships,
    masterActivityNames,
    areas,
    suppliers
  };

  // Convertir Decimales a String/Number para que Next.js no se queje (Serialización)
  const requirementData = JSON.parse(JSON.stringify(requirement));

  // Lógica condicional: Si está APROBADO o en proceso de recepción, mostrar resumen. Si no, mostrar formulario de edición.
  const statusCode = requirement.status?.code || "";
  const isApprovedOrInReception = ["APROB", "EN_RECEP", "REC_PARCIAL", "FINALIZADO"].includes(statusCode);

  if (isApprovedOrInReception) {
    // Vista de resumen (aprobado)
    return (
      <div className="w-full">
        {/* Versión móvil */}
        <div className="lg:hidden">
          <ResumenClient
            requirement={requirementData}
            currentUser={session.user}
            permissions={permissions}
          />
        </div>

        {/* Versión escritorio */}
        <div className="hidden lg:block">
          <ResumenDesktop
            requirement={requirementData}
            currentUser={session.user}
            permissions={permissions}
          />
        </div>
      </div>
    );
  }

  // Vista de edición (no aprobado)
  return (
    <div className="w-full lg:py-6">
      <AdaptiveIngresoForm
        catalogs={catalogs}
        currentUser={session.user}
        initialData={requirementData}
        requirementId={requirementData.id}
        isEditing={true}
        permissions={permissions}
      />
    </div>
  );
}

