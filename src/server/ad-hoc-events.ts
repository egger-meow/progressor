import { prisma } from "./db";

export interface CreateAdHocEventInput {
  title: string;
  notes?: string;
}

export interface UpdateAdHocEventInput {
  title?: string;
  notes?: string | null;
}

export async function createAdHocEvent(input: CreateAdHocEventInput) {
  return prisma.adHocEvent.create({
    data: { title: input.title, notes: input.notes ?? null },
  });
}

export async function updateAdHocEvent(id: string, input: UpdateAdHocEventInput) {
  const existing = await prisma.adHocEvent.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`AdHocEvent not found: ${id}`);
  }
  return prisma.adHocEvent.update({
    where: { id },
    data: { title: input.title, notes: input.notes },
  });
}

export function getAdHocEvent(id: string) {
  return prisma.adHocEvent.findUnique({ where: { id } });
}

export function listAdHocEvents() {
  return prisma.adHocEvent.findMany({ orderBy: { createdAt: "desc" } });
}
