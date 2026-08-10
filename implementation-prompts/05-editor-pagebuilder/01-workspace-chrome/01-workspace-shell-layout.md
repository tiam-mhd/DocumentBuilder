# P05-T01-01 — لایه‌بندی سه‌ناحیه + Top bar حرفه‌ای

## هدف
`EditorShell` را به کروم صفحه‌ساز سه‌ناحیه (Left / Canvas / Right) با **Top bar** گروه‌بندی‌شده بازآرایی کن تا حس فضای کار حرفه‌ای بدهد — بدون عمیق کردن inspector، DnD جدید، یا PDF preview واقعی (فقط جای خالی ساختاری در صورت نیاز).

## پیش‌نیاز
- اجرای ترجیحی فاز 00 (rule 29، IA در `docs/ux/editor-pagebuilder-ia.md`)؛ اگر IA هنوز نیست، از overview فاز 00 و `00-vision-and-gap-analysis.md` پیروی کن و انحراف را در PR/خلاصه بگو
- کد فعلی: `apps/web/src/features/editor/editor-shell.tsx` + `.module.css`
- قوانین: `07-document-editor.mdc`، `29-editor-pagebuilder-ux.mdc` (اگر هست)، `10-theme-and-i18n.mdc`، `28-panel-shell-ux.mdc` (ادیتور داخل app shell؛ با sidebar اپ تداخل بصری نداشته باشد)

## دامنه Full-Stack
- Database: ندارد
- Backend: ندارد
- Frontend: بازآرایی shell + CSS tokens ادیتور؛ استخراج کامپوننت‌های ساختاری در صورت نیاز (`editor-top-bar.tsx`، `editor-workspace-layout.tsx`)
- Docs: اگر قرارداد UI سراسری جدید دیدی → rule 29؛ در غیر این صورت ذکر در خلاصه
- i18n: کلیدهای جدید `editor.*` در `fa.json` / `en.json`

## معیار تموم شدن (DoD)
- [ ] Layout دسکتاپ: top bar + left rail + center canvas + right rail
- [ ] Top bar گروه‌ها: Document (عنوان + وضعیت کوتاه) / History (undo/redo) / Save status / لینک بازگشت / منوی More برای پنل‌های ثانویه
- [ ] پنل‌های موجود (export، workflow، comments، …) از ستون اصلی شلوغ خارج و زیر More یا slide-over/تمپوراری قابل‌دسترس‌اند (طبق IA)
- [ ] Canvas مرکز توجه است؛ حداقل ارتفاع/اسکرول درست در هر دو تم
- [ ] RTL/LTR و dark/light صحیح
- [ ] Autosave / undo / load رفتار قبلی نشکند
- [ ] عمق inspector و page-size و PDF preview واقعی **خارج از این تسک** بماند

## پرامپت اجرا

```
طبق `.cursor/rules/` (مخصوصاً 07 و 29 صفحه‌ساز اگر موجود است) و سند IA ادیتور عمل کن.

تسک: EditorShell را به فضای کار سه‌ناحیه + top bar حرفه‌ای Full-Stack (عمدتاً Next) بازآرایی کن.

الزامات:
1) تحلیل + تسک‌لیست قبل از کد.
2) `docs/ux/editor-pagebuilder-ia.md` را بخوان؛ اگر نیست از پک 05 فاز 00 پیروی کن.
3) ساختار:
   - Top bar چسبان با گروه‌بندی واضح (نه ردیف دکمهٔ شلوغ بی‌سلسله)
   - Left rail عرض ثابت/قابل جمع‌شدن
   - Center: flow canvas + (فعلاً) html preview می‌تواند پایین/کنار بماند ولی از نظر بصری «داخل stage» باشد نه پنل تصادفی
   - Right rail برای inspector
4) پنل‌های ثانویه فعلی (Master، Export، Versions، Workflow، Web publish، Share، Comments) را از layout شلوغ خارج کن: منوی «بیشتر» یا tabs ثانویه طبق IA — عملکردشان را حذف نکن.
5) عنوان سند، locale سند، undo/redo، saveStatus را در top bar نگه دار یا بهتر جای‌گذاری کن.
6) CSS با توکن‌های تم اپ (`--bg`, `--border`, …)؛ فونت UI مطابق پروژه (Vazirmatn)؛ بدون پالت بنفش کلیشه‌ای AI.
7) i18n fa+en برای رشته‌های جدید؛ هیچ string هاردکد کاربرنما.
8) رفتار bodyLock / writable موجود را نشکن (تسک 05 جلا می‌دهد).
9) PDF preview واقعی و page size UI و nested DnD نساز — فقط کروم.
10) اگر قانون سراسری جدیدی دیدی اول rule را آپدیت کن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
