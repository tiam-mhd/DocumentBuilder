# P05-T02-01 — UI پریست اندازهٔ صفحه (A4 / A3 / …)

## هدف
کنترل کاربرپسند برای `body.page.size` در ادیتور (حداقل A4/A3 مطابق schema امروز) با جای رشد برای پریست‌های بیشتر؛ تغییر باید store → autosave → preview/PDF را تغذیه کند — بدون hardcode پراکنده فقط در یک کامپوننت Next.

## پیش‌نیاز
- فاز 01 کروم (right rail / top bar جای Page settings)
- `PageConfigSchema` در `@vdb/document-schema` (`size: A4|A3`)
- قوانین: `07-document-editor.mdc`، rule صفحه‌ساز 29، IA ادیتور
- Export امروز از `body.page.size` می‌خواند (`export.service`)

## دامنه Full-Stack
- Database: ندارد مگر migration معنایی schema
- Shared: اگر سایز جدید اضافه می‌کنی → `document-schema` + bump نسخه در صورت breaking + مصرف‌کنندگان Nest/Next
- Backend: اطمینان که validate/parse و PDF renderer سایز را می‌فهمند (امروز A4|A3)
- Frontend: UI پریست در Page settings (بدون selection یا تب Document/Page)
- Docs: اگر enum عوض شد → `docs/api` در صورت expose؛ ADR کوتاه فقط اگر سایز سفارشی mm اضافه می‌کنی

## معیار تموم شدن (DoD)
- [ ] UI انتخاب سایز واضح با لیبل کاربر (نه فقط کد فنی) + ابعاد تقریبی برای اطمینان
- [ ] تغییر `page.size` در store با undo
- [ ] Autosave body شامل page جدید
- [ ] HTML preview ابعاد منطقی با سایز عوض می‌شود (حداقل در تسک 03 کامل می‌شود؛ اینجا wiring)
- [ ] PDF export همان سایز را استفاده می‌کند (رگرسیون نشکند)
- [ ] i18n fa/en؛ dark/light؛ disable در bodyLock/!writable
- [ ] لیست پریست از یک منبع مشترک (const در shared یا schema) نه magic string پراکنده

## پرامپت اجرا

```
طبق `.cursor/rules/` و PageConfig در document-schema عمل کن. پیش‌نیاز: کروم فاز 01.

تسک: UI پریست اندازهٔ صفحه سند را Full-Stack هم‌تراز schema/export پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست؛ محل UI را طبق IA (Page settings در right rail وقتی چیزی انتخاب نشده، و/یا کنترل Top bar Page) انتخاب کن — شلوغ نکن.
2) منبع حقیقت سایزها را متمرکز کن (مثلاً export از schema یا packages/shared-types/document-schema). امروز حداقل A4 و A3؛ اگر سایز بیشتری می‌خواهی:
   - اول schema + parse + PDF renderer port را گسترش بده
   - DOCUMENT_SCHEMA_VERSION را در صورت incompatible bump کن و در docs یادداشت بگذار
3) کنترل UI: segmented یا select با نام ترجمه‌شده + زیر‌نویس ابعاد mm.
4) setPageConfig در editor store (یا معادل) با push undo history مثل سایر mutationها.
5) bodyLocked / !writable → disable.
6) i18n fa+en.
7) تست دستی: عوض کردن A4↔A3، autosave، باز کردن مجدد سند.
8) canvas paper frame دقیق را به تسک 03 واگذار کن ولی داده را درست بنویس.
9) JSON خام به کاربر نشان نده.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
