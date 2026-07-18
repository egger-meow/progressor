import { listTimeSlotsWithLabels } from "@/server/time-slots";
import { listRoutines } from "@/server/routines";
import { listFixedCommitments, listDeadlineTasks } from "@/server/semester-commitments";
import { listTrackableItems } from "@/server/trackable-items";
import { listAdHocEvents } from "@/server/ad-hoc-events";
import {
  createTimeSlotAction,
  updateTimeSlotAction,
  deleteTimeSlotAction,
  generateScheduleAction,
} from "./actions";
import {
  DAY_LABELS,
  addDays,
  formatDateLabel,
  formatDateParam,
  formatTimeLabel,
  parseDateParam,
  startOfWeek,
} from "./week";
import styles from "./page.module.css";

interface OccupantOption {
  value: string; // "type|id", or "slack|"
  label: string;
}

async function loadOccupantOptions(): Promise<OccupantOption[]> {
  const [routines, fixedCommitments, deadlineTasks, trackableItems, adHocEvents] =
    await Promise.all([
      listRoutines(),
      listFixedCommitments(),
      listDeadlineTasks(),
      listTrackableItems(),
      listAdHocEvents(),
    ]);

  return [
    { value: "slack|", label: "Slack (leave unassigned)" },
    ...routines.map((r) => ({ value: `routine|${r.id}`, label: `Routine: ${r.title}` })),
    ...fixedCommitments.map((c) => ({
      value: `fixed-commitment|${c.id}`,
      label: `Fixed Commitment: ${c.title}`,
    })),
    ...deadlineTasks.map((t) => ({
      value: `deadline-task|${t.id}`,
      label: `Deadline Task: ${t.title}`,
    })),
    ...trackableItems.map((i) => ({
      value: `trackable-item|${i.id}`,
      label: `${i.type === "book" ? "Book" : "Course"}: ${i.title}`,
    })),
    ...adHocEvents.map((e) => ({
      value: `ad-hoc-event|${e.id}`,
      label: `Ad-hoc Event: ${e.title}`,
    })),
  ];
}

function OccupantSelect({
  options,
  selected,
}: {
  options: OccupantOption[];
  selected?: string;
}) {
  return (
    <select name="occupant" defaultValue={selected ?? "slack|"} required>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default async function WeeklyView({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; edit?: string; error?: string }>;
}) {
  const params = await searchParams;
  const weekStart = startOfWeek(parseDateParam(params.week));
  const weekEnd = addDays(weekStart, 7);
  const weekParam = formatDateParam(weekStart);

  const todayWeekParam = formatDateParam(startOfWeek(new Date()));
  const prevWeekParam = formatDateParam(addDays(weekStart, -7));
  const nextWeekParam = formatDateParam(addDays(weekStart, 7));

  const [slots, occupantOptions] = await Promise.all([
    listTimeSlotsWithLabels({ from: weekStart, to: weekEnd }),
    loadOccupantOptions(),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const editingSlot = params.edit ? slots.find((s) => s.id === params.edit) : undefined;

  return (
    <main className={styles.page}>
      <h1>課表 Weekly View</h1>

      <nav className={styles.weekNav}>
        <a href={`/?week=${prevWeekParam}`}>&larr; 上週</a>
        <a href={`/?week=${todayWeekParam}`}>本週</a>
        <a href={`/?week=${nextWeekParam}`}>下週 &rarr;</a>
        <span className={styles.weekLabel}>
          {formatDateLabel(weekStart)} – {formatDateLabel(addDays(weekStart, 6))}
        </span>
        <form action={generateScheduleAction} className={styles.inlineForm}>
          <input type="hidden" name="week" value={weekParam} />
          <button type="submit">Generate Schedule</button>
        </form>
      </nav>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

      <div className={styles.weekGrid}>
        {days.map((day, index) => {
          const daySlots = slots.filter((slot) => {
            const start = new Date(slot.startAt);
            return (
              start.getFullYear() === day.getFullYear() &&
              start.getMonth() === day.getMonth() &&
              start.getDate() === day.getDate()
            );
          });

          return (
            <section key={index} className={styles.dayColumn}>
              <h2>
                {DAY_LABELS[index]} <span className={styles.dayDate}>{formatDateLabel(day)}</span>
              </h2>
              {daySlots.length === 0 ? (
                <p className={styles.empty}>No Time Slots</p>
              ) : (
                <ul className={styles.slotList}>
                  {daySlots.map((slot) => {
                    if (editingSlot && editingSlot.id === slot.id) {
                      return (
                        <li key={slot.id} className={styles.slotItem}>
                          <form action={updateTimeSlotAction} className={styles.slotForm}>
                            <input type="hidden" name="id" value={slot.id} />
                            <input type="hidden" name="week" value={weekParam} />
                            <input
                              type="date"
                              name="date"
                              defaultValue={formatDateParam(new Date(slot.startAt))}
                              required
                            />
                            <input
                              type="time"
                              name="startTime"
                              defaultValue={formatTimeLabel(new Date(slot.startAt))}
                              required
                            />
                            <input
                              type="time"
                              name="endTime"
                              defaultValue={formatTimeLabel(new Date(slot.endAt))}
                              required
                            />
                            <OccupantSelect
                              options={occupantOptions}
                              selected={`${slot.occupantType}|${slot.occupantId ?? ""}`}
                            />
                            <button type="submit">Save</button>
                            <a href={`/?week=${weekParam}`}>Cancel</a>
                          </form>
                        </li>
                      );
                    }

                    return (
                      <li key={slot.id} className={styles.slotItem}>
                        <span className={styles.slotTime}>
                          {formatTimeLabel(new Date(slot.startAt))}–
                          {formatTimeLabel(new Date(slot.endAt))}
                        </span>
                        <span className={styles.slotOccupant}>{slot.occupantLabel}</span>
                        <a href={`/?week=${weekParam}&edit=${slot.id}`}>Edit</a>
                        <form action={deleteTimeSlotAction} className={styles.inlineForm}>
                          <input type="hidden" name="id" value={slot.id} />
                          <input type="hidden" name="week" value={weekParam} />
                          <button type="submit">Remove</button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className={styles.addForm}>
        <h2>Add Time Slot</h2>
        <form action={createTimeSlotAction} className={styles.slotForm}>
          <input type="hidden" name="week" value={weekParam} />
          <label>
            Date
            <input type="date" name="date" defaultValue={weekParam} required />
          </label>
          <label>
            Start
            <input type="time" name="startTime" required />
          </label>
          <label>
            End
            <input type="time" name="endTime" required />
          </label>
          <label>
            Occupant
            <OccupantSelect options={occupantOptions} />
          </label>
          <button type="submit">Add</button>
        </form>
      </section>
    </main>
  );
}
