import { listRoutines } from "@/server/routines";
import { createRoutineAction, deleteRoutineAction, updateRoutineAction } from "./actions";
import { TimePicker } from "../time-picker";
import { formatTagsInput } from "../tag-utils";
import styles from "../page.module.css";

const CADENCES = [
  { value: "daily", label: "每日" },
  { value: "weekly", label: "每週" },
  { value: "monthly", label: "每月" },
] as const;

const TIME_OF_DAY = [
  { value: "", label: "（無偏好）" },
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
      <div className={styles.pageHeader}>
        <h1>常規事件</h1>
        <p className={styles.pageSubtitle}>健身、家教等每日／每週／每月重複的行程。</p>
      </div>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

      {routines.length === 0 ? (
        <p className={styles.empty}>尚未新增任何常規事件。</p>
      ) : (
        <ul className={styles.recordList}>
          {routines.map((routine) => {
            if (editingRoutine && editingRoutine.id === routine.id) {
              return (
                <li key={routine.id} className={styles.addForm}>
                  <form action={updateRoutineAction} className={styles.slotForm}>
                    <input type="hidden" name="id" value={routine.id} />
                    <label>
                      標題
                      <input type="text" name="title" defaultValue={routine.title} required />
                    </label>
                    <label>
                      類別
                      <input
                        type="text"
                        name="category"
                        defaultValue={routine.category}
                        required
                      />
                    </label>
                    <label>
                      頻率
                      <select name="cadence" defaultValue={routine.cadence} required>
                        {CADENCES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      指定日（以逗號分隔；每週用星期 0-6，每月用日期 1-31，每日則留空）
                      <input
                        type="text"
                        name="anchor"
                        defaultValue={routine.anchor?.join(",") ?? ""}
                      />
                    </label>
                    <label>
                      時段偏好
                      <select
                        name="timeOfDayPreference"
                        defaultValue={routine.timeOfDayPreference ?? ""}
                      >
                        {TIME_OF_DAY.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      時間長度（分鐘）
                      <input
                        type="number"
                        name="durationMinutes"
                        min={5}
                        max={720}
                        step={5}
                        defaultValue={routine.durationMinutes}
                        required
                      />
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="useExactTime"
                        defaultChecked={routine.preferredStartTime !== null}
                      />
                      使用指定時間（優先於時段偏好）
                    </label>
                    <label>
                      指定時間
                      <TimePicker
                        name="preferredStartTime"
                        defaultValue={routine.preferredStartTime ?? "09:00"}
                      />
                    </label>
                    <label>
                      標籤（用逗號分隔）
                      <input
                        type="text"
                        name="tags"
                        defaultValue={formatTagsInput(routine.tags)}
                        placeholder="例如：學校課"
                      />
                    </label>
                    <div className={styles.slotFormActions}>
                      <button type="submit" className={styles.button}>
                        儲存
                      </button>
                      <a href="/routines" className={styles.linkAction}>
                        取消
                      </a>
                    </div>
                  </form>
                </li>
              );
            }

            return (
              <li key={routine.id} className={styles.recordCard}>
                <span className={styles.recordMain}>
                  <span className={styles.recordTitle}>
                    {routine.title} <span className={styles.badge}>{routine.category}</span>
                  </span>
                  <span className={styles.recordMeta}>
                    {CADENCE_LABELS[routine.cadence] ?? routine.cadence}
                    {routine.anchor ? `［${routine.anchor.join(",")}］` : ""}
                    {routine.preferredStartTime
                      ? ` · 指定 ${routine.preferredStartTime}`
                      : routine.timeOfDayPreference
                        ? ` · ${TIME_OF_DAY_LABELS[routine.timeOfDayPreference] ?? routine.timeOfDayPreference}`
                        : ""}
                    {` · ${routine.durationMinutes} 分鐘`}
                  </span>
                  {routine.tags.length > 0 ? (
                    <span className={styles.tagList}>
                      {routine.tags.map((tag) => (
                        <span key={tag} className={styles.tagChip}>
                          {tag}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                <span className={styles.slotActions}>
                  <a href={`/routines?edit=${routine.id}`} className={styles.linkAction}>
                    編輯
                  </a>
                  <form action={deleteRoutineAction} className={styles.inlineForm}>
                    <input type="hidden" name="id" value={routine.id} />
                    <button type="submit" className={styles.buttonDanger}>
                      刪除
                    </button>
                  </form>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <section className={styles.addForm}>
        <h2>新增常規事件</h2>
        <form action={createRoutineAction} className={styles.slotForm}>
          <label>
            標題
            <input type="text" name="title" required />
          </label>
          <label>
            類別
            <input type="text" name="category" required placeholder="例如：健身、家教" />
          </label>
          <label>
            頻率
            <select name="cadence" defaultValue="daily" required>
              {CADENCES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            指定日（以逗號分隔；每週用星期 0-6，每月用日期 1-31，每日則留空）
            <input type="text" name="anchor" placeholder="例如：1,3,5" />
          </label>
          <label>
            時段偏好
            <select name="timeOfDayPreference" defaultValue="">
              {TIME_OF_DAY.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            時間長度（分鐘）
            <input
              type="number"
              name="durationMinutes"
              min={5}
              max={720}
              step={5}
              defaultValue={120}
              required
            />
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" name="useExactTime" />
            使用指定時間（優先於時段偏好）
          </label>
          <label>
            指定時間
            <TimePicker name="preferredStartTime" />
          </label>
          <label>
            標籤（用逗號分隔）
            <input type="text" name="tags" placeholder="例如：學校課" />
          </label>
          <button type="submit" className={styles.button}>
            新增
          </button>
        </form>
      </section>
    </main>
  );
}
