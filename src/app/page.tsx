import { Fragment } from "react";
import { listTimeSlotsWithLabels, type TimeSlotWithLabel } from "@/server/time-slots";
import { listRoutines } from "@/server/routines";
import { listFixedCommitments, listDeadlineTasks } from "@/server/semester-commitments";
import { listTrackableItems } from "@/server/trackable-items";
import { listAdHocEvents } from "@/server/ad-hoc-events";
import { getSemester } from "@/server/semester";
import { DAILY_WINDOW_START, DAILY_WINDOW_END } from "@/scheduler/constants";
import { TimePicker } from "./time-picker";
import { DatePicker } from "./date-picker";
import { OccupantPicker, type OccupantOption } from "./occupant-picker";
import { HourCellOverlay } from "./hour-cell-overlay";
import { DisplayOptionsControl, WEEKLY_VIEW_ID } from "./display-options";
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
  semesterWeekIndex,
  startOfWeek,
} from "./week";
import styles from "./page.module.css";

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
    { value: "slack|", group: "", title: "留白（不指定）" },
    ...routines.map((r) => ({ value: `routine|${r.id}`, group: "常規事件", title: r.title })),
    ...fixedCommitments.map((c) => ({
      value: `fixed-commitment|${c.id}`,
      group: "固定事務",
      title: c.title,
    })),
    ...deadlineTasks.map((t) => ({
      value: `deadline-task|${t.id}`,
      group: "截止任務",
      title: t.title,
    })),
    ...trackableItems.map((i) => ({
      value: `trackable-item|${i.id}`,
      group: i.type === "book" ? "書籍" : "課程",
      title: i.title,
    })),
    ...adHocEvents.map((e) => ({
      value: `ad-hoc-event|${e.id}`,
      group: "臨時事件",
      title: e.title,
    })),
  ];
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
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
    <div className={styles.addForm}>
      <form action={updateTimeSlotAction} className={styles.slotForm}>
        <input type="hidden" name="id" value={slot.id} />
        <input type="hidden" name="week" value={weekParam} />
        {slot.occupantKind ? (
          <span className={`${styles.badge} ${styles.slotFormKindBadge}`}>
            {slot.occupantKind}
          </span>
        ) : null}
        <label>
          日期
          <DatePicker name="date" defaultValue={formatDateParam(new Date(slot.startAt))} />
        </label>
        <label>
          開始
          <TimePicker name="startTime" defaultValue={formatTimeLabel(new Date(slot.startAt))} />
        </label>
        <label>
          結束
          <TimePicker name="endTime" defaultValue={formatTimeLabel(new Date(slot.endAt))} />
        </label>
        <label>
          內容
          <OccupantPicker
            name="occupant"
            options={occupantOptions}
            defaultValue={`${slot.occupantType}|${slot.occupantId ?? ""}`}
          />
        </label>
        <div className={styles.slotFormActions}>
          <button type="submit" className={styles.button}>
            儲存
          </button>
          <a href={`/?week=${weekParam}`} className={styles.linkAction}>
            取消
          </a>
        </div>
      </form>
    </div>
  );
}

