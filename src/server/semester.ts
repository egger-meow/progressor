import { prisma } from "./db";

// Semester (prisma/schema.prisma comment) — single-user app, one active
// semester at a time, so it's a singleton row (fixed id "singleton").
// Bounds a non-opted-out FixedCommitment's occurrences (see
// src/scheduler/hard-constraints.ts) and drives the Weekly View's "第 N
// 週" display (src/app/week.ts's semesterWeekIndex).

const SEMESTER_ID = "singleton";

export interface Semester {
  startDate: Date;
  weekCount: number;
}

export interface SetSemesterInput {
  startDate: Date;
  weekCount: number;
}

function assertValidStartDate(startDate: Date | undefined): asserts startDate is Date {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    throw new Error("Semester requires a valid startDate");
  }
}

function assertValidWeekCount(weekCount: number): void {
  if (!Number.isInteger(weekCount) || weekCount <= 0) {
    throw new Error("Semester weekCount must be a positive integer");
  }
}

export async function getSemester(): Promise<Semester | null> {
  const row = await prisma.semester.findUnique({ where: { id: SEMESTER_ID } });
  return row ? { startDate: row.startDate, weekCount: row.weekCount } : null;
}

export async function setSemester(input: SetSemesterInput): Promise<Semester> {
  assertValidStartDate(input.startDate);
  assertValidWeekCount(input.weekCount);

  const row = await prisma.semester.upsert({
    where: { id: SEMESTER_ID },
    create: { id: SEMESTER_ID, startDate: input.startDate, weekCount: input.weekCount },
    update: { startDate: input.startDate, weekCount: input.weekCount },
  });
  return { startDate: row.startDate, weekCount: row.weekCount };
}
