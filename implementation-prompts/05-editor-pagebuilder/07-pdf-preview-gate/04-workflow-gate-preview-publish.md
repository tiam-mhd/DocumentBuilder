# P05-T07-04 — اتصال Workflow: دیدن قبل از Publish

## هدف
در مسیر approval (draft→review→approved→published)، قبل از publish (و در صورت تصمیم محصول قبل از submit) کاربر تشویق یا ملزم به **حداقل یک PDF preview موفق از نسخهٔ فعلی** شود — بدون دور زدن سرور.

## پیش‌نیاز
- ADR 021؛ WorkflowPanel
- Preview API+UI (۰۱–۰۳)
- تصمیم ADR preview دربارهٔ وضعیت‌های مجاز

## دامنه Full-Stack
- Backend اختیاری: فلگ `requirePreviewBeforePublish` یا چک آخرین preview job hash === current body — فقط اگر ADR/محصول الزام سخت می‌خواهد؛ وگرنه soft-gate فقط UI
- Frontend: WorkflowPanel CTA و بنر
- Docs: رفتار در ADR 021 یا 036
- Audit اختیاری: event که preview قبل از publish دیده شد

## معیار تموم شدن (DoD)
- [ ] از Workflow: دکمه/لینک «اول پیش‌نمایش PDF را ببین»
- [ ] Soft gate (حداقل): هشدار اگر preview ندارد یا stale قبل از publish
- [ ] Hard gate فقط اگر صریحاً در ADR آمده + enforce سرور
- [ ] published/locked: preview مشاهده همچنان ممکن
- [ ] i18n؛ بدون شکستن مسیر approve/reject موجود
- [ ] docs به‌روز

## پرامپت اجرا

```
طبق ADR 021 و ADR PDF preview عمل کن. محصول پیش‌فرض: soft-gate قوی + hard فقط با ADR.

تسک: اتصال پیش‌نمایش PDF به مسیر انتشار/workflow را پیاده کن.

الزامات:
1) تحلیل WorkflowPanel + تسک‌لیست.
2) قبل از publish (و اختیاری submit): اگر آخرین preview برای body فعلی completed نیست، Modal تأیید «بدون پیش‌نمایش ادامه می‌دهید؟» یا مسدود نرم.
3) اگر hard gate می‌سازی: API publish باید چک کند و کد خطای واضح برگرداند + OpenAPI.
4) میانبر: از modal مستقیم mode=pdfPreview و enqueue راهنمایی شود.
5) Audit: اگر آسان است preview.viewed / publish.without_preview را ثبت کن بدون PII محتوا.
6) fa+en؛ تست دستی مسیر draft→preview→publish.
7) share/web-publish را بی‌جهت قاطی نکن مگر یک CTA مفید.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
