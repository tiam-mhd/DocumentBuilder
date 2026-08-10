# P05-T00-04 — معماری اطلاعات فضای کار ادیتور (IA)

## هدف
سند IA ثابت برای صفحه‌ساز: نواحی UI، حالت‌ها، واژه‌نامه، اولویت پنل‌ها، و نگاشت قابلیت‌های موجود (workflow، comments، versions، share، export) به کروم جدید — تا فاز `01-workspace-chrome` بدون بحث دوباره پیاده شود.

## پیش‌نیاز
- `01-pagebuilder-ux-law-rule.md`
- `02-adr-layout-columns-grid.md` و `03-adr-pdf-preview-job.md` حداقل به‌صورت Proposed/Accepted در کاتالوگ (یا هم‌زمان)
- وضعیت فعلی: `apps/web/src/features/editor/editor-shell.tsx` (فقط مطالعه)

## دامنه Full-Stack
- Database/Backend/Frontend کد: ندارد
- Docs: `docs/ux/editor-pagebuilder-ia.md` (پوشه `docs/ux/` اگر نیست بساز)
- ارجاع از README پک `05-editor-pagebuilder` به این سند

## معیار تموم شدن (DoD)
- [ ] سند IA با دیاگرام متنی/mermaid نواحی
- [ ] واژه‌نامه EN+FA برای مفاهیم کاربر (نه اصطلاحات داخلی اجباری در UI)
- [ ] تعریف Top bar actions و گروه‌بندی
- [ ] Left rail: تب‌ها/سکشن‌ها (Palette، Layers، …)
- [ ] Right rail: تب‌های inspector + پنل‌های ثانویه کجا می‌روند (drawer/modal/tab)
- [ ] جای Workflow / Comments / Versions / Share / Web publish / Export / PDF Preview بدون شلوغی Elementor-killer
- [ ] رفتار موبایل/عرض کم: حداقل قانون (مثلاً drawer) — حتی اگر MVP دسکتاپ‌اول باشد
- [ ] حالت‌های `edit|htmlPreview|pdfPreview` و انتقال بین آن‌ها
- [ ] هیچ کد محصول

## پرامپت اجرا

```
طبق rule صفحه‌ساز (29 یا معادل) و پک 05 عمل کن. فقط مستند IA — بدون تغییر React.

تسک: معماری اطلاعات فضای کار ادیتور صفحه‌ساز را بنویس.

الزامات:
1) تحلیل UI فعلی editor-shell (خواندن کد) و فهرست دردها (شلوغی پنل، نبود page setup، نبود mode switch واضح، …).
2) فایل `docs/ux/editor-pagebuilder-ia.md` بساز شامل:
   A) هدف کاربر در ۳۰ ثانیه اول ورود به ادیتور
   B) دیاگرام layout دسکتاپ (mermaid یا ASCII)
   C) واژه‌نامه:
      - Canvas / Paper / Block / Section / Row|Column / Master / Layer / Inspector / Palette
      - معادل فارسی پیشنهادی برای UI (کلیدهای i18n بعدی از همین بیایند)
   D) Top bar: گروه‌ها — Document (عنوان، وضعیت workflow خلاصه)، History (undo/redo)، Page (سایز/جهت)، Mode switch، Save status، More (share/export/…)
   E) Left rail:
      - Palette (جستجو، گروه‌بندی core vs module قفل‌شده با CTA)
      - Layers (درخت pages→blocks)
      - اختیاری: Masters shortcut
   F) Center: paper frame، zoom controls، page navigator
   G) Right rail:
      - Inspector tabs Content | Design | Advanced
      - اگر چیزی انتخاب نشده: Page settings یا Document settings
   H) Secondary surfaces (نباید همه هم‌زمان باز باشند):
      - Comments، Versions، Workflow، Share، Web publish، Final export، PDF preview progress
      - تصمیم: کدام tab در right، کدام modal، کدام slide-over
   I) Mode behaviors جدول‌وار (edit/htmlPreview/pdfPreview × editable؟ × نشان‌دادن rails؟)
   J) Breakpoint: زیر چه عرضی rails به drawer تبدیل می‌شوند
   K) Empty states: سند خالی، بدون انتخاب، قفل writable، قفل body
   L) Non-goals UI: نمایش schemaVersion، JSON body، Mongo id به کاربر نهایی
3) در `implementation-prompts/05-editor-pagebuilder/README.md` لینک به این سند IA اضافه کن.
4) اگر واژه‌نامه با i18n موجود تعارض داشت، در سند یادداشت «فاز پیاده‌سازی کلیدها را migrate کند» بگذار — الان fa.json را تغییر نده مگر لازم برای docs.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
