# P05-T07-02 — UI حالت / پنل PDF Preview در ادیتور

## هدف
وقتی کاربر `editorMode=pdfPreview` را می‌زند (یا دکمهٔ «پیش‌نمایش PDF»)، UI وضعیت جاب (queued/processing/completed/failed) را نشان دهد و پس از تکمیل PDF را داخل ادیتور نمایش دهد (iframe/object/embed یا PDF.js سبک — انتخاب معقول و امن).

## پیش‌نیاز
- `01-api-pdf-preview-enqueue.md`
- Mode switch فاز 01 (پوستهٔ pdfPreview)
- `export-panel.tsx` الگو polling — تکرار کور نکن؛ انتزاع مشترک اگر مفید است

## دامنه Full-Stack
- Frontend: پنل/stage PDF preview + api client
- Shared-types برای job DTO اگر در 01 آمده
- i18n
- Docs UX یک پاراگراف

## معیار تموم شدن (DoD)
- [ ] دکمهٔ تولید/تازه‌سازی پیش‌نمایش صریح (نه automatic روی هر تغییر)
- [ ] اگر body بعد از آخرین preview عوض شده: نشان «منسوخ» + CTA تازه‌سازی
- [ ] polling با backoff معقول؛ توقف روی unmount
- [ ] نمایش PDF completed؛ خطا با پیام i18n از code
- [ ] بدون enqueue هنگام autosave/dnd/keystroke
- [ ] dark/light؛ RTL؛ قفل مشاهده برای membership حتی اگر !writable طبق ADR
- [ ] فایل از طریق authenticated URL/blob نه لینک عمومی تصادفی

## پرامپت اجرا

```
طبق ADR PDF preview و shell mode عمل کن. پیش‌نیاز API تسک 01.

تسک: UI پیش‌نمایش PDF داخل ادیتور را پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ الگوی ExportPanel را بخوان و برای preview جدا یا hook مشترک بساز.
2) در mode=pdfPreview: stage با وضعیت‌ها و viewer.
3) CTA «ساخت پیش‌نمایش» فقط با کلیک کاربر؛ تأیید اگر جاب قبلی in-flight است.
4) Dirty detection: مقایسه updatedAt سند یا hash نسخهٔ body ذخیره‌شده در meta جاب — ساده و قابل اعتماد.
5) Viewer: iframe با blob URL از fetch authenticated؛ revoke روی cleanup.
6) i18n fa+en برای همهٔ حالت‌ها.
7) دسترس‌پذیری: وضعیت با aria-live.
8) final download را اینجا قاطی نکن (تسک 03 تمایز می‌دهد) — لینک ثانویه OK اگر برچسب واضح باشد.
9) rate limit UI در تسک 05 کامل می‌شود؛ اینجا خطای 429 را نشان بده.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