// A single card that visually spans every hour it covers (see the
// day-column render loop's `gridRow: span N`) — a real timetable block
// instead of a stack of per-hour boxes. Kept deliberately compact: only
// the time + what's in it are always visible; editing happens by clicking
// the card itself (opens the same floating edit panel as before), and
// 移除 is a small icon button instead of a full text row — project owner,
// 2026-07-21: "固定事務：資料探勘 / 編輯 / 移除" stacked as three separate
// lines was needless clutter for something that should read at a glance.
function SlotCard({ slot, weekParam }: { slot: TimeSlotWithLabel; weekParam: string }) {
  const isTrackable = slot.occupantType === "trackable-item" && slot.occupantId;
  return (
    <div className={styles.slotItem}>
      <a
        href={`/?week=${weekParam}&edit=${slot.id}`}
        className={styles.slotItemMain}
        aria-label={`編輯：${slot.occupantLabel}`}
      >
        {slot.occupantKind ? (
          <span className={styles.slotKindChip}>{slot.occupantKind}</span>
        ) : null}
        <span className={styles.slotTime}>
          {formatTimeLabel(new Date(slot.startAt))}–{formatTimeLabel(new Date(slot.endAt))}
        </span>
        <span className={styles.slotOccupant}>{slot.occupantLabel}</span>
        {slot.occupantTags.length > 0 ? (
          <span className={styles.slotTags}>
            {slot.occupantTags.map((tag) => (
              <span key={tag} className={styles.slotTagChip}>
                {tag}
              </span>
            ))}
          </span>
        ) : null}
      </a>
      <form action={deleteTimeSlotAction} className={styles.slotDeleteForm}>
        <input type="hidden" name="id" value={slot.id} />
        <input type="hidden" name="week" value={weekParam} />
        <button type="submit" className={styles.slotDeleteButton} aria-label="移除" title="移除">
          <TrashIcon />
        </button>
      </form>
      {isTrackable && slot.occupantId ? (
        <div className={styles.slotExtraActions}>
          <form action={skipSessionAction} className={styles.inlineForm}>
            <input type="hidden" name="slotId" value={slot.id} />
            <input type="hidden" name="week" value={weekParam} />
            <button type="submit" className={styles.slotChipButton}>
              跳過
            </button>
          </form>
          <form action={completeItemAction} className={styles.inlineForm}>
            <input type="hidden" name="itemId" value={slot.occupantId} />
            <input type="hidden" name="week" value={weekParam} />
            <button type="submit" className={styles.slotChipButtonAccent}>
              標記完成
            </button>
          </form>
        </div>
      ) : null}
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
    <div className={styles.addForm}>
      <form action={createTimeSlotAction} className={styles.slotForm}>
        <input type="hidden" name="week" value={weekParam} />
        <input type="hidden" name="date" value={dateParam} />
        <label>
          開始
          <TimePicker name="startTime" defaultValue={formatHourParam(hour)} />
        </label>
        <label>
          結束
          <TimePicker
            name="endTime"
            defaultValue={endHour === 24 ? "23:59" : formatHourParam(endHour)}
          />
        </label>
        <label>
          內容
          <OccupantPicker name="occupant" options={occupantOptions} />
        </label>
        <div className={styles.slotFormActions}>
          <button type="submit" className={styles.button}>
            新增
          </button>
          <a href={`/?week=${weekParam}`} className={styles.linkAction}>
            取消
          </a>
        </div>
      </form>
    </div>
  );
}

// One-click "merge this empty hour into an adjacent Time Slot" action —
// same occupant, one boundary (start or end) moved to swallow the hour,
// via the existing updateTimeSlotAction (no new Server Action). Offered
// only on the rare cell that's genuinely adjacent to an existing slot's
// exact boundary — project owner, 2026-07-21: "接續前一個/接續後一個" for
// wanting a session longer than one hour without retyping its start time.
function ExtendSlotButton({
  slot,
  weekParam,
  startTime,
  endTime,
  label,
}: {
  slot: TimeSlotWithLabel;
  weekParam: string;
  startTime: string;
  endTime: string;
  label: string;
}) {
  return (
    <form action={updateTimeSlotAction} className={styles.inlineForm}>
      <input type="hidden" name="id" value={slot.id} />
      <input type="hidden" name="week" value={weekParam} />
      <input type="hidden" name="date" value={formatDateParam(new Date(slot.startAt))} />
      <input type="hidden" name="startTime" value={startTime} />
      <input type="hidden" name="endTime" value={endTime} />
      <input
        type="hidden"
        name="occupant"
        value={`${slot.occupantType}|${slot.occupantId ?? ""}`}
      />
      <button type="submit" className={styles.hourExtendButton}>
        {label}
      </button>
    </form>
  );
}

