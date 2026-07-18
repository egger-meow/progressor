import Link from "next/link";
import { listRoutines } from "@/server/routines";
import { createRoutineAction, deleteRoutineAction, updateRoutineAction } from "./actions";
import styles from "../page.module.css";

const CADENCES = ["daily", "weekly", "monthly"] as const;
const TIME_OF_DAY = ["", "morning", "afternoon", "evening", "night"] as const;

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const params = await searchParams;
  const routines = await listRoutines();
  const editingRoutine = params.edit ? routines.find((r) => r.id === params.edit) : undefined;

  return (
    <main className={styles.page}>
      <h1>Routines</h1>
      <nav className={styles.weekNav}>
        <Link href="/">&larr; Weekly View</Link>
        <a href="/items">Trackable Items</a>
        <a href="/commitments">Semester Commitments</a>
      </nav>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

      {routines.length === 0 ? (
        <p className={styles.empty}>No Routines yet.</p>
      ) : (
        <ul className={styles.slotList}>
          {routines.map((routine) => {
            if (editingRoutine && editingRoutine.id === routine.id) {
              return (
                <li key={routine.id} className={styles.slotItem}>
                  <form action={updateRoutineAction} className={styles.slotForm}>
                    <input type="hidden" name="id" value={routine.id} />
                    <label>
                      Title
                      <input type="text" name="title" defaultValue={routine.title} required />
                    </label>
                    <label>
                      Category
                      <input
                        type="text"
                        name="category"
                        defaultValue={routine.category}
                        required
                      />
                    </label>
                    <label>
                      Cadence
                      <select name="cadence" defaultValue={routine.cadence} required>
                        {CADENCES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Anchor (comma-separated; weekday 0-6 for weekly, day-of-month
                      1-31 for monthly, blank for daily)
                      <input
                        type="text"
                        name="anchor"
                        defaultValue={routine.anchor?.join(",") ?? ""}
                      />
                    </label>
                    <label>
                      Time-of-day preference
                      <select
                        name="timeOfDayPreference"
                        defaultValue={routine.timeOfDayPreference ?? ""}
                      >
                        {TIME_OF_DAY.map((t) => (
                          <option key={t} value={t}>
                            {t || "(none)"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit">Save</button>
                    <a href="/routines">Cancel</a>
                  </form>
                </li>
              );
            }

            return (
              <li key={routine.id} className={styles.slotItem}>
                <span className={styles.slotTime}>
                  {routine.title} ({routine.category})
                </span>
                <span className={styles.slotOccupant}>
                  {routine.cadence}
                  {routine.anchor ? ` [${routine.anchor.join(",")}]` : ""}
                  {routine.timeOfDayPreference ? ` · ${routine.timeOfDayPreference}` : ""}
                </span>
                <a href={`/routines?edit=${routine.id}`}>Edit</a>
                <form action={deleteRoutineAction} className={styles.inlineForm}>
                  <input type="hidden" name="id" value={routine.id} />
                  <button type="submit">Remove</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <section className={styles.addForm}>
        <h2>Add Routine</h2>
        <form action={createRoutineAction} className={styles.slotForm}>
          <label>
            Title
            <input type="text" name="title" required />
          </label>
          <label>
            Category
            <input type="text" name="category" required />
          </label>
          <label>
            Cadence
            <select name="cadence" defaultValue="daily" required>
              {CADENCES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Anchor (comma-separated; weekday 0-6 for weekly, day-of-month 1-31
            for monthly, blank for daily)
            <input type="text" name="anchor" />
          </label>
          <label>
            Time-of-day preference
            <select name="timeOfDayPreference" defaultValue="">
              {TIME_OF_DAY.map((t) => (
                <option key={t} value={t}>
                  {t || "(none)"}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Add</button>
        </form>
      </section>
    </main>
  );
}
