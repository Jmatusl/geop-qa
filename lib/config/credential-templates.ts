export interface CredentialConfig {
    id: string;
    name: string;
    description: string;
}

export const CREDENTIAL_TEMPLATES: CredentialConfig[] = [
    {
        id: "modern",
        name: "Modern Gradient",
        description: "Diseño moderno con curvas y gradientes corporativos. Ideal para pantallas móviles de alta resolución."
    },
    {
        id: "classic",
        name: "Classic Corporate",
        description: "Diseño corporativo tradicional, estructura clara y legible. Ideal para entornos formales."
    },
    {
        id: "etecma",
        name: "Estilo Referencia (Etecma)",
        description: "Diseño personalizado basado en referencia de imagen. Colores corporativos y curvas."
    }
];

export const DEFAULT_TEMPLATE_ID = "etecma";
