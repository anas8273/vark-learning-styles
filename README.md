# Learning Preferences Profile — Netlify

أداة مدرسية عربية RTL لقياس **تفضيلات التعلّم** بصورة إرشادية ضمن أربع فئات: بصري (V)، سمعي (A)، قراءة/كتابة (R)، وحركي (K).

> هذه ليست النسخة الرسمية من استبيان VARK ولا تستخدم خوارزمية VARK الرسمية. الأسئلة وطريقة احتساب النتائج في هذا المشروع مخصصة للاستخدام المدرسي الإرشادي.

## البنية

- واجهة الطالبات: ملفات ثابتة داخل `public/`.
- لوحة المعلمة: `/?view=admin` مع رمز دخول محفوظ في متغير البيئة `ADMIN_PIN`.
- حماية لوحة المعلمة: Netlify Edge Function في `netlify/edge-functions/admin-auth.ts`.
- API: Netlify Function في `netlify/functions/api.mts`.
- قاعدة البيانات: Netlify Database مع migrations داخل `netlify/database/migrations/`.
- التقارير: PDF وCSV من لوحة المعلمة.

## النشر على Netlify

إعدادات النشر موجودة في `netlify.toml`:

- Publish directory: `public`
- Functions directory: `netlify/functions`

يجب إضافة متغير البيئة `ADMIN_PIN` في Netlify. لا تحفظ رمز الإدارة أو أي أسرار داخل المستودع.

## التطوير المحلي

```bash
npm install
npx netlify dev
```

ملفات `.env*` و`.netlify/` مستبعدة عبر `.gitignore`.
