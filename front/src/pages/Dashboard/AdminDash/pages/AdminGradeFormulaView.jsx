import { useEffect, useState } from "react";
import styles from "./AdminPages.module.css";
import { gradeFormulaApi } from "../../../../shared/lib/api";

const DEFAULTS = {
  foWeight: 0.25,
  sorWeight: 0.25,
  sochWeight: 0.5,
  yearWeight: 0.6,
  examWeight: 0.4,
  maxScale: 10,
};

export default function AdminGradeFormulaView() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    gradeFormulaApi.get()
      .then((data) => {
        if (cancelled || !data) return;
        setForm({
          foWeight: data.foWeight ?? DEFAULTS.foWeight,
          sorWeight: data.sorWeight ?? DEFAULTS.sorWeight,
          sochWeight: data.sochWeight ?? DEFAULTS.sochWeight,
          yearWeight: data.yearWeight ?? DEFAULTS.yearWeight,
          examWeight: data.examWeight ?? DEFAULTS.examWeight,
          maxScale: data.maxScale ?? DEFAULTS.maxScale,
        });
      })
      .catch((err) => setError(err?.message || "Ошибка загрузки"))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);
    try {
      const payload = {
        foWeight: Number(form.foWeight),
        sorWeight: Number(form.sorWeight),
        sochWeight: Number(form.sochWeight),
        yearWeight: Number(form.yearWeight),
        examWeight: Number(form.examWeight),
        maxScale: Number(form.maxScale),
      };
      const updated = await gradeFormulaApi.adminUpdate(payload);
      setForm({
        foWeight: updated.foWeight,
        sorWeight: updated.sorWeight,
        sochWeight: updated.sochWeight,
        yearWeight: updated.yearWeight,
        examWeight: updated.examWeight,
        maxScale: updated.maxScale,
      });
      setMessage("Формулы сохранены и нормализованы (сумма весов = 1.0)");
    } catch (err) {
      setError(err?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const quarterSum = (Number(form.foWeight) || 0) + (Number(form.sorWeight) || 0) + (Number(form.sochWeight) || 0);
  const finalSum = (Number(form.yearWeight) || 0) + (Number(form.examWeight) || 0);

  if (loading) {
    return <div className={styles.stack}><p>Загрузка…</p></div>;
  }

  return (
    <div className={styles.stack}>
      <section className={styles.sectionHead}>
        <div>
          <h2 className={styles.sectionTitle}>Формула оценивания</h2>
          <p className={styles.sectionSub}>
            Настраивайте веса категорий для вычисления четвертных, годовых и аттестационных оценок.
          </p>
        </div>
        <span className={`${styles.pill} ${styles.pillLive}`}>Админ</span>
      </section>

      <section className={styles.layout}>
        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Веса категорий — четверть</h3>
          <p className={styles.sectionSub} style={{ marginTop: 0 }}>
            Четверть = ФО × {Number(form.foWeight).toFixed(2)} + СОР × {Number(form.sorWeight).toFixed(2)} + СОЧ × {Number(form.sochWeight).toFixed(2)}
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGrid3}>
              <label className={styles.field}>
                <span className={styles.label}>ФО (формативное)</span>
                <input
                  className={styles.input}
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={form.foWeight}
                  onChange={(e) => update("foWeight", e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>СОР</span>
                <input
                  className={styles.input}
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={form.sorWeight}
                  onChange={(e) => update("sorWeight", e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>СОЧ</span>
                <input
                  className={styles.input}
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={form.sochWeight}
                  onChange={(e) => update("sochWeight", e.target.value)}
                />
              </label>
            </div>
            <p className={styles.sectionSub} style={{ marginTop: 0, color: Math.abs(quarterSum - 1) < 0.01 ? "var(--accent-strong)" : "var(--warning-strong)" }}>
              Сумма: {quarterSum.toFixed(2)} {Math.abs(quarterSum - 1) > 0.01 ? "(не равна 1 — будет нормализована при сохранении)" : "✓"}
            </p>

            <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>Веса — аттестационная (итоговая) оценка</h3>
            <p className={styles.sectionSub} style={{ marginTop: 0 }}>
              Итоговая = Годовая × {Number(form.yearWeight).toFixed(2)} + Экзамен × {Number(form.examWeight).toFixed(2)}
            </p>
            <div className={styles.fieldGrid2}>
              <label className={styles.field}>
                <span className={styles.label}>Годовая</span>
                <input
                  className={styles.input}
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={form.yearWeight}
                  onChange={(e) => update("yearWeight", e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Экзамен</span>
                <input
                  className={styles.input}
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={form.examWeight}
                  onChange={(e) => update("examWeight", e.target.value)}
                />
              </label>
            </div>
            <p className={styles.sectionSub} style={{ marginTop: 0, color: Math.abs(finalSum - 1) < 0.01 ? "var(--accent-strong)" : "var(--warning-strong)" }}>
              Сумма: {finalSum.toFixed(2)} {Math.abs(finalSum - 1) > 0.01 ? "(не равна 1 — будет нормализована)" : "✓"}
            </p>

            <h3 className={styles.panelTitle} style={{ marginTop: 18 }}>Максимум шкалы</h3>
            <label className={styles.field}>
              <span className={styles.label}>Шкала оценивания</span>
              <select
                className={styles.select}
                value={form.maxScale}
                onChange={(e) => update("maxScale", Number(e.target.value))}
              >
                <option value={5}>5-балльная</option>
                <option value={10}>10-балльная</option>
              </select>
            </label>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryBtn} disabled={saving}>
                {saving ? "Сохранение…" : "Сохранить формулы"}
              </button>
            </div>

            {message ? <div className={styles.alertOk}>{message}</div> : null}
            {error ? <div className={styles.alertErr}>{error}</div> : null}
          </form>
        </article>

        <article className={styles.formCard}>
          <h3 className={styles.panelTitle}>Как это работает</h3>
          <ul style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, paddingLeft: 20 }}>
            <li><strong>ФО (формативное):</strong> среднее по оценкам с уроков, заданий и квизов</li>
            <li><strong>СОР:</strong> среднее по оценкам типа «Суммативное оценивание раздела» (выставляется учителем вручную)</li>
            <li><strong>СОЧ:</strong> среднее по оценкам типа «Суммативное оценивание четверти» (выставляется учителем вручную)</li>
            <li><strong>Четверть:</strong> взвешенная сумма ФО, СОР, СОЧ по конфигурируемым весам</li>
            <li><strong>Годовая:</strong> среднее арифметическое доступных четвертных оценок (1, 2, 3, 4)</li>
            <li><strong>Итоговая (аттестационная):</strong> Годовая × yearWeight + Экзамен × examWeight</li>
          </ul>
          <p className={styles.sectionSub} style={{ marginTop: 12 }}>
            Веса нормализуются автоматически при сохранении — можно указывать любые числа.
            Если в четверти отсутствует какая-то категория (например, ученик не писал СОЧ),
            её вес временно «переливается» в оставшиеся категории.
          </p>
        </article>
      </section>
    </div>
  );
}
