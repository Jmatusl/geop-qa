import React from "react";
import { PersonHeader } from "@/components/persons/person-header";

export default async function PersonLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <div className="w-full space-y-6">
            <PersonHeader id={id} />
            <div className="mt-6">
                {children}
            </div>
        </div>
    );
}
