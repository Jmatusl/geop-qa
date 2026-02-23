"use client";

import { JobAssignmentDialog } from "@/components/persons/job-assignment-dialog";
import { AreaAssignmentDialog } from "@/components/persons/area-assignment-dialog";
import { SupervisorAssignmentDialog } from "@/components/persons/supervisor-assignment-dialog";
import { JobTimeline } from "@/components/persons/job-timeline";
import { usePerson } from "@/lib/hooks/use-persons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useParams } from "next/navigation";

export default function JobHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data: person, isLoading, error } = usePerson(id);

  if (isLoading) return <div>Cargando historial...</div>;
  if (error || !person) return <div>Error al cargar datos.</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Historial Laboral</CardTitle>
            <CardDescription>Registro de movimientos y asignaciones.</CardDescription>
          </div>
          <div className="flex gap-2">
            <JobAssignmentDialog personId={id} />
            <AreaAssignmentDialog personId={id} />
            <SupervisorAssignmentDialog personId={id} />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <JobTimeline person={person} />
        </CardContent>
      </Card>
    </div>
  );
}
