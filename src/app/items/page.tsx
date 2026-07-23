import { listTrackableItems, getWipLimit } from "@/server/trackable-items";
import { getCategoryItemSchedule } from "@/server/category-item-schedules";
import {
  createTrackableItemAction,
  updateTrackableItemAction,
  setWipLimitsAction,
  setCategoryItemScheduleAction,
  removeCategoryItemScheduleAction,
} from "./actions";
import { PriorityList } from "./priority-list";
import { formatTagsInput } from "../tag-utils";
import { formatUnitWeightOverridesInput } from "../unit-weight-utils";
import { DatePicker } from "../date-picker";
import { TimePicker } from "../time-picker";
import { formatDateParam } from "../week";
import styles from "../page.module.css";

const STATUSES = [
  { value: "not-started", label: "尚未開始" },
  { value: "in-progress", label: "進行中" },
  { value: "paused", label: "暫停" },
  { value: "done", label: "已完成" },
] as const;

const CADENCES = [
  { value: "daily", label: "每日" },
  { value: "weekly", label: "每週" },
  { value: "monthly", label: "每月" },
] as const;

const TIME_OF_DAY = [
  { value: "morning", label: "早上" },
  { value: "afternoon", label: "下午" },
  { value: "evening", label: "傍晚" },
  { value: "night", label: "晚上" },
] as const;

const CADENCE_LABELS: Record<string, string> = { daily: "每日", weekly: "每週", monthly: "每月" };
const TIME_OF_DAY_LABELS: Record<string, string> = {
  morning: "早上",
  afternoon: "下午",
  evening: "傍晚",
  night: "晚上",
};

const CATEGORY_TYPE_LABELS: Record<"book" | "course", string> = { book: "書籍", course: "課程" };

