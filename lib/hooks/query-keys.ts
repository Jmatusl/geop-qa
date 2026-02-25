/**
 * Query Keys - Actividades
 * 
 * Define las claves de React Query de manera centralizada y type-safe.
 * Facilita la invalidación granular y el prefetching estratégico.
 * 
 * @module QueryKeys
 */

export const actividadesQueryKeys = {
  // Raíz de todas las queries de actividades
  all: ['actividades'] as const,

  // Listados
  lists: () => [...actividadesQueryKeys.all, 'list'] as const,
  list: (filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    statusId?: string;
    priorityId?: string;
    applicantId?: string;
    shipId?: string;
    isApproved?: boolean;
    userCheckRequerido?: boolean;
  }) => [...actividadesQueryKeys.lists(), filters] as const,

  // Detalles individuales
  details: () => [...actividadesQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...actividadesQueryKeys.details(), id] as const,

  // Catálogos
  catalogs: {
    all: ['actividades', 'catalogs'] as const,
    activityTypes: ['actividades', 'catalogs', 'activity-types'] as const,
    priorities: ['actividades', 'catalogs', 'priorities'] as const,
    statuses: ['actividades', 'catalogs', 'statuses'] as const,
    locations: ['actividades', 'catalogs', 'locations'] as const,
    ships: ['actividades', 'catalogs', 'ships'] as const,
    masterActivityNames: ['actividades', 'catalogs', 'master-activity-names'] as const,
    areas: ['actividades', 'catalogs', 'areas'] as const,
    suppliers: ['actividades', 'catalogs', 'suppliers'] as const,
    users: ['actividades', 'catalogs', 'users'] as const,
  },

  // Timeline y comentarios
  timeline: (requirementId: string) => [...actividadesQueryKeys.detail(requirementId), 'timeline'] as const,
  comments: (requirementId: string) => [...actividadesQueryKeys.detail(requirementId), 'comments'] as const,

  // Adjuntos
  attachments: (requirementId: string) => [...actividadesQueryKeys.detail(requirementId), 'attachments'] as const,

  // Recepciones
  receptions: (requirementId: string) => [...actividadesQueryKeys.detail(requirementId), 'receptions'] as const,
};

export const mantencionQueryKeys = {
  // Raíz de todas las queries de mantencion
  all: ['mantencion'] as const,

  // Listados
  lists: () => [...mantencionQueryKeys.all, 'list'] as const,
  list: (filters: {
    page?: number;
    pageSize?: number;
    search?: string;
    statusId?: string;
    installationId?: string;
    areaId?: string;
  }) => [...mantencionQueryKeys.lists(), filters] as const,

  // Detalles
  details: () => [...mantencionQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...mantencionQueryKeys.details(), id] as const,

  // Catálogos
  catalogs: {
    all: ['mantencion', 'catalogs'] as const,
    installations: ['mantencion', 'catalogs', 'installations'] as const,
    areas: ['mantencion', 'catalogs', 'areas'] as const,
    systems: ['mantencion', 'catalogs', 'systems'] as const,
    equipments: ['mantencion', 'catalogs', 'equipments'] as const,
    types: ['mantencion', 'catalogs', 'types'] as const,
    applicants: ['mantencion', 'catalogs', 'applicants'] as const,
    statuses: ['mantencion', 'catalogs', 'statuses'] as const,
  },

  // Trabajo
  workReports: {
    all: ['mantencion', 'work-reports'] as const,
    list: (filters: any) => [...mantencionQueryKeys.workReports.all, filters] as const,
    detail: (id: string) => [...mantencionQueryKeys.workReports.all, 'detail', id] as const,
  },
};

/**
 * Helpers para invalidación de queries
 */
export const queryInvalidation = {
  // Invalidar todos los listados de actividades
  invalidateRequirementLists: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.lists() });
  },

  // Invalidar un requerimiento específico
  invalidateRequirement: (queryClient: any, requirementId: string) => {
    queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.detail(requirementId) });
  },

  // Invalidar todos los catálogos de actividades
  invalidateActivityCatalogs: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.catalogs.all });
  },

  // Invalidar un catálogo específico
  invalidateCatalog: (queryClient: any, catalogKey: keyof typeof actividadesQueryKeys.catalogs) => {
    if (catalogKey === 'all') return;
    queryClient.invalidateQueries({ queryKey: actividadesQueryKeys.catalogs[catalogKey] });
  },
};

/**
 * Configuraciones de stale time por tipo de query
 */
export const staleTimes = {
  // Catálogos: 5 minutos (cambian poco)
  catalogs: 5 * 60 * 1000,
  
  // Listados: 30 segundos (actualizaciones frecuentes)
  lists: 30 * 1000,
  
  // Detalles: 1 minuto
  details: 60 * 1000,
  
  // Timeline/Comentarios: 15 segundos (alta interactividad)
  realtime: 15 * 1000,
};
