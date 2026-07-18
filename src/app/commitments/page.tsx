import Link from "next/link";
import { listFixedCommitments, listDeadlineTasks } from "@/server/semester-commitments";
import {
  createDeadlineTaskAction,
  createFixedCommitmentAction,
  deleteDeadlineTaskAction,
  deleteFixedCommitmentAction,
  updateDeadlineTaskAction,
  updateFixedCommitmentAction,
} from "./actions";
import { formatDateParam } from "../week";
import styles from "../page.module.css";

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default async function CommitmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ editFC?: string; editDT?: string; error?: string }>;
}) {
  const params = await searchParams;
  const [fixedCommitments, deadlineTasks] = await Promise.all([
    listFixedCommitments(),
    listDeadlineTasks(),
  ]);
  const editingFC = params.editFC
    ? fixedCommitments.find((c) => c.id === params.editFC)
    : undefined;
  const editingDT = params.editDT
    ? deadlineTasks.find((t) => t.id === params.editDT)
    : undefined;

  return (
    <main className={styles.page}>
      <h1>Semester Commitments</h1>
      <nav className={styles.weekNav}>
        <Link href="/">&larr; Weekly View</Link>
        <a href="/items">Trackable Items</a>
        <a href="/routines">Routines</a>
      </nav>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

      <h2>Fixed Commitments</h2>
      {fixedCommitments.length === 0 ? (
        <p className={styles.empty}>No Fixed Commitments yet.</p>
      ) : (
        <ul className={styles.slotList}>
          {fixedCommitments.map((c) => {
            if (editingFC && editingFC.id === c.id) {
              return (
                <li key={c.id} className={styles.slotItem}>
                  <form action={updateFixedCommitmentAction} className={styles.slotForm}>
                    <input type="hidden" name="id" value={c.id} />
                    <label>
                      Title
                      <input type="text" name="title" defaultValue={c.title} required />
                    </label>
                    <label>
                      Day of week
                      <select name="dayOfWeek" defaultValue={c.dayOfWeek} required>
                        {DAY_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Start
                      <input type="time" name="startTime" defaultValue={c.startTime} required />
                    </label>
                    <label>
                      End
                      <input type="time" name="endTime" defaultValue={c.endTime} required />
                    </label>
                    <button type="submit">Save</button>
                    <a href="/commitments">Cancel</a>
                  </form>
                </li>
              );
            }

            return (
              <li key={c.id} className={styles.slotItem}>
                <span className={styles.slotTime}>{c.title}</span>
                <span className={styles.slotOccupant}>
                  {DAY_OPTIONS[c.dayOfWeek].label} {c.startTime}–{c.endTime}
                </span>
                <a href={`/commitments?editFC=${c.id}`}>Edit</a>
                <form action={deleteFixedCommitmentAction} className={styles.inlineForm}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit">Remove</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
      <section className={styles.addForm}>
        <h3>Add Fixed Commitment</h3>
        <form action={createFixedCommitmentAction} className={styles.slotForm}>
          <label>
            Title
            <input type="text" name="title" required />
          </label>
          <label>
            Day of week
            <select name="dayOfWeek" defaultValue={1} required>
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start
            <input type="time" name="startTime" required />
          </label>
          <label>
            End
            <input type="time" name="endTime" required />
          </label>
          <button type="submit">Add</button>
        </form>
      </section>

      <h2>Deadline Tasks</h2>
      {deadlineTasks.length === 0 ? (
        <p className={styles.empty}>No Deadline Tasks yet.</p>
      ) : (
        <ul className={styles.slotList}>
          {deadlineTasks.map((t) => {
            if (editingDT && editingDT.id === t.id) {
              return (
                <li key={t.id} className={styles.slotItem}>
                  <form action={updateDeadlineTaskAction} className={styles.slotForm}>
                    <input type="hidden" name="id" value={t.id} />
                    <label>
                      Title
                      <input type="text" name="title" defaultValue={t.title} required />
                    </label>
                    <label>
                      Due date
                      <input
                        type="date"
                        name="dueAt"
                        defaultValue={formatDateParam(new Date(t.dueAt))}
                        required
                      />
                    </label>
                    <label>
                      Estimated days
                      <input
                        type="number"
                        name="estimatedDays"
                        defaultValue={t.estimatedDays}
                        required
                      />
                    </label>
                    <button type="submit">Save</button>
                    <a href="/commitments">Cancel</a>
                  </form>
                </li>
              );
            }

            return (
              <li key={t.id} className={styles.slotItem}>
                <span className={styles.slotTime}>{t.title}</span>
                <span className={styles.slotOccupant}>
                  due {formatDateParam(new Date(t.dueAt))} · {t.estimatedDays}d estimated
                </span>
                <a href={`/commitments?editDT=${t.id}`}>Edit</a>
                <form action={deleteDeadlineTaskAction} className={styles.inlineForm}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit">Remove</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
      <section className={styles.addForm}>
        <h3>Add Deadline Task</h3>
        <form action={createDeadlineTaskAction} className={styles.slotForm}>
          <label>
            Title
            <input type="text" name="title" required />
          </label>
          <label>
            Due date
            <input type="date" name="dueAt" required />
          </label>
          <label>
            Estimated days
            <input type="number" name="estimatedDays" required />
          </label>
          <button type="submit">Add</button>
        </form>
      </section>
    </main>
  );
}
