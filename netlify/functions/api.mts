import type { Config, Context } from '@netlify/functions';
import { getDatabase } from '@netlify/database';

const db = getDatabase();

const DEFAULT_SETTINGS = {
  expectedGrade: 'ثاني متوسط',
  classLabels: ['2/أ', '2/ب', '2/ج', '2/د'],
  schoolName: 'اسم المدرسة',
  educationDept: 'وزارة التعليم',
  teacherName: 'اسم المعلمة',
  principalName: 'اسم المديرة',
  subject: 'المادة',
  academicYear: '1448هـ',
  totalTarget: 120,
  perClassTarget: 30,
  currentCycleId: 'legacy',
  currentCycleLabel: '1448هـ',
  cycles: [] as Array<{ id: string; label: string; createdAt: string; closedAt?: string }>,
};

type Mode = 'V' | 'A' | 'R' | 'K';
type Scores = Record<Mode, number>;
type Settings = typeof DEFAULT_SETTINGS;
type StoredResult = {
  name: string;
  nameKey: string;
  grade: string;
  gradeRaw: string;
  gradeKey: string;
  className: string;
  classRaw: string;
  classKey: string;
  V: number; A: number; R: number; K: number;
  primary: string;
  secondary: string;
  description: string;
  date: string;
  updatedAt: string;
  source: 'student' | 'manual' | 'edited';
  cycleId: string;
  cycleLabel: string;
  deletedAt?: string;
};

const modeNames: Record<Mode, string> = { V: 'بصري', A: 'سمعي', R: 'قراءة/كتابة', K: 'حركي' };

