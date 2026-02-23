"use client";

import { usePerson } from "@/lib/hooks/use-persons";
import { CertificationsGrid } from "@/components/persons/certifications-grid";
import { ResolutionForm } from "@/components/persons/resolution-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useParams } from "next/navigation";
import { WorkerCertification } from "@/lib/hooks/use-certifications";
import { format } from "date-fns";

export default function CertificationsPage() {
    const { id } = useParams<{ id: string }>();
    const { data: person, isLoading, error } = usePerson(id);
    const [open, setOpen] = useState(false);
    const [renewalData, setRenewalData] = useState<{ defaultCertifications?: any[] }>({});

    const handleRenew = (cert: WorkerCertification) => {
        setRenewalData({
            defaultCertifications: [{
                masterId: cert.certificationMaster.id,
                inscriptionNumber: "", // New inscription number required
                renewedFromId: cert.id,
                renewedFromLabel: `${cert.certificationMaster.code} - Vence: ${format(new Date(cert.expiryDate), 'dd/MM/yyyy')}`
            }]
        });
        setOpen(true);
    };

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if (!val) setRenewalData({});
    };

    if (isLoading) return <div>Cargando...</div>;
    if (error || !person) return <div>Error</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold tracking-tight">Certificaciones</h2>
                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#283c7f] text-white hover:bg-[#1e2d5f]">
                            <Plus className="mr-2 h-4 w-4" /> Nueva Resolución
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-full md:max-w-[80vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Registrar Resolución</DialogTitle>
                            <DialogDescription>
                                Ingrese los detalles de la resolución y las certificaciones otorgadas.
                            </DialogDescription>
                        </DialogHeader>
                        <ResolutionForm
                            personId={person.id}
                            onSuccess={() => setOpen(false)}
                            defaultCertifications={renewalData.defaultCertifications}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <CertificationsGrid personId={person.id} onRenew={handleRenew} />
        </div>
    );
}
