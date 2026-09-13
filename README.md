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
