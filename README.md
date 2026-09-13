# اختبار أنماط التعلّم (VARK) — Netlify

أداة مدرسية عربية RTL لاكتشاف **أنماط التعلّم الأقرب** بصورة إرشادية ضمن أربع فئات: بصري (V)، سمعي (A)، قراءة/كتابة (R)، وحركي (K).

> هذه ليست النسخة الرسمية من استبيان VARK ولا تستخدم خوارزمية VARK الرسمية. الأسئلة وطريقة احتساب النتائج في هذا المشروع مخصصة للاستخدام المدرسي الإرشادي.

## البنية

- واجهة الطالبات: ملفات ثابتة داخل `public/`.
- الفئة المستهدفة افتراضيًا: ثاني متوسط، والفصول `2/أ` و`2/ب` و`2/ج` و`2/د`.
- لوحة المعلمة: `/?view=admin` مع رمز دخول محفوظ في متغير البيئة `ADMIN_PIN`.
- حماية لوحة المعلمة: Netlify Edge Function في `netlify/edge-functions/admin-auth.ts`.
- API: Netlify Function في `netlify/functions/api.mts`.
- قاعدة البيانات: Netlify Database مع migrations داخل `netlify/database/migrations/`.
- التقارير: كشف PDF، تحليل PDF، تقرير شامل PDF، وتصدير CSV.
- البيانات: منع التكرار المنطقي للطالبة داخل الدورة، تعديل/حذف/استعادة، وأرشفة الدورات السابقة.

## النشر على Netlify

إعدادات النشر موجودة في `netlify.toml`:

- Publish directory: `public`
- Functions directory: `netlify/functions`
- قاعدة البيانات تُجهّز تلقائيًا بواسطة Netlify Database وتُطبّق migrations أثناء النشر.

يجب إضافة متغير البيئة `ADMIN_PIN` في Netlify. لا تحفظ رمز الإدارة أو أي أسرار داخل المستودع.

## التطوير المحلي

```bash
npm install
npx netlify dev
```

ملفات `.env*` و`.netlify/` مستبعدة عبر `.gitignore`.


Access: student and teacher views are public, without a login, as requested by the owner. ADMIN_PIN is no longer required.


## Reliability verification — 2026-09-13

- Removed a MutationObserver feedback loop that froze the student page.
- Atomic student writes use PostgreSQL transactions, indexed identity lookup, and request idempotency.
- Dashboard refreshes every 15 seconds without overlapping requests and retains the last data on failure.
- PDF libraries are served with the application instead of blocking startup on a third-party CDN.
- Run `npm ci && npm test` for the automated student journey, failed-save retry, configuration retry, and dashboard polling tests.
- Production verification: 10 concurrent identical submissions returned HTTP 200 and stored one row; 20 concurrent configuration reads returned HTTP 200. Delete/restore and replay-after-delete passed. The synthetic record remains in recoverable trash.
- These bounded checks are not a high-volume capacity certification. Free-plan quotas still apply. Direct browser visual verification was blocked by the existing browser session timing out; the deployed page and runtime returned HTTP 200, and the student journey passed in the DOM test harness.
