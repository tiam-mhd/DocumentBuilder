# P05-T05-01 — Schema ردیف/ستون در Flow (+ نسخه)

## هدف
مدل دادهٔ رسمی **row/columns** (یا تصمیم ADR معادل) را در `@vdb/document-schema` پیاده کن: validate، registry، collect modules، clone، fail-safe اسناد قدیمی، و در صورت نیاز bump `DOCUMENT_SCHEMA_VERSION` — بدون UI کامل (حداقل fixture تست).

## پیش‌نیاز
- اجرای `P05-T00-02` → ADR `035-editor-flow-columns` (یا شمارهٔ نهایی) باید Accepted باشد؛ اگر نیست ابتدا ADR را قفل کن
- `13-templates-blocks.mdc`، `07-document-editor.mdc`، rule 29
- ADR 017 pagination هم‌زیستی

## دامنه Full-Stack
- Shared: `packages/document-schema` (+ تست واحد اگر در پکیج هست)
- Backend: parseTemplateBody/parseDocumentBody مسیرهای موجود باید type جدید را بپذیرند؛ OpenAPI اگر block registry از API لیست می‌شود هم‌تراز
- Frontend: فعلاً فقط type در registry دیده شود کافی است؛ UI عمیق تسک 02
- Docs: ADR consequences واقعی؛ note در docs اگر version bump؛ rules بلوک‌های core اگر لیست type عوض شد

## معیار تموم شدن (DoD)
- [ ] Type(های) پایدار مطابق ADR (مثلاً `row` + `column` یا layout روی section)
- [ ] Zod superRefine: تعداد ستون، مجموع عرض، nesting limits
- [ ] `getBlockRegistry()` / CORE لیست به‌روز؛ labelKey i18n keys اضافه‌شده در fa/en
- [ ] clone / collectRequiredModuleCodes / visibility walk درخت را می‌فهمند
- [ ] اسناد بدون row همچنان parse می‌شوند
- [ ] absolute x/y اضافه نشده
- [ ] تست parse برای fixture معتبر و نامعتبر
- [ ] docs/api registry اگر expose می‌شود

## پرامپت اجرا

```
طبق ADR جریان-ستون (035 یا معادل Accepted) و `.cursor/rules/` عمل کن. UI کامل نساز.

تسک: schema و رجیستری row/columns را Full-Stack در لایهٔ schema (+ مصرف parse API) پیاده کن.

الزامات:
1) ADR را بخوان و عیناً پیاده کن؛ اگر ابهام دارد اول ADR را با پاراگراف Decision تکمیل کن نه کد سلیقه‌ای.
2) Block types جدید یا گسترش section — فقط مسیر ADR.
3) عرض ستون: fractions یا % طبق ADR؛ validate مجموع ≈ 1 یا 100.
4) Nesting: حداکثر عمق و ممنوعیت‌ها را در superRefine enforce کن.
5) DOCUMENT_SCHEMA_VERSION: اگر breaking است bump + یادداشت docs؛ اگر additive با default است توضیح بده.
6) update `13-templates-blocks` یا rule 29 با نام typeهای جدید اگر لیست core عوض شد.
7) i18n keys برای label پالت (fa+en) حتی قبل از UI کامل.
8) تست واحد parse؛ unknown قدیمی fail-safe.
9) PDF/HTML renderer را فقط در حد «نشکند / skip امن» اگر لازم؛ تراز بصری کامل تسک 03.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
