import { listFixedCommitments, listDeadlineTasks } from "@/server/semester-commitments";
import { getSemester } from "@/server/semester";
import {
  createDeadlineTaskAction,
  createFixedCommitmentAction,
  deleteDeadlineTaskAction,
  deleteFixedCommitmentAction,
  setSemesterAction,
  updateDeadlineTaskAction,
  updateFixedCommitmentAction,
} from "./actions";
import { formatDateParam } from "../week";
import { TimePicker } from "../time-picker";
import { DatePicker } from "../date-picker";
import styles from "../page.module.css";

const DAY_OPTIONS = [
  { value: 0, label: "星期日" },
  { value: 1, label: "星期一" },
  { value: 2, label: "星期二" },
  { value: 3, label: "星期三" },
  { value: 4, label: "星期四" },
  { value: 5, label: "星期五" },
  { value: 6, label: "星期六" },
];

export default async function CommitmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ editFC?: string; editDT?: string; error?: string }>;
}) {
  const params = await searchParams;
  const [fixedCommitments, deadlineTasks, semester] = await Promise.all([
    listFixedCommitments(),
    listDeadlineTasks(),
    getSemester(),
  ]);
  const editingFC = params.editFC
    ? fixedCommitments.find((c) => c.id === params.editFC)
    : undefined;
  const editingDT = params.editDT
    ? deadlineTasks.find((t) => t.id === params.editDT)
    : undefined;

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>學期事務</h1>
        <p className={styles.pageSubtitle}>固定不可移動的課程／會議，以及有截止日但時段可彈性安排的作業／考試準備。</p>
      </div>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

      <section className={styles.addForm}>
        <h3>學期設定</h3>
        {semester ? (
          <p className={styles.hint}>
            目前學期：{formatDateParam(semester.startDate)} 起，共 {semester.weekCount} 週
            （到 {formatDateParam(new Date(semester.startDate.getTime() + semester.weekCount * 7 * 86400000))} 前）。
            未勾選「忽略學期範圍」的固定事務只會在此範圍內的週次顯示。
          </p>
        ) : (
          <p className={styles.hint}>
            尚未設定學期——所有固定事務目前每週都會顯示，不受學期範圍限制。
          </p>
        )}
        <form action={setSemesterAction} className={styles.slotForm}>
          <label>
            開學日
            <DatePicker
              name="startDate"
              defaultValue={semester ? formatDateParam(semester.startDate) : undefined}
            />
          </label>
          <label>
            週數
            <input
              type="number"
              name="weekCount"
              defaultValue={semester?.weekCount ?? 16}
              min={1}
              required
            />
          </label>
          <button type="submit" className={styles.button}>
            儲存學期設定
          </button>
        </form>
      </section>

      <h2>固定事務</h2>
      {fixedCommitments.length === 0 ? (
        <p className={styles.empty}>尚未新增任何固定事務。</p>
      ) : (
        <ul className={styles.recordList}>
          {fixedCommitments.map((c) => {
            if (editingFC && editingFC.id === c.id) {
              return (
                <li key={c.id} className={styles.addForm}>
                  <form action={updateFixedCommitmentAction} className={styles.slotForm}>
                    <input type="hidden" name="id" value={c.id} />
                    <label>
                      標題
                      <input type="text" name="title" defaultValue={c.title} required />
                    </label>
                    <label>
                      星期
                      <select name="dayOfWeek" defaultValue={c.dayOfWeek} required>
                        {DAY_OPTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      開始
                      <TimePicker name="startTime" defaultValue={c.startTime} />
                    </label>
                    <label>
                      結束
                      <TimePicker name="endTime" defaultValue={c.endTime} />
                    </label>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="ignoreSemesterBounds"
                        defaultChecked={c.ignoreSemesterBounds}
                      />
                      忽略學期範圍（不限 16 週，每週都顯示）
                    </label>
                    <div className={styles.slotFormActions}>
                      <button type="submit" className={styles.button}>
                        儲存
                      </button>
                      <a href="/commitments" className={styles.linkAction}>
                        取消
                      </a>
                    </div>
                  </form>
                </li>
              );
            }

            return (
              <li key={c.id} className={styles.recordCard}>
                <span className={styles.recordMain}>
                  <span className={styles.recordTitle}>{c.title}</span>
                  <span className={styles.recordMeta}>
                    {DAY_OPTIONS[c.dayOfWeek].label} {c.startTime}–{c.endTime}
                  </span>
                </span>
                <span className={styles.slotActions}>
                  <a href={`/commitments?editFC=${c.id}`} className={styles.linkAction}>
                    編輯
                  </a>
                  <form action={deleteFixedCommitmentAction} className={styles.inlineForm}>
                    <input type="hidden" name="id" value={c.id} />
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
        <h3>新增固定事務</h3>
        <form action={createFixedCommitmentAction} className={styles.slotForm}>
          <label>
            標題
            <input type="text" name="title" required />
          </label>
          <label>
            星期
            <select name="dayOfWeek" defaultValue={1} required>
              {DAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            開始
            <TimePicker name="startTime" />
          </label>
          <label>
            結束
            <TimePicker name="endTime" defaultValue="10:00" />
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" name="ignoreSemesterBounds" />
            忽略學期範圍（不限 16 週，每週都顯示）
          </label>
          <button type="submit" className={styles.button}>
            新增
          </button>
        </form>
      </section>

      <h2>截止任務</h2>
      {deadlineTasks.length === 0 ? (
        <p className={styles.empty}>尚未新增任何截止任務。</p>
      ) : (
        <ul className={styles.recordList}>
          {deadlineTasks.map((t) => {
            if (editingDT && editingDT.id === t.id) {
              return (
                <li key={t.id} className={styles.addForm}>
                  <form action={updateDeadlineTaskAction} className={styles.slotForm}>
                    <input type="hidden" name="id" value={t.id} />
                    <label>
                      標題
                      <input type="text" name="title" defaultValue={t.title} required />
                    </label>
                    <label>
                      截止日期
                      <DatePicker name="dueAt" defaultValue={formatDateParam(new Date(t.dueAt))} />
                    </label>
                    <label>
                      預估天數
                      <input
                        type="number"
                        name="estimatedDays"
                        defaultValue={t.estimatedDays}
                        required
                      />
                    </label>
                    <div className={styles.slotFormActions}>
                      <button type="submit" className={styles.button}>
                        儲存
                      </button>
                      <a href="/commitments" className={styles.linkAction}>
                        取消
                      </a>
                    </div>
                  </form>
                </li>
              );
            }

            return (
              <li key={t.id} className={styles.recordCard}>
                <span className={styles.recordMain}>
                  <span className={styles.recordTitle}>{t.title}</span>
                  <span className={styles.recordMeta}>
                    截止 {formatDateParam(new Date(t.dueAt))} · 預估 {t.estimatedDays} 天
                  </span>
                </span>
                <span className={styles.slotActions}>
                  <a href={`/commitments?editDT=${t.id}`} className={styles.linkAction}>
                    編輯
                  </a>
                  <form action={deleteDeadlineTaskAction} className={styles.inlineForm}>
                    <input type="hidden" name="id" value={t.id} />
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
        <h3>新增截止任務</h3>
        <form action={createDeadlineTaskAction} className={styles.slotForm}>
          <label>
            標題
            <input type="text" name="title" required />
          </label>
          <label>
            截止日期
            <DatePicker name="dueAt" />
          </label>
          <label>
            預估天數
            <input type="number" name="estimatedDays" required />
          </label>
          <button type="submit" className={styles.button}>
            新增
          </button>
        </form>
      </section>
    </main>
  );
}
