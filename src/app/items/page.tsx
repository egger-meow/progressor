import { listTrackableItems } from "@/server/trackable-items";
import { createTrackableItemAction, updateTrackableItemAction } from "./actions";
import { PriorityList } from "./priority-list";
import styles from "../page.module.css";

const STATUSES = [
  { value: "not-started", label: "尚未開始" },
  { value: "in-progress", label: "進行中" },
  { value: "paused", label: "暫停" },
  { value: "done", label: "已完成" },
] as const;

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
      <div className={styles.pageHeader}>
        <h1>書籍與課程</h1>
        <p className={styles.pageSubtitle}>
          新增後直接拖曳排序優先度 — 放開就會立即重新排程本週課表。
        </p>
      </div>

      {params.error ? <p className={styles.error}>{params.error}</p> : null}

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
              預估天數
              <input
                type="number"
                name="estimatedDays"
                defaultValue={editingItem.estimatedDays}
                required
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
            預估天數
            <input type="number" name="estimatedDays" required />
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
          <button type="submit" className={styles.button}>
            新增
          </button>
        </form>
      </section>
    </main>
  );
}
