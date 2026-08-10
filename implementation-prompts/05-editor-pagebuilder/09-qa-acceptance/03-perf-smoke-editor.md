# P05-T09-03 — Smoke عملکرد ادیتور

## هدف
یک گذر perf smoke مستند (دستی + در صورت امکان اسکریپت سبک) برای ادیتور/preview: زمان باز شدن سند متوسط، سوییچ mode، typing بدون جلق فاجعه، و سقف‌های کیفی — نه بنچمارک آکادمیک.

## پیش‌نیاز
- فاز 06 performance pass انجام‌شده یا هم‌زمان
- سند نمونه با چند صفحه / repeater در seed یا دستور ساخت
- روبریک delight بُعد Fluidity

## دامنه Full-Stack
- Docs: `docs/qa/editor-pagebuilder-perf-smoke.md`
- اختیاری: اسکریپت node که فقط API latency GET document / preview enqueue را اندازه می‌گیرد
- بدون افزودن APM اجباری

## معیار تموم شدن (DoD)
- [ ] سناریوهای اندازه‌گیری با آستانهٔ کیفی (مثلاً باز شدن UI < 3s حسّی روی dev شناخته‌شده)
- [ ] فهرست anti-patterns که باید رد شوند (paginate هر keystroke بدون debounce، fetch collections تکراری، …)
- [ ] نتیجهٔ یک اجرای نمونه در Notes قالب
- [ ] پیوند به acceptance checklist

## پرامپت اجرا

```
طبق فاز 06 perf و hardening ذهنیت عمل کن. ابزار سنگین profiling در CI اجباری نیست.

تسک: سند + روش smoke عملکرد ادیتور صفحه‌ساز را تحویل بده.

الزامات:
1) `docs/qa/editor-pagebuilder-perf-smoke.md` شامل:
   - سخت‌افزار/محیط مرجع (کلی)
   - سناریو A: باز کردن سند N بلوکی
   - سناریو B: 20 keystroke متن + مشاهدهٔ network/paginate
   - سناریو C: سوییچ edit↔htmlPreview↔pdfPreview
   - سناریو D: enqueue preview در حالی که جاب قبلی تمام شده
   - آستانه‌های Fail واضح (کیفی OK)
2) اختیاری: اسکریپت latency API در scripts/e2e یا scripts/perf.
3) اگر در کد هنوز anti-pattern دیدی، یا در همین تسک bugfix کوچک بزن یا به عنوان blocker در checklist ثبت کن — scope creep بزرگ نکن.
4) لینک از acceptance و overview فاز 09.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
