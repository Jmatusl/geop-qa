/**
 * Helper: Configuración del Módulo de Solicitud de Insumos
 * Archivo: lib/config/supply-config.ts
 * 
 * Descripción: Carga la configuración del módulo desde app_setting (BD) con fallback al archivo JSON.
 * Permite personalización desde la UI en /insumos/configuracion sin modificar código.
 */

import { prisma } from '@/lib/prisma';
import fallbackConfig from './supply-config-fallback.json';

// Tipos de configuración
export interface SupplyModuleConfig {
  module: {
    code: string;
    name: string;
    icon: string;
    description: string;
  };
  routes: {
    base: string;
    dashboard: string;
    create: string;
    list: string;
    detail: string;
    config: string;
  };
  maintainers: {
    units: {
      route: string;
      name: string;
      icon: string;
      description: string;
    };
  };
  permissions: {
    view: string;
    create: string;
    edit: string;
    delete: string;
    approve: string;
    quotation: {
      manage: string;
      send: string;
      receive: string;
      approve: string;
    };
  };
  workflow: {
    initialStatus: string;
    finalStatuses: string[];
    requireApproval: boolean;
    autoNumbering: {
      enabled: boolean;
      prefix: string;
      format: string;
      quotationPrefix: string;
    };
  };
  ui: {
    priorities: Array<{
      value: string;
      label: string;
      color: string;
      icon: string;
    }>;
    dashboard: {
      showKPIs: boolean;
      showRecentRequests: boolean;
      showPendingQuotations: boolean;
      kpiRefreshInterval: number;
    };
    table: {
      defaultPageSize: number;
      pageSizeOptions: number[];
      enableFilters: boolean;
      enableSearch: boolean;
      enableExport: boolean;
    };
    form: {
      maxItems: number;
      maxFileSize: number;
      allowedFileTypes: string[];
      requireJustification: boolean;
      requireSpecifications: boolean;
    };
  };
  email: {
    enabled: boolean;
    templates: {
      newRequest: string;
      quotationRequested: string;
      quotationReceived: string;
      requestApproved: string;
      requestRejected: string;
    };
    notifications: {
      onNewRequest: boolean;
      onQuotationSent: boolean;
      onQuotationReceived: boolean;
      onApproval: boolean;
      onRejection: boolean;
    };
  };
  quotation: {
    expirationDays: number;
    allowMultipleSuppliers: boolean;
    requireMinimumQuotations: boolean;
    minimumQuotations: number;
    autoMarkAsNoQuoted: {
      enabled: boolean;
      daysAfterSent: number;
    };
  };
  reports: {
    enabled: boolean;
    formats: string[];
    templates: {
      requestDetail: string;
      quotationComparison: string;
      monthlyReport: string;
    };
  };
  audit: {
    logCreation: boolean;
    logEdition: boolean;
    logStatusChange: boolean;
    logQuotationSent: boolean;
    logApproval: boolean;
    logRejection: boolean;
    retentionDays: number;
  };
}

/**
 * Obtiene la configuración del módulo desde la BD o fallback
 */
export async function getSupplyModuleConfig(): Promise<SupplyModuleConfig> {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'supply_module_config' },
    });

    if (setting?.value) {
      // Merge configuración de BD con fallback (por si se agregan nuevas claves)
      return deepMerge(fallbackConfig, setting.value as any) as SupplyModuleConfig;
    }
  } catch (error) {
    console.warn('⚠️  No se pudo cargar configuración desde BD, usando fallback:', error);
  }

  return fallbackConfig as SupplyModuleConfig;
}

/**
 * Guarda la configuración del módulo en la BD
 */
export async function updateSupplyModuleConfig(
  config: Partial<SupplyModuleConfig>,
  updatedBy: string
): Promise<void> {
  const currentConfig = await getSupplyModuleConfig();
  const newConfig = deepMerge(currentConfig, config);

  await prisma.appSetting.upsert({
    where: { key: 'supply_module_config' },
    create: {
      key: 'supply_module_config',
      value: newConfig as any,
      description: 'Configuración del módulo de Solicitud de Insumos',
      updatedById: updatedBy,
    },
    update: {
      value: newConfig as any,
      updatedById: updatedBy,
    },
  });
}

/**
 * Merge profundo de objetos (preserva valores del fallback si no existen en custom)
 */
function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Shortcuts para configuraciones específicas (Server Components)
 */
export async function getSupplyWorkflowConfig() {
  const config = await getSupplyModuleConfig();
  return config.workflow;
}

export async function getSupplyUIConfig() {
  const config = await getSupplyModuleConfig();
  return config.ui;
}

export async function getSupplyEmailConfig() {
  const config = await getSupplyModuleConfig();
  return config.email;
}

export async function getSupplyQuotationConfig() {
  const config = await getSupplyModuleConfig();
  return config.quotation;
}
