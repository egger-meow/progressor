import { listTimeSlotsWithLabels, type TimeSlotWithLabel } from "@/server/time-slots";
import { listRoutines } from "@/server/routines";
import { listFixedCommitments, listDeadlineTasks } from "@/server/semester-commitments";
import { listTrackableItems } from "@/server/trackable-items";
import { listAdHocEvents } from "@/server/ad-hoc-events";
import { DAILY_WINDOW_START, DAILY_WINDOW_END } from "@/scheduler/constants";
import {
  createTimeSlotAction,
  updateTimeSlotAction,
  deleteTimeSlotAction,
  generateScheduleAction,
  skipSessionAction,
  completeItemAction,
  insertAdHocEventAction,
} from "./actions";
import {
  DAY_LABELS,
  addDays,
  buildHourRows,
  formatDateLabel,
  formatDateParam,
  formatHourParam,
  formatTimeLabel,
  parseDateParam,
  parseHour,
  startOfWeek,
} from "./week";
import styles from "./page.module.css";

interface OccupantOption {
  value: string; // "type|id", or "slack|"
  label: string;
}

const WINDOW_START_HOUR = parseHour(DAILY_WINDOW_START);
const WINDOW_END_HOUR = parseHour(DAILY_WINDOW_END);

// Encodes a grid cell's identity into the "add" query param — mirrors the
// existing "?edit=<slotId>" pattern (see WeeklyView) so click-to-create
// needs no client-side JavaScript: the link is just a normal navigation
// that makes this render pass show the inline add form in that one cell.
function cellAddParam(day: Date, hour: number): string {
  return `${formatDateParam(day)}T${String(hour).padStart(2, "0")}`;
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
    { value: "slack|", label: "留白（不指定）" },
    ...routines.map((r) => ({ value: `routine|${r.id}`, label: `常規事件：${r.title}` })),
    ...fixedCommitments.map((c) => ({
      value: `fixed-commitment|${c.id}`,
      label: `固定事務：${c.title}`,
    })),
    ...deadlineTasks.map((t) => ({
      value: `deadline-task|${t.id}`,
      label: `截止任務：${t.title}`,
    })),
    ...trackableItems.map((i) => ({
      value: `trackable-item|${i.id}`,
      label: `${i.type === "book" ? "書籍" : "課程"}：${i.title}`,
    })),
    ...adHocEvents.map((e) => ({
      value: `ad-hoc-event|${e.id}`,
      label: `臨時事件：${e.title}`,
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

function SlotEditForm({
  slot,
  weekParam,
  occupantOptions,
}: {
  slot: TimeSlotWithLabel;
  weekParam: string;
  occupantOptions: OccupantOption[];
}) {
  return (
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
      <div className={styles.slotFormActions}>
        <button type="submit" className={styles.button}>
          儲存
        </button>
        <a href={`/?week=${weekParam}`} className={styles.linkAction}>
          取消
        </a>
      </div>
    </form>
  );
}

function SlotCard({ slot, weekParam }: { slot: TimeSlotWithLabel; weekParam: string }) {
  return (
    <div className={styles.slotItem}>
      <span className={styles.slotTime}>
        {formatTimeLabel(new Date(slot.startAt))}–{formatTimeLabel(new Date(slot.endAt))}
      </span>
      <span className={styles.slotOccupant}>{slot.occupantLabel}</span>
      <span className={styles.slotActions}>
        <a href={`/?week=${weekParam}&edit=${slot.id}`} className={styles.linkAction}>
          編輯
        </a>
        <form action={deleteTimeSlotAction} className={styles.inlineForm}>
          <input type="hidden" name="id" value={slot.id} />
          <input type="hidden" name="week" value={weekParam} />
          <button type="submit" className={styles.buttonDanger}>
            移除
          </button>
        </form>
        {slot.occupantType === "trackable-item" && slot.occupantId ? (
          <>
            <form action={skipSessionAction} className={styles.inlineForm}>
              <input type="hidden" name="slotId" value={slot.id} />
              <input type="hidden" name="week" value={weekParam} />
              <button type="submit" className={styles.buttonSecondary}>
                跳過
              </button>
            </form>
            <form action={completeItemAction} className={styles.inlineForm}>
              <input type="hidden" name="itemId" value={slot.occupantId} />
              <input type="hidden" name="week" value={weekParam} />
              <button type="submit" className={styles.buttonAccent}>
                標記完成
              </button>
            </form>
          </>
        ) : null}
      </span>
    </div>
  );
}

// Inline click-to-create form for one empty hour cell — pre-filled with
// that cell's day/hour, reusing createTimeSlotAction directly (same
// fields as the bottom "新增時段" form) so no new Server Action is needed.
function InlineAddForm({
  day,
  hour,
  weekParam,
  occupantOptions,
}: {
  day: Date;
  hour: number;
  weekParam: string;
  occupantOptions: OccupantOption[];
}) {
  const dateParam = formatDateParam(day);
  const endHour = Math.min(hour + 1, 24);
  return (
    <form action={createTimeSlotAction} className={styles.slotForm}>
      <input type="hidden" name="week" value={weekParam} />
      <input type="hidden" name="date" value={dateParam} />
      <input
        type="time"
        name="startTime"
        defaultValue={formatHourParam(hour)}
        required
      />
      <input
        type="time"
        name="endTime"
        defaultValue={endHour === 24 ? "23:59" : formatHourParam(endHour)}
        required
      />
      <OccupantSelect options={occupantOptions} />
      <div className={styles.slotFormActions}>
        <button type="submit" className={styles.button}>
          新增
        </button>
        <a href={`/?week=${weekParam}`} className={styles.linkAction}>
          取消
        </a>
      </div>
    </form>
  );
}

export default async function WeeklyView({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; edit?: string; add?: string; error?: string }>;
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
      <div className={styles.pageHeader}>
        <h1>每週課表</h1>
        <p className={styles.pageSubtitle}>持續更新、可隨時手動調整的每週時間表。</p>
      </div>

      <nav className={styles.weekNav}>
        <a href={`/?week=${prevWeekParam}`} className={styles.navLink}>
          &larr; 上週
        </a>
        <a href={`/?week=${todayWeekParam}`} className={styles.navLink}>
          本週
        </a>
        <a href={`/?week=${nextWeekParam}`} className={styles.navLink}>
          下週 &rarr;
        </a>
        <span className={styles.weekLabel}>
          {formatDateLabel(weekStart)} – {formatDateLabel(addDays(weekStart, 6))}
        </span>
        <form action={generateScheduleAction} className={styles.inlineForm}>
          <input type="hidden" name="week" value={weekParam} />
          <button type="submit" className={styles.button}>
            產生課表
          </button>
        </form>
      </nav>

      <nav className={styles.weekNav}>
        <a href="/items" className={styles.navLink}>
          書籍與課程
        </a>
        <a href="/routines" className={styles.navLink}>
          常規事件
        </a>
        <a href="/commitments" className={styles.navLink}>
          學期事務
        </a>
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

          const extraHours = daySlots.map((slot) => new Date(slot.startAt).getHours());
          const hourRows = buildHourRows(day, WINDOW_START_HOUR, WINDOW_END_HOUR, extraHours);

          return (
            <section key={index} className={styles.dayColumn}>
              <h2>
                {DAY_LABELS[index]} <span className={styles.dayDate}>{formatDateLabel(day)}</span>
              </h2>
              <ul className={styles.hourGrid}>
                {hourRows.map((row) => {
                  const startingSlots = daySlots.filter((slot) => {
                    const start = new Date(slot.startAt);
                    return start >= row.rowStart && start < row.rowEnd;
                  });
                  const isContinuation =
                    startingSlots.length === 0 &&
                    daySlots.some((slot) => {
                      const start = new Date(slot.startAt);
                      const end = new Date(slot.endAt);
                      return start < row.rowStart && end > row.rowStart;
                    });
                  const addParam = cellAddParam(day, row.hour);
                  const isAddingHere = params.add === addParam;

                  return (
                    <li key={row.hour} className={styles.hourRow}>
                      <span className={styles.hourLabel}>{formatHourParam(row.hour)}</span>
                      <div className={styles.hourContent}>
                        {startingSlots.length > 0
                          ? startingSlots.map((slot) =>
                              editingSlot && editingSlot.id === slot.id ? (
                                <SlotEditForm
                                  key={slot.id}
                                  slot={slot}
                                  weekParam={weekParam}
                                  occupantOptions={occupantOptions}
                                />
                              ) : (
                                <SlotCard key={slot.id} slot={slot} weekParam={weekParam} />
                              ),
                            )
                          : isContinuation
                            ? <span className={styles.hourContinuation} aria-hidden="true" />
                            : isAddingHere
                              ? (
                                  <InlineAddForm
                                    day={day}
                                    hour={row.hour}
                                    weekParam={weekParam}
                                    occupantOptions={occupantOptions}
                                  />
                                )
                              : (
                                  <a
                                    href={`/?week=${weekParam}&add=${addParam}`}
                                    className={styles.hourAddButton}
                                    aria-label={`在 ${formatHourParam(row.hour)} 新增時段`}
                                  >
                                    ＋
                                  </a>
                                )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <section className={styles.addForm}>
        <h2>新增時段</h2>
        <form action={createTimeSlotAction} className={styles.slotForm}>
          <input type="hidden" name="week" value={weekParam} />
          <label>
            日期
            <input type="date" name="date" defaultValue={weekParam} required />
          </label>
          <label>
            開始
            <input type="time" name="startTime" required />
          </label>
          <label>
            結束
            <input type="time" name="endTime" required />
          </label>
          <label>
            內容
            <OccupantSelect options={occupantOptions} />
          </label>
          <button type="submit" className={styles.button}>
            新增
          </button>
        </form>
      </section>

      <section className={styles.addForm}>
        <h2>快速新增臨時事件</h2>
        <p className={styles.hint}>
          立即建立一個臨時事件並直接排入課表——若與某本書/課程的彈性時段重疊，
          該時段會被移到本週其他空檔，而不是被覆蓋（Phase 3 局部修正，不是整份重新產生）。
        </p>
        <form action={insertAdHocEventAction} className={styles.slotForm}>
          <input type="hidden" name="week" value={weekParam} />
          <label>
            標題
            <input type="text" name="title" required />
          </label>
          <label>
            日期
            <input type="date" name="date" defaultValue={weekParam} required />
          </label>
          <label>
            開始
            <input type="time" name="startTime" required />
          </label>
          <label>
            結束
            <input type="time" name="endTime" required />
          </label>
          <button type="submit" className={styles.button}>
            加入
          </button>
        </form>
      </section>
    </main>
  );
}
