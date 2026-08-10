# P05-T09-05 — خروج فاز و Signoff آمادگی صفحه‌ساز

## هدف
سند پایانی که وضعیت پک `05-editor-pagebuilder` را جمع می‌کند: چه چیزی Accepted است، چه Follow-up مانده، آیا مسیر طلایی و ممیزی سبز است، و آیا کاتالوگ نگارشی کامل اعلام می‌شود — آماده برای اجرای باقیمانده یا اعلام Done محصولی.

## پیش‌نیاز
- `01`…`04` همین فاز (checklist، e2e، perf، audit) حداقل نوشته/اجرا شده
- Delight rubric امتیازدهی شده یا صریحاً Deferred با دلیل

## دامنه Full-Stack
- Docs: `docs/qa/editor-pagebuilder-signoff.md`
- به‌روزرسانی `implementation-prompts/05-editor-pagebuilder/README.md` وضعیت کاتالوگ → کامل
- به‌روزرسانی `implementation-prompts/README.md` ردیف فاز 05
- کد الزامی نیست

## معیار تموم شدن (DoD)
- [ ] Signoff با تاریخ، محیط، مسئول (نام نقش کافی است)
- [ ] نتیجهٔ E2E و checklist خلاصه
- [ ] امتیاز روبریک یا وضعیت N/A
- [ ] لیست Won't / Later صریح (مثلاً absolute canvas، breakpoints موبایل Elementor)
- [ ] اعلام: «کاتالوگ پرامپت پک 05 نگارشی کامل است»
- [ ] اگر پیاده‌سازی ناقص است: درصد/فاز باقیمانده بدون مبهم‌گویی

## پرامپت اجرا

```
طبق تمام docs/qa صفحه‌ساز که در این فاز ساخته شد عمل کن. صادق باش.

تسک: سند signoff خروج صفحه‌ساز را بنویس و وضعیت کاتالوگ پک را نهایی کن.

الزامات:
1) `docs/qa/editor-pagebuilder-signoff.md` با بخش‌های: Scope shipped / Evidence (لینک checklist, e2e, perf, audit) / Delight score / Open gaps / Decision (Accept | Accept with follow-ups | Reject).
2) README پک 05 را به وضعیت «کاتالوگ نگارشی کامل» آپدیت کن؛ جدول فازها همه «پرامپت‌ها کامل».
3) README ریشهٔ implementation-prompts را برای ردیف 05-editor-pagebuilder به‌روز کن (تعداد تسک تقریبی + وضعیت).
4) اگر Reject: دقیق بگو کدام فاز کدنویسی باید برگردد.
5) جشن بی‌دلیل بدون evidence ننویس.
6) کد فیچر جدید نزن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
