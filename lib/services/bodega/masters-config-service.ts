import { prisma } from "@/lib/prisma";

export interface BodegaMasterItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type MasterKey = "BODEGA_MAESTROS_CENTROS_COSTO" | "BODEGA_MAESTROS_MOTIVOS_AJUSTE";

export class BodegaMastersConfigService {
  private readonly prisma = prisma;

  private async load(key: MasterKey): Promise<BodegaMasterItem[]> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key } });
    if (!setting?.isActive || !setting.value) return [];
    const value = setting.value as unknown;
    if (!Array.isArray(value)) return [];
    return value as BodegaMasterItem[];
  }

  private async save(key: MasterKey, items: BodegaMasterItem[], userId: string) {
    await this.prisma.appSetting.upsert({
      where: { key },
      create: {
        key,
        value: items as unknown as object,
        description: `Maestro ${key}`,
        isActive: true,
        updatedById: userId,
      },
      update: {
        value: items as unknown as object,
        isActive: true,
        updatedById: userId,
      },
    });
  }

  async list(key: MasterKey, search = "", active?: boolean) {
    const rows = await this.load(key);
    return rows
      .filter((row) => {
        const bySearch = search
          ? row.code.toLowerCase().includes(search.toLowerCase()) || row.name.toLowerCase().includes(search.toLowerCase())
          : true;
        const byActive = active === undefined ? true : row.isActive === active;
        return bySearch && byActive;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  async create(
    key: MasterKey,
    payload: {
      code: string;
      name: string;
      description?: string | null;
      isActive: boolean;
    },
    userId: string
  ) {
    const rows = await this.load(key);
    const duplicate = rows.find((row) => row.code.toUpperCase() === payload.code.toUpperCase());
    if (duplicate) {
      throw new Error("Ya existe un registro con ese código");
    }

    const now = new Date().toISOString();
    const created: BodegaMasterItem = {
      id: crypto.randomUUID(),
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      isActive: payload.isActive,
      createdAt: now,
      updatedAt: now,
    };

    await this.save(key, [...rows, created], userId);
    return created;
  }

  async update(key: MasterKey, id: string, payload: Partial<Omit<BodegaMasterItem, "id" | "createdAt" | "updatedAt">>, userId: string) {
    const rows = await this.load(key);
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) {
      throw new Error("Registro no encontrado");
    }

    const candidateCode = (payload.code ?? rows[index].code).trim().toUpperCase();
    const duplicate = rows.find((row) => row.id !== id && row.code.toUpperCase() === candidateCode);
    if (duplicate) {
      throw new Error("Ya existe un registro con ese código");
    }

    rows[index] = {
      ...rows[index],
      code: candidateCode,
      name: (payload.name ?? rows[index].name).trim(),
      description: payload.description !== undefined ? (payload.description?.trim() || null) : rows[index].description,
      isActive: payload.isActive ?? rows[index].isActive,
      updatedAt: new Date().toISOString(),
    };

    await this.save(key, rows, userId);
    return rows[index];
  }

  async remove(key: MasterKey, id: string, userId: string) {
    const rows = await this.load(key);
    const nextRows = rows.filter((row) => row.id !== id);
    if (nextRows.length === rows.length) {
      throw new Error("Registro no encontrado");
    }
    await this.save(key, nextRows, userId);
    return true;
  }
}

export const bodegaMastersConfigService = new BodegaMastersConfigService();
