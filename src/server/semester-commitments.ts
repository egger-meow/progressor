import { prisma } from "./db";
import { parseTags, serializeTags } from "./tags";

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
  // Default false: when a Semester is configured (src/server/semester.ts),
  // the Scheduler only places this commitment's occurrence for weeks
  // inside the semester's range unless this is true — see
  // src/scheduler/hard-constraints.ts.
  ignoreSemesterBounds?: boolean;
  tags?: string[];
}

export interface UpdateFixedCommitmentInput {
  title?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  ignoreSemesterBounds?: boolean;
  tags?: string[];
}

export interface CreateDeadlineTaskInput {
  title: string;
  dueAt: Date;
  // Total estimated work, in hours (fractional allowed, e.g. 1.5). The
  // Scheduler splits this across sessions — see hard-constraints.ts.
  estimatedHours: number;
  tags?: string[];
}

export interface UpdateDeadlineTaskInput {
  title?: string;
  dueAt?: Date;
  estimatedHours?: number;
  tags?: string[];
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

function withParsedTags<T extends { tags: string }>(
  record: T,
): Omit<T, "tags"> & { tags: string[] } {
  return { ...record, tags: parseTags(record.tags) };
}

export async function createFixedCommitment(input: CreateFixedCommitmentInput) {
  assertValidDayOfWeek(input.dayOfWeek);
  assertValidTime("startTime", input.startTime);
  assertValidTime("endTime", input.endTime);
  assertValidTimeRange(input.startTime, input.endTime);

  const commitment = await prisma.fixedCommitment.create({
    data: {
      title: input.title,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      ignoreSemesterBounds: input.ignoreSemesterBounds ?? false,
      tags: serializeTags(input.tags),
    },
  });
  return withParsedTags(commitment);
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

  const commitment = await prisma.fixedCommitment.update({
    where: { id },
    data: {
      title: input.title,
      dayOfWeek,
      startTime,
      endTime,
      ignoreSemesterBounds: input.ignoreSemesterBounds,
      tags: input.tags === undefined ? undefined : serializeTags(input.tags),
    },
  });
  return withParsedTags(commitment);
}

export async function removeFixedCommitment(id: string): Promise<void> {
  const existing = await prisma.fixedCommitment.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`FixedCommitment not found: ${id}`);
  }
  await prisma.fixedCommitment.delete({ where: { id } });
}

export async function getFixedCommitment(id: string) {
  const commitment = await prisma.fixedCommitment.findUnique({ where: { id } });
  return commitment ? withParsedTags(commitment) : null;
}

export async function listFixedCommitments() {
  const commitments = await prisma.fixedCommitment.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return commitments.map(withParsedTags);
}

function assertValidDueAt(dueAt: Date | undefined): asserts dueAt is Date {
  if (!(dueAt instanceof Date) || Number.isNaN(dueAt.getTime())) {
    throw new Error("DeadlineTask requires a valid dueAt");
  }
}

function assertValidEstimatedHours(estimatedHours: number): void {
  if (!Number.isFinite(estimatedHours) || estimatedHours <= 0) {
    throw new Error("estimatedHours must be > 0");
  }
}

export async function createDeadlineTask(input: CreateDeadlineTaskInput) {
  assertValidDueAt(input.dueAt);
  assertValidEstimatedHours(input.estimatedHours);

  const task = await prisma.deadlineTask.create({
    data: {
      title: input.title,
      dueAt: input.dueAt,
      estimatedHours: input.estimatedHours,
      tags: serializeTags(input.tags),
    },
  });
  return withParsedTags(task);
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
  if (input.estimatedHours !== undefined) {
    assertValidEstimatedHours(input.estimatedHours);
  }

  const task = await prisma.deadlineTask.update({
    where: { id },
    data: {
      title: input.title,
      dueAt: input.dueAt,
      estimatedHours: input.estimatedHours,
      tags: input.tags === undefined ? undefined : serializeTags(input.tags),
    },
  });
  return withParsedTags(task);
}

export async function removeDeadlineTask(id: string): Promise<void> {
  const existing = await prisma.deadlineTask.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`DeadlineTask not found: ${id}`);
  }
  await prisma.deadlineTask.delete({ where: { id } });
}

export async function getDeadlineTask(id: string) {
  const task = await prisma.deadlineTask.findUnique({ where: { id } });
  return task ? withParsedTags(task) : null;
}

export async function listDeadlineTasks() {
  const tasks = await prisma.deadlineTask.findMany({ orderBy: { dueAt: "asc" } });
  return tasks.map(withParsedTags);
}