function norm(value: string) {
  return String(value || '').trim().toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ');
}
function compact(value: string) {
  return norm(value).replace(/الصف|الفصل|صف|فصل/g, '').replace(/[\s\-_./\\]/g, '');
}
function gradeKey(value: string) { return compact(value); }
function classKey(value: string) { return compact(value); }
function cleanName(value: string) { return String(value || '').trim().replace(/\s+/g, ' '); }
function logicalKey(r: Partial<StoredResult>) {
  return `${r.cycleId || 'legacy'}|${norm(r.nameKey || r.name || '')}|${gradeKey(r.gradeRaw || r.grade || '')}|${classKey(r.classRaw || r.className || '')}`;
}
function summary(scores: Scores) {
  const ordered = (Object.entries(scores) as Array<[Mode, number]>).sort((a, b) => b[1] - a[1]);
  const max = ordered[0][1];
  const top = ordered.filter(([, value]) => value === max).map(([m]) => modeNames[m]);
  const primary = top.join(' + ');
  const secondary = ordered.find(([, value]) => value < max)?.[0];
  const description = top.length === 4
    ? 'تفضيلات متوازنة بين الأنماط الأربعة'
    : top.length > 1
      ? `تفضيلات متساوية في الصدارة: ${top.join('، ')}`
      : `التفضيل الأعلى حاليًا: ${top[0]}`;
  return { primary, secondary: secondary ? modeNames[secondary] : '—', description };
}
function validateScores(input: any): Scores {
  const scores = { V: Number(input.V), A: Number(input.A), R: Number(input.R), K: Number(input.K) } as Scores;
  const vals = Object.values(scores);
  if (!vals.every(v => Number.isInteger(v) && v >= 0 && v <= 20) || vals.reduce((a, b) => a + b, 0) !== 20) {
    throw new Error('يجب أن يكون مجموع درجات V/A/R/K مساويًا لـ20.');
  }
  return scores;
}
function deriveScores(modes: unknown): Scores {
  if (!Array.isArray(modes) || modes.length !== 20) throw new Error('الاستجابات غير مكتملة.');
  const scores: Scores = { V: 0, A: 0, R: 0, K: 0 };
  for (const raw of modes) {
    const mode = String(raw) as Mode;
    if (!(mode in scores)) throw new Error('توجد استجابة غير صالحة.');
    scores[mode]++;
  }
  return scores;
}
async function getSettings(): Promise<Settings> {
  const rows = await db.sql`SELECT data FROM settings WHERE id = ${'main'} LIMIT 1`;
  if (!rows.length) {
    await db.sql`INSERT INTO settings (id, data) VALUES (${'main'}, ${JSON.stringify(DEFAULT_SETTINGS)}::jsonb)`;
    return structuredClone(DEFAULT_SETTINGS);
  }
  return { ...structuredClone(DEFAULT_SETTINGS), ...(rows[0].data as object) } as Settings;
}
async function saveSettings(settings: Settings) {
  await db.sql`
    INSERT INTO settings (id, data, updated_at) VALUES (${'main'}, ${JSON.stringify(settings)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;
}
async function audit(action: string, detail: string) {
  await db.sql`INSERT INTO audit (id, action, detail, date) VALUES (${crypto.randomUUID()}, ${action}, ${detail}, NOW())`;
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
async function bodyJson(request: Request) {
  try { return await request.json(); } catch { return {}; }
}

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  try {
    if (request.method === 'GET' && path === '/_healthcheck') return json({ ok: true, platform: 'netlify' });
    if (request.method === 'GET' && path === '/config') {
      const s = await getSettings();
      return json({ expectedGrade: s.expectedGrade, classLabels: s.classLabels });
    }
    if (request.method === 'POST' && path === '/result') {
      const p: any = await bodyJson(request);
      const name = cleanName(p.name);
      const grade = String(p.grade || '').trim().replace(/\s+/g, ' ');
      const className = String(p.className || '').trim().replace(/\s+/g, ' ');
      if (name.length < 3 || !grade || !className) return json({ error: 'أكملي اسم الطالبة والصف والفصل.' }, 400);
      const scores = deriveScores(p.modes);
      const info = summary(scores);
      const percent = { V: scores.V * 5, A: scores.A * 5, R: scores.R * 5, K: scores.K * 5 };
      if (/qa|اختبار\s*qa/i.test(name)) return json({ updated: false, ...info, percent });
      const s = await getSettings();
      const now = new Date().toISOString();
      const data: StoredResult = {
        name, nameKey: norm(name), grade, gradeRaw: grade, gradeKey: gradeKey(grade),
        className, classRaw: className, classKey: classKey(className), ...scores, ...info,
        date: now, updatedAt: now, source: 'student', cycleId: s.currentCycleId, cycleLabel: s.currentCycleLabel,
      };
      await db.sql`INSERT INTO results (id, data, created_at, updated_at) VALUES (${crypto.randomUUID()}, ${JSON.stringify(data)}::jsonb, NOW(), NOW())`;
      return json({ updated: true, ...info, percent });
    }
    if (request.method === 'POST' && path === '/admin/data') {
      const s = await getSettings();
      const resultRows = await db.sql`SELECT id, data, created_at, updated_at FROM results ORDER BY updated_at DESC LIMIT 500`;
      const normalized = resultRows.map((row: any) => ({ id: row.id, ...row.data, cycleId: row.data.cycleId || 'legacy', cycleLabel: row.data.cycleLabel || '1448هـ' })) as Array<StoredResult & { id: string }>;
      const latestByLogical = new Map<string, StoredResult & { id: string }>();
      let duplicatesCollapsed = 0;
      for (const row of normalized) {
        const key = logicalKey(row);
        if (latestByLogical.has(key)) { duplicatesCollapsed++; continue; }
        latestByLogical.set(key, row);
      }
      const visible = [...latestByLogical.values()];
      const roster = visible.filter(r => !r.deletedAt && r.cycleId === s.currentCycleId);
      const archivedRoster = visible.filter(r => !r.deletedAt && r.cycleId !== s.currentCycleId);
      const deletedRoster = visible.filter(r => Boolean(r.deletedAt) && r.cycleId === s.currentCycleId);
      const archiveMap = new Map<string, { id: string; label: string; count: number; latest: string }>();
      for (const r of archivedRoster) {
        const current = archiveMap.get(r.cycleId) || { id: r.cycleId, label: r.cycleLabel || r.cycleId, count: 0, latest: '' };
        current.count++;
        if (!current.latest || String(r.updatedAt) > current.latest) current.latest = r.updatedAt;
        archiveMap.set(r.cycleId, current);
      }
      const audits = await db.sql`SELECT id, action, detail, date FROM audit ORDER BY date DESC LIMIT 30`;
      return json({
        roster, archivedRoster, deletedRoster, archives: [...archiveMap.values()], audit: audits,
        settings: s, latest: roster[0]?.updatedAt || '', rawCount: normalized.length,
        duplicatesCollapsed, normalizedLegacyCount: normalized.filter(r => !r.cycleLabel || r.cycleId === 'legacy').length, hasMore: false,
      });
    }
    if (request.method === 'POST' && path === '/admin/settings') {
      const p: any = await bodyJson(request);
      const current = await getSettings();
      const incoming = p.settings || {};
      const settings: Settings = {
        ...current,
        expectedGrade: String(incoming.expectedGrade ?? current.expectedGrade).trim(),
        classLabels: Array.isArray(incoming.classLabels) ? incoming.classLabels.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 20) : current.classLabels,
        schoolName: String(incoming.schoolName ?? current.schoolName).trim(), educationDept: String(incoming.educationDept ?? current.educationDept).trim(),
        teacherName: String(incoming.teacherName ?? current.teacherName).trim(), principalName: String(incoming.principalName ?? current.principalName).trim(),
        subject: String(incoming.subject ?? current.subject).trim(), academicYear: String(incoming.academicYear ?? current.academicYear).trim(),
        totalTarget: Math.max(1, Number(incoming.totalTarget || current.totalTarget)), perClassTarget: Math.max(1, Number(incoming.perClassTarget || current.perClassTarget)),
      };
      await saveSettings(settings);
      await audit('تحديث الإعدادات', 'تم تحديث بيانات التقرير والمستهدفات.');
      return json(settings);
    }
    if (request.method === 'POST' && path === '/admin/result/create') {
      const p: any = await bodyJson(request); const input = p.result || {};
      const name = cleanName(input.name), grade = String(input.grade || '').trim(), className = String(input.className || '').trim();
      if (name.length < 3 || !grade || !className) return json({ error: 'أكملي اسم الطالبة والصف والفصل.' }, 400);
      const scores = validateScores(input); const info = summary(scores); const s = await getSettings(); const now = new Date().toISOString();
      const data: StoredResult = { name, nameKey: norm(name), grade, gradeRaw: grade, gradeKey: gradeKey(grade), className, classRaw: className, classKey: classKey(className), ...scores, ...info, date: now, updatedAt: now, source: 'manual', cycleId: s.currentCycleId, cycleLabel: s.currentCycleLabel };
      const existing = await db.sql`SELECT id, data FROM results ORDER BY updated_at DESC LIMIT 500`;
      if (existing.some((r: any) => !r.data.deletedAt && logicalKey({ ...r.data, cycleId: r.data.cycleId || 'legacy' }) === logicalKey(data))) return json({ error: 'يوجد سجل حالي للطالبة نفسها في الصف والفصل.' }, 409);
      await db.sql`INSERT INTO results (id, data, created_at, updated_at) VALUES (${crypto.randomUUID()}, ${JSON.stringify(data)}::jsonb, NOW(), NOW())`;
      await audit('إضافة نتيجة', `أضيفت نتيجة ${name}.`); return json({ ok: true });
    }
    if (request.method === 'POST' && path === '/admin/result/update') {
      const p: any = await bodyJson(request); const id = String(p.id || ''); const input = p.result || {};
      const rows = await db.sql`SELECT data FROM results WHERE id = ${id} LIMIT 1`; if (!rows.length) return json({ error: 'السجل غير موجود.' }, 404);
      const existing = rows[0].data as StoredResult; const s = await getSettings(); if ((existing.cycleId || 'legacy') !== s.currentCycleId) return json({ error: 'نتائج الأرشيف للقراءة فقط.' }, 400);
      const name = cleanName(input.name), grade = String(input.grade || '').trim(), className = String(input.className || '').trim(); if (name.length < 3 || !grade || !className) return json({ error: 'أكملي اسم الطالبة والصف والفصل.' }, 400);
      const scores = validateScores(input); const info = summary(scores); const next: StoredResult = { ...existing, name, nameKey: norm(name), grade, gradeRaw: grade, gradeKey: gradeKey(grade), className, classRaw: className, classKey: classKey(className), ...scores, ...info, updatedAt: new Date().toISOString(), source: 'edited' };
      await db.sql`UPDATE results SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id}`; await audit('تعديل نتيجة', `عُدلت نتيجة ${name}.`); return json({ ok: true });
    }
    if (request.method === 'POST' && path === '/admin/result/delete') {
      const p: any = await bodyJson(request); const id = String(p.id || ''); const rows = await db.sql`SELECT data FROM results WHERE id = ${id} LIMIT 1`; if (!rows.length) return json({ error: 'السجل غير موجود.' }, 404);
      const existing = rows[0].data as StoredResult; const s = await getSettings(); if ((existing.cycleId || 'legacy') !== s.currentCycleId) return json({ error: 'نتائج الأرشيف للقراءة فقط.' }, 400);
      const next = { ...existing, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; await db.sql`UPDATE results SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id}`; await audit('حذف نتيجة', `نُقلت نتيجة ${existing.name} إلى المحذوفات.`); return json({ ok: true });
    }
    if (request.method === 'POST' && path === '/admin/result/restore') {
      const p: any = await bodyJson(request); const id = String(p.id || ''); const rows = await db.sql`SELECT data FROM results WHERE id = ${id} LIMIT 1`; if (!rows.length) return json({ error: 'السجل غير موجود.' }, 404);
      const existing = rows[0].data as StoredResult; const s = await getSettings(); if ((existing.cycleId || 'legacy') !== s.currentCycleId) return json({ error: 'نتائج الأرشيف للقراءة فقط.' }, 400);
      const { deletedAt: _deletedAt, ...rest } = existing; const next = { ...rest, updatedAt: new Date().toISOString(), source: 'edited' as const }; await db.sql`UPDATE results SET data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id}`; await audit('استعادة نتيجة', `تمت استعادة نتيجة ${existing.name}.`); return json({ ok: true });
    }
    if (request.method === 'POST' && path === '/admin/cycle/start') {
      const p: any = await bodyJson(request); const label = String(p.label || '').trim().replace(/\s+/g, ' '); if (label.length < 2 || label.length > 80) return json({ error: 'اكتبي اسمًا واضحًا للدورة الجديدة.' }, 400);
      if (label.startsWith('__QA__')) return json({ qa: true, message: 'تم التحقق من العملية دون تغيير البيانات.' });
      const current = await getSettings(); const now = new Date().toISOString(); const closed = { id: current.currentCycleId, label: current.currentCycleLabel, createdAt: current.cycles.find(c => c.id === current.currentCycleId)?.createdAt || now, closedAt: now };
      const cycles = [...current.cycles.filter(c => c.id !== closed.id), closed]; const next = { ...current, currentCycleId: `cycle-${Date.now()}`, currentCycleLabel: label, cycles }; await saveSettings(next); await audit('بدء دورة جديدة', `أُرشفت دورة ${current.currentCycleLabel} وبدأت دورة ${label}.`); return json({ ok: true });
    }
    return json({ error: 'المسار غير موجود.' }, 404);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
    return json({ error: message }, 500);
  }
};

export const config: Config = { path: '/api/*' };