// One form per Trackable Item type ("book"/"course") — same cadence/anchor/
// timeOfDayPreferences/preferredStartTime/durationMinutes fields as a
// Routine's form (src/app/routines/page.tsx), since CategoryItemSchedule
// shares that exact vocabulary (src/server/cadence.ts). Deliberately shipped
// only now that the Scheduler already consumes it (category-placement.ts)
// — see CHANGELOG.md's note on the DeadlineTask.estimatedDays dead-field
// mistake this session found and fixed once already.
function CategoryScheduleForm({
  type,
  schedule,
}: {
  type: "book" | "course";
  schedule: {
    cadence: string;
    anchor: number[] | null;
    timeOfDayPreferences: string[];
    preferredStartTime: string | null;
    durationMinutes: number;
  } | null;
}) {
  return (
    <div className={styles.paddedCard}>
      <h4>{CATEGORY_TYPE_LABELS[type]}</h4>
      {schedule ? (
        <p className={styles.hint}>
          目前：{CADENCE_LABELS[schedule.cadence] ?? schedule.cadence}
          {schedule.anchor ? `［${schedule.anchor.join(",")}］` : ""}
          {schedule.preferredStartTime
            ? ` · 指定 ${schedule.preferredStartTime}`
            : schedule.timeOfDayPreferences.length > 0
              ? ` · ${schedule.timeOfDayPreferences
                  .map((t) => TIME_OF_DAY_LABELS[t] ?? t)
                  .join("、")}`
              : ""}
          {` · ${schedule.durationMinutes} 分鐘`} —
          期間所有進行中的{CATEGORY_TYPE_LABELS[type]}會共用同一個時段，不會分開排。
        </p>
      ) : (
        <p className={styles.hint}>
          尚未設定固定排程——{CATEGORY_TYPE_LABELS[type]}仍依優先度個別找空檔（每項每週一場）。
        </p>
      )}
      <form action={setCategoryItemScheduleAction} className={styles.slotForm}>
        <input type="hidden" name="type" value={type} />
        <label>
          頻率
          <select name="cadence" defaultValue={schedule?.cadence ?? "daily"} required>
            {CADENCES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          指定日（以逗號分隔；每週用星期 0-6，每月用日期 1-31，每日則留空）
          <input type="text" name="anchor" defaultValue={schedule?.anchor?.join(",") ?? ""} />
        </label>
        <div className={styles.checkboxGroupField}>
          時段偏好（可複選；相鄰時段會合併成連續區間）
          <div className={styles.checkboxGroup}>
            {TIME_OF_DAY.map((t) => (
              <label key={t.value} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="timeOfDayPreference"
                  value={t.value}
                  defaultChecked={schedule?.timeOfDayPreferences.includes(t.value) ?? false}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>
        <label>
          時間長度（分鐘）
          <input
            type="number"
            name="durationMinutes"
            min={5}
            max={720}
            step={5}
            defaultValue={schedule?.durationMinutes ?? 120}
            required
          />
        </label>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="useExactTime"
            defaultChecked={schedule?.preferredStartTime !== null && schedule?.preferredStartTime !== undefined}
          />
          使用指定時間（優先於時段偏好）
        </label>
        <label>
          指定時間
          <TimePicker name="preferredStartTime" defaultValue={schedule?.preferredStartTime ?? "09:00"} />
        </label>
        <button type="submit" className={styles.button}>
          儲存排程
        </button>
      </form>
      {schedule ? (
        <form action={removeCategoryItemScheduleAction} className={styles.inlineForm}>
          <input type="hidden" name="type" value={type} />
          <button type="submit" className={styles.buttonDanger}>
            移除排程（恢復個別找空檔）
          </button>
        </form>
      ) : null}
    </div>
  );
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const params = await searchParams;
  const [items, bookLimit, courseLimit, bookSchedule, courseSchedule] = await Promise.all([
    listTrackableItems(),
    getWipLimit("book"),
    getWipLimit("course"),
    getCategoryItemSchedule("book"),
    getCategoryItemSchedule("course"),
  ]);
  const categorySchedules = { book: bookSchedule, course: courseSchedule } as const;
  const editingItem = params.edit ? items.find((i) => i.id === params.edit) : undefined;
  const inProgressCount = (type: "book" | "course") =>
    items.filter((i) => i.type === type && i.status === "in-progress").length;

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>書籍與課程</h1>
        <p className={styles.pageSubtitle}>
          新增後直接拖曳排序優先度 — 放開就會立即重新排程本週課表。
        </p>
      </div>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

      <section className={styles.addForm}>
        <h3>固定排程（選填）</h3>
        <p className={styles.hint}>
          設定後，該類型會像常規事件一樣固定在某個頻率／時段出現，所有進行中的項目共用同一個時段
          （見每週課表的合併卡片）；未設定則維持個別找空檔的舊行為。
        </p>
        <CategoryScheduleForm type="book" schedule={categorySchedules.book} />
        <CategoryScheduleForm type="course" schedule={categorySchedules.course} />
      </section>

      <section className={styles.addForm}>
        <h3>同時進行上限</h3>
        <p className={styles.hint}>
          最多同時「進行中」幾本書／幾門課——目前書籍 {inProgressCount("book")}/{bookLimit}
          進行中，課程 {inProgressCount("course")}/{courseLimit} 進行中。達到上限後，新項目只能先設為「尚未開始」，等目前進行中的完成或暫停後再開始。
        </p>
        <form action={setWipLimitsAction} className={styles.slotForm}>
          <label>
            書籍上限
            <input type="number" name="bookLimit" defaultValue={bookLimit} min={0} required />
          </label>
          <label>
            課程上限
            <input type="number" name="courseLimit" defaultValue={courseLimit} min={0} required />
          </label>
          <button type="submit" className={styles.button}>
            儲存上限
          </button>
        </form>
      </section>

      {editingItem ? (
        <section className={styles.addForm}>
          <h2>編輯「{editingItem.title}」</h2>
          <form action={updateTrackableItemAction} className={styles.slotForm}>
            <input type="hidden" name="id" value={editingItem.id} />
            <label>
              標題
              <input type="text" name="title" defaultValue={editingItem.title} required />
            </label>
            <label>
              單元總數
              <input type="number" name="unitCount" defaultValue={editingItem.unitCount} required />
            </label>
            <label>
              已完成單元
              <input
                type="number"
                name="unitsCompleted"
                defaultValue={editingItem.unitsCompleted}
                required
              />
            </label>
            <label>
              預估天數（完成剩餘進度所需天數，不含已完成部分）
              <input
                type="number"
                name="estimatedDays"
                defaultValue={editingItem.estimatedDays}
                required
              />
            </label>
            <label>
              平均每單元倍率（未特別設定的單元都用這個，例如章節普遍偏長填 1.5）
              <input
                type="number"
                name="unitWeightMultiplier"
                defaultValue={editingItem.unitWeightMultiplier}
                min={0.1}
                step={0.1}
                required
              />
            </label>
            <label>
              個別單元倍率覆蓋（選填；格式：單元:倍率，用逗號分隔，例如 8:2.5, 15:1.8——只有不尋常的單元才需要填）
              <input
                type="text"
                name="unitWeightOverrides"
                defaultValue={formatUnitWeightOverridesInput(editingItem.unitWeightOverrides)}
                placeholder="例如：8:2.5, 15:1.8"
              />
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="setTargetDate"
                defaultChecked={editingItem.targetDate !== null}
              />
              設定目標完成日期
            </label>
            <label>
              目標完成日期（可選；已在讀的話用「剩餘天數」通常更準；還沒開始想抓保守日期的話可以改填這裡）
              <DatePicker
                name="targetDate"
                defaultValue={
                  editingItem.targetDate ? formatDateParam(new Date(editingItem.targetDate)) : undefined
                }
              />
            </label>
            <label>
              狀態
              <select name="status" defaultValue={editingItem.status} required>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              標籤（用逗號分隔）
              <input
                type="text"
                name="tags"
                defaultValue={formatTagsInput(editingItem.tags)}
                placeholder="例如：trader, 學校課"
              />
            </label>
            <div className={styles.slotFormActions}>
              <button type="submit" className={styles.button}>
                儲存
              </button>
              <a href="/items" className={styles.linkAction}>
                取消
              </a>
            </div>
          </form>
        </section>
      ) : null}

      <PriorityList
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type as "book" | "course",
          status: item.status,
          unitsCompleted: item.unitsCompleted,
          unitCount: item.unitCount,
          estimatedDays: item.estimatedDays,
          unitWeightMultiplier: item.unitWeightMultiplier,
          targetDate: item.targetDate,
          tags: item.tags,
        }))}
      />

      <section className={styles.addForm}>
        <h2>新增書籍或課程</h2>
        <form action={createTrackableItemAction} className={styles.slotForm}>
          <label>
            標題
            <input type="text" name="title" required />
          </label>
          <label>
            類型
            <select name="type" required defaultValue="book">
              <option value="book">書籍</option>
              <option value="course">課程</option>
            </select>
          </label>
          <label>
            單元總數
            <input type="number" name="unitCount" required />
          </label>
          <label>
            已完成單元（若已開始閱讀／上課，填入目前進度到第幾章／第幾支影片）
            <input type="number" name="unitsCompleted" defaultValue={0} min={0} />
          </label>
          <label>
            預估天數（完成剩餘進度所需天數，不含已完成部分）
            <input type="number" name="estimatedDays" required />
          </label>
          <label>
            平均每單元倍率（未特別設定的單元都用這個，例如章節普遍偏長填 1.5）
            <input type="number" name="unitWeightMultiplier" defaultValue={1.0} min={0.1} step={0.1} required />
          </label>
          <label>
            個別單元倍率覆蓋（選填；格式：單元:倍率，用逗號分隔，例如 8:2.5, 15:1.8——只有不尋常的單元才需要填）
            <input type="text" name="unitWeightOverrides" placeholder="例如：8:2.5, 15:1.8" />
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" name="setTargetDate" />
            設定目標完成日期
          </label>
          <label>
            目標完成日期（可選；已在讀的話用「剩餘天數」通常更準；還沒開始想抓保守日期的話可以改填這裡）
            <DatePicker name="targetDate" />
          </label>
          <label>
            狀態
            <select name="status" defaultValue="not-started" required>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            標籤（用逗號分隔）
            <input type="text" name="tags" placeholder="例如：trader, 學校課" />
          </label>
          <button type="submit" className={styles.button}>
            新增
          </button>
        </form>
      </section>
    </main>
  );
}
