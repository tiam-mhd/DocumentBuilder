# P05-T09-04 — ممیزی هم‌ترازی Docs / Rules / OpenAPI / ADR

## هدف
یک ممیزی کتبی که ثابت کند پیاده‌سازی صفحه‌ساز با قوانین، ADRها (ستون، PDF preview)، OpenAPI، و پک پرامپت‌ها هم‌تراز است — فاصله‌ها با وضعیت Open/Won't/Follow-up مشخص شوند.

## پیش‌نیاز
- فازهای کدنویسی 00–08 تا حد اعلام‌شدهٔ محصول انجام شده باشند (ممیزی می‌تواند روی وضعیت فعلی هم اجرا شود و gap report بدهد)
- `docs/api/openapi.yaml`، `.cursor/rules/29-*`، ADR 035/036

## دامنه Full-Stack
- Docs: `docs/qa/editor-pagebuilder-docs-audit.md` (گزارش)
- اصلاحات docs/OpenAPI/rules اگر ناهم‌ترازی کوچک پیدا شد — در همین تسک
- کد رفتار فقط اگر docs دروغ می‌گوید و fix کوچک است؛ در غیر این صورت ticket/follow-up در گزارش

## معیار تموم شدن (DoD)
- [ ] جدول: Capability → Rule/ADR → API → UI → Status
- [ ] لیست gapهای باز با اولویت
- [ ] تأیید که OpenAPI برای preview routes (اگر shipped) وجود دارد
- [ ] تأیید ممنوعیت‌ها: free-canvas، PDF on keystroke، JSON در UI
- [ ] به‌روزرسانی ایندکس ADR/README اگر لینک مرده است

## پرامپت اجرا

```
طبق AGENTS.md و docs/api canonical OpenAPI عمل کن. ممیزی صادقانه؛ سبز کردن جعلی ممنوع.

تسک: ممیزی هم‌ترازی مستندات و قوانین صفحه‌ساز را بنویس و ناهم‌ترازی‌های کوچک docs را رفع کن.

الزامات:
1) پیمایش پک 05 فاز 00–08 و مقایسه با ریپو واقعی.
2) فایل گزارش `docs/qa/editor-pagebuilder-docs-audit.md`.
3) برای هر مورد بحرانی (امنیت، IDOR، rate preview، schema columns): Status Pass یا Gap.
4) اگر OpenAPI عقب است و route در Nest هست → YAML را در همین تسک هم‌تراز کن.
5) اگر rule 29 یا ADR نیست ولی کد آمده → یا docs را بنویس یا Gap قرمز ثبت کن (ترجیح: docs را کامل کن چون فاز 00 برای همین بود).
6) خروجی خلاصه برای signoff تسک 05.
7) تست محصول جدید خارج از ممیزی ننویس.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
