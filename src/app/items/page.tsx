import Link from "next/link";
import { listTrackableItems } from "@/server/trackable-items";
import {
  createTrackableItemAction,
  deleteTrackableItemAction,
  updateTrackableItemAction,
} from "./actions";
import styles from "../page.module.css";

const STATUSES = ["not-started", "in-progress", "paused", "done"] as const;

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const params = await searchParams;
  const items = await listTrackableItems();
  const editingItem = params.edit ? items.find((i) => i.id === params.edit) : undefined;

  return (
    <main className={styles.page}>
      <h1>Trackable Items — Book / Course</h1>
      <nav className={styles.weekNav}>
        <Link href="/">&larr; Weekly View</Link>
        <a href="/routines">Routines</a>
        <a href="/commitments">Semester Commitments</a>
      </nav>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

      {items.length === 0 ? (
        <p className={styles.empty}>No Trackable Items yet.</p>
      ) : (
        <ul className={styles.slotList}>
          {items.map((item) => {
            if (editingItem && editingItem.id === item.id) {
              return (
                <li key={item.id} className={styles.slotItem}>
                  <form action={updateTrackableItemAction} className={styles.slotForm}>
                    <input type="hidden" name="id" value={item.id} />
                    <label>
                      Title
                      <input type="text" name="title" defaultValue={item.title} required />
                    </label>
                    <label>
                      Priority
                      <input type="number" name="priority" defaultValue={item.priority} required />
                    </label>
                    <label>
                      Unit count
                      <input type="number" name="unitCount" defaultValue={item.unitCount} required />
                    </label>
                    <label>
                      Units completed
                      <input
                        type="number"
                        name="unitsCompleted"
                        defaultValue={item.unitsCompleted}
                        required
                      />
                    </label>
                    <label>
                      Estimated days
                      <input
                        type="number"
                        name="estimatedDays"
                        defaultValue={item.estimatedDays}
                        required
                      />
                    </label>
                    <label>
                      Status
                      <select name="status" defaultValue={item.status} required>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit">Save</button>
                    <a href="/items">Cancel</a>
                  </form>
                </li>
              );
            }

            return (
              <li key={item.id} className={styles.slotItem}>
                <span className={styles.slotTime}>
                  {item.type === "book" ? "Book" : "Course"}: {item.title}
                </span>
                <span className={styles.slotOccupant}>
                  priority {item.priority} · {item.status} · {item.unitsCompleted}/
                  {item.unitCount} units · {item.estimatedDays}d estimated
                </span>
                <a href={`/items?edit=${item.id}`}>Edit</a>
                <form action={deleteTrackableItemAction} className={styles.inlineForm}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit">Remove</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <section className={styles.addForm}>
        <h2>Add Trackable Item</h2>
        <form action={createTrackableItemAction} className={styles.slotForm}>
          <label>
            Title
            <input type="text" name="title" required />
          </label>
          <label>
            Type
            <select name="type" required defaultValue="book">
              <option value="book">Book</option>
              <option value="course">Course</option>
            </select>
          </label>
          <label>
            Priority
            <input type="number" name="priority" defaultValue={1} required />
          </label>
          <label>
            Unit count
            <input type="number" name="unitCount" required />
          </label>
          <label>
            Estimated days
            <input type="number" name="estimatedDays" required />
          </label>
          <label>
            Status
            <select name="status" defaultValue="not-started" required>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
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
