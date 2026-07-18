import { prisma } from "./db";

// FixedCommitment and DeadlineTask are the two kinds of
// docs/domain-model.md's "Semester Commitment". Deliberately no shared
// input type or shared create/update function — see prisma/schema.prisma's
// comment on why they're separate models; keeping the functions separate
// too is what makes them non-interchangeable in code, not just in the DB.

export interface CreateFixedCommitmentInput {
  title: string;
  dayOfWeek: number; // 0 (Sunday) - 6 (Saturday)
  startTime: string; // "HH:mm", 24h
  endTime: string; // "HH:mm", 24h
}

export interface UpdateFixedCommitmentInput {
  title?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
}

export interface CreateDeadlineTaskInput {
  title: string;
  dueAt: Date;
  estimatedDays: number;
}

export interface UpdateDeadlineTaskInput {
  title?: string;
  dueAt?: Date;
  estimatedDays?: number;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function assertValidDayOfWeek(dayOfWeek: number): void {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Invalid dayOfWeek: ${dayOfWeek} (expected 0-6)`);
  }
}

function assertValidTime(label: string, value: string): void {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    throw new Error(`Invalid ${label}: ${value} (expected "HH:mm")`);
  }
}

function assertValidTimeRange(startTime: string, endTime: string): void {
  if (startTime >= endTime) {
    throw new Error(
      `startTime (${startTime}) must be before endTime (${endTime})`,
    );
  }
}

export async function createFixedCommitment(input: CreateFixedCommitmentInput) {
  assertValidDayOfWeek(input.dayOfWeek);
  assertValidTime("startTime", input.startTime);
  assertValidTime("endTime", input.endTime);
  assertValidTimeRange(input.startTime, input.endTime);

  return prisma.fixedCommitment.create({
    data: {
      title: input.title,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });
}

export async function updateFixedCommitment(
  id: string,
  input: UpdateFixedCommitmentInput,
) {
  const existing = await prisma.fixedCommitment.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`FixedCommitment not found: ${id}`);
  }

  const dayOfWeek = input.dayOfWeek ?? existing.dayOfWeek;
  const startTime = input.startTime ?? existing.startTime;
  const endTime = input.endTime ?? existing.endTime;
  assertValidDayOfWeek(dayOfWeek);
  assertValidTime("startTime", startTime);
  assertValidTime("endTime", endTime);
  assertValidTimeRange(startTime, endTime);

  return prisma.fixedCommitment.update({
    where: { id },
    data: { title: input.title, dayOfWeek, startTime, endTime },
  });
}

export async function removeFixedCommitment(id: string): Promise<void> {
  const existing = await prisma.fixedCommitment.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`FixedCommitment not found: ${id}`);
  }
  await prisma.fixedCommitment.delete({ where: { id } });
}

export function getFixedCommitment(id: string) {
  return prisma.fixedCommitment.findUnique({ where: { id } });
}

export function listFixedCommitments() {
  return prisma.fixedCommitment.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

function assertValidDueAt(dueAt: Date | undefined): asserts dueAt is Date {
  if (!(dueAt instanceof Date) || Number.isNaN(dueAt.getTime())) {
    throw new Error("DeadlineTask requires a valid dueAt");
  }
}

function assertValidEstimatedDays(estimatedDays: number): void {
  if (estimatedDays <= 0) {
    throw new Error("estimatedDays must be > 0");
  }
}

export async function createDeadlineTask(input: CreateDeadlineTaskInput) {
  assertValidDueAt(input.dueAt);
  assertValidEstimatedDays(input.estimatedDays);

  return prisma.deadlineTask.create({
    data: {
      title: input.title,
      dueAt: input.dueAt,
      estimatedDays: input.estimatedDays,
    },
  });
}

export async function updateDeadlineTask(
  id: string,
  input: UpdateDeadlineTaskInput,
) {
  const existing = await prisma.deadlineTask.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`DeadlineTask not found: ${id}`);
  }

  if (input.dueAt !== undefined) {
    assertValidDueAt(input.dueAt);
  }
  if (input.estimatedDays !== undefined) {
    assertValidEstimatedDays(input.estimatedDays);
  }

  return prisma.deadlineTask.update({
    where: { id },
    data: {
      title: input.title,
      dueAt: input.dueAt,
      estimatedDays: input.estimatedDays,
    },
  });
}

export async function removeDeadlineTask(id: string): Promise<void> {
  const existing = await prisma.deadlineTask.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`DeadlineTask not found: ${id}`);
  }
  await prisma.deadlineTask.delete({ where: { id } });
}

export function getDeadlineTask(id: string) {
  return prisma.deadlineTask.findUnique({ where: { id } });
}

export function listDeadlineTasks() {
  return prisma.deadlineTask.findMany({ orderBy: { dueAt: "asc" } });
}
