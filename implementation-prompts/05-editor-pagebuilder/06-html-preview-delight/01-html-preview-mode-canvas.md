# P05-T06-01 — حالت HTML Preview به‌عنوان Stage اصلی

## هدف
وقتی `editorMode === 'htmlPreview'`، پیش‌نمایش HTML **ستارهٔ صحنه** باشد: تمام‌عرض یا پنل وسیع روی paper frame، rails جمع‌شده یا فقط‌خواندنی طبق IA — نه یک باکس فرعی شبیه دیباگ زیر لیست بلوک‌ها.

## پیش‌نیاز
- `P05-T01-04` mode switcher
- `html-preview.tsx` + paper frame فاز 02
- IA: `docs/ux/editor-pagebuilder-ia.md`

## دامنه Full-Stack
- Frontend فقط (shell + css + preview layout)
- i18n برچسب حالت و نوار ابزار preview (بازگشت به ویرایش)
- Docs: یک اسکرین‌فلو کوتاه در IA اگر فرق کرد

## معیار تموم شدن (DoD)
- [ ] در htmlPreview، HtmlPreview ناحیهٔ اصلی center است
- [ ] CTA واضح «بازگشت به ویرایش»
- [ ] paper frame و page size از body.page تبعیت می‌کند
- [ ] بنر کوچک «پیش‌نمایش تقریبی — PDF نهایی ممکن است کمی فرق کند»
- [ ] edit mode همچنان canvas ویرایش دارد (رگرسیون)
- [ ] dark/light؛ RTL؛ قفل‌ها مانع مشاهدهٔ preview نشوند

## پرامپت اجرا

```
طبق IA و mode switch فاز 01 و paper frame فاز 02 عمل کن.

تسک: حالت HTML Preview را به stage اصلی صفحه‌ساز تبدیل کن.

الزامات:
1) تحلیل layout فعلی وقتی preview کنار/زیر canvas است + تسک‌لیست.
2) در editorMode=htmlPreview:
   - FlowCanvas را مخفی یا غیرتعاملی کن
   - HtmlPreview را کامل در stage با paper نشان بده
   - left/right rails: طبق IA جمع‌شو یا read-only؛ پیشنهاد: collapse برای تمرکز
3) نوار ابزار کوچک preview: بازگشت به edit، (اختیاری) شماره صفحهٔ logical
4) بنر اعتماد: تقریبی بودن صفحه‌بندی (ADR 017) به زبان کاربر.
5) از ساخت PDF یا enqueue خودداری کن.
6) i18n fa+en؛ تم‌ها؛ focus management هنگام سوییچ mode.
7) selection-sync عمیق تسک 02 است — اینجا حداقل mount درست.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
