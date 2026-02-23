"use client";

import { PersonFormEdit } from "@/components/persons/person-form-edit";
import { usePerson } from "@/lib/hooks/use-persons";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function PersonProfilePage() {
    const params = useParams<{ id: string }>();
    const { data: person, isLoading, error } = usePerson(params.id);

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !person) {
        return <div className="text-red-500">Error al cargar datos.</div>
    }

    return (
        <div className="w-full">
            <PersonFormEdit person={person} />
        </div>
    );
}