export default async function WeeklyView({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    edit?: string;
    add?: string;
    quickEvent?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const weekStart = startOfWeek(parseDateParam(params.week));
  const weekEnd = addDays(weekStart, 7);
  const weekParam = formatDateParam(weekStart);

  const todayWeekParam = formatDateParam(startOfWeek(new Date()));
  const prevWeekParam = formatDateParam(addDays(weekStart, -7));
  const nextWeekParam = formatDateParam(addDays(weekStart, 7));

  const [slots, occupantOptions, semester, deadlineTasks] = await Promise.all([
    listTimeSlotsWithLabels({ from: weekStart, to: weekEnd }),
    loadOccupantOptions(),
    getSemester(),
    listDeadlineTasks(),
  ]);
  const weekIndex = semesterWeekIndex(weekStart, semester);

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
        {weekIndex !== null ? (
          <span className={styles.badgeAccent}>第 {weekIndex} 週</span>
        ) : null}
        <form action={generateScheduleAction} className={styles.inlineForm}>
          <input type="hidden" name="week" value={weekParam} />
          <button type="submit" className={styles.button}>
            產生課表
          </button>
        </form>
        <a
          href={
            params.quickEvent
              ? `/?week=${weekParam}`
              : `/?week=${weekParam}&quickEvent=1`
          }
          className={params.quickEvent ? styles.navLinkActive : styles.navLink}
        >
          {params.quickEvent ? "取消快速新增" : "快速新增臨時事件"}
        </a>
      </nav>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

      <DisplayOptionsControl />

      <div className={styles.weekGrid} id={WEEKLY_VIEW_ID}>
        {days.map((day, index) => {
          const daySlots = slots.filter((slot) => {
            const start = new Date(slot.startAt);
            return (
              start.getFullYear() === day.getFullYear() &&
              start.getMonth() === day.getMonth() &&
              start.getDate() === day.getDate()
            );
          });

          // Deadline Tasks due on this calendar day — surfaced as a red
          // banner above the day header (project owner, 2026-07-21: "If a
          // day have a deadline event, the event would show above the
          // day...to highlight that day is a deadline, maybe with red").
          const dayDeadlines = deadlineTasks.filter((task) => {
            const due = new Date(task.dueAt);
            return (
              due.getFullYear() === day.getFullYear() &&
              due.getMonth() === day.getMonth() &&
              due.getDate() === day.getDate()
            );
          });

          const extraHours = daySlots.map((slot) => new Date(slot.startAt).getHours());
          const hourRows = buildHourRows(day, WINDOW_START_HOUR, WINDOW_END_HOUR, extraHours);

          // Where each Time Slot starts (as a row index into hourRows) and how
          // many rows it spans — lets the card below render once with
          // `gridRow: "<start> / span <n>"` so a multi-hour event is one
          // continuous block crossing cell boundaries, the way a real 課表
          // reads, instead of a start-hour card followed by separately
          // colored "continuation" rows underneath it (project owner,
          // 2026-07-21: "接續 layout look like this... the event should
          // cross the blocks").
          const placements = daySlots.flatMap((slot) => {
            const start = new Date(slot.startAt);
            const end = new Date(slot.endAt);
            const startRowIndex = hourRows.findIndex((r) => start >= r.rowStart && start < r.rowEnd);
            if (startRowIndex === -1) {
              return [];
            }
            let endRowIndex = startRowIndex;
            for (let j = startRowIndex; j < hourRows.length; j++) {
              if (hourRows[j].rowStart < end) {
                endRowIndex = j;
              } else {
                break;
              }
            }
            return [{ slot, startRowIndex, span: endRowIndex - startRowIndex + 1 }];
          });

          const continuationRows = new Set<number>();
          for (const placement of placements) {
            for (let j = placement.startRowIndex + 1; j < placement.startRowIndex + placement.span; j++) {
              continuationRows.add(j);
            }
          }

          return (
            <section
              key={index}
              className={
                dayDeadlines.length > 0
                  ? `${styles.dayColumn} ${styles.dayColumnDeadline}`
                  : styles.dayColumn
              }
            >
              {dayDeadlines.length > 0 ? (
                <div className={styles.deadlineBanner}>
                  {dayDeadlines.map((task) => (
                    <span key={task.id} className={styles.deadlineBannerItem}>
                      截止：{task.title}
                    </span>
                  ))}
                </div>
              ) : null}
              <h2>
                {DAY_LABELS[index]} <span className={styles.dayDate}>{formatDateLabel(day)}</span>
              </h2>
              <div className={styles.hourGrid}>
                {hourRows.map((row, rowIndex) => {
                  const placementsHere = placements.filter((p) => p.startRowIndex === rowIndex);
                  const isContinuation = continuationRows.has(rowIndex);
                  const addParam = cellAddParam(day, row.hour);
                  const isAddingHere = params.add === addParam;

                  const prevAdjacentSlot = isContinuation
                    ? undefined
                    : daySlots.find(
                        (slot) => new Date(slot.endAt).getTime() === row.rowStart.getTime(),
                      );
                  const nextAdjacentSlot = isContinuation
                    ? undefined
                    : daySlots.find(
                        (slot) => new Date(slot.startAt).getTime() === row.rowEnd.getTime(),
                      );

                  const editingSlotHere = placementsHere.find(
                    (p) => editingSlot && p.slot.id === editingSlot.id,
                  )?.slot;

                  const compactContent =
                    placementsHere.length > 0 ? (
                      placementsHere.map((p) => (
                        <SlotCard key={p.slot.id} slot={p.slot} weekParam={weekParam} />
                      ))
                    ) : (
                      <div className={styles.hourEmptyActions}>
                        <a
                          href={`/?week=${weekParam}&add=${addParam}`}
                          className={styles.hourAddButton}
                          aria-label={`在 ${formatHourParam(row.hour)} 新增時段`}
                        >
                          ＋
                        </a>
                        {prevAdjacentSlot ? (
                          <ExtendSlotButton
                            slot={prevAdjacentSlot}
                            weekParam={weekParam}
                            startTime={formatTimeLabel(new Date(prevAdjacentSlot.startAt))}
                            endTime={formatTimeLabel(row.rowEnd)}
                            label="↑ 接續前一個"
                          />
                        ) : null}
                        {nextAdjacentSlot ? (
                          <ExtendSlotButton
                            slot={nextAdjacentSlot}
                            weekParam={weekParam}
                            startTime={formatTimeLabel(row.rowStart)}
                            endTime={formatTimeLabel(new Date(nextAdjacentSlot.endAt))}
                            label="接續後一個 ↓"
                          />
                        ) : null}
                      </div>
                    );

                  const overlayContent = editingSlotHere ? (
                    <SlotEditForm
                      slot={editingSlotHere}
                      weekParam={weekParam}
                      occupantOptions={occupantOptions}
                    />
                  ) : isAddingHere ? (
                    <InlineAddForm
                      day={day}
                      hour={row.hour}
                      weekParam={weekParam}
                      occupantOptions={occupantOptions}
                    />
                  ) : undefined;

                  const span = placementsHere[0]?.span ?? 1;

                  return (
                    <Fragment key={row.hour}>
                      <span
                        className={styles.hourLabel}
                        style={{ gridRow: rowIndex + 1, borderTop: rowIndex === 0 ? "none" : undefined }}
                      >
                        {formatHourParam(row.hour)}
                      </span>
                      {isContinuation ? null : (
                        <HourCellOverlay
                          overlay={overlayContent}
                          className={styles.hourContent}
                          style={{ gridRow: `${rowIndex + 1} / span ${span}` }}
                        >
                          {compactContent}
                        </HourCellOverlay>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {params.quickEvent ? (
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
              <DatePicker name="date" defaultValue={weekParam} />
            </label>
            <label>
              開始
              <TimePicker name="startTime" />
            </label>
            <label>
              結束
              <TimePicker name="endTime" defaultValue="10:00" />
            </label>
            <div className={styles.slotFormActions}>
              <button type="submit" className={styles.button}>
                加入
              </button>
              <a href={`/?week=${weekParam}`} className={styles.linkAction}>
                取消
              </a>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  );
}
