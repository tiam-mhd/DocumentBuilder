# P01-T16 — Master Page / Header / Footer / Page Number

## هدف
Master page با هدر/فوتر تکرارشونده و شماره صفحه در مدل سند و preview.

## پیش‌نیاز
- `15-editor-shell-flow.md`

## دامنه Full-Stack
- Schema: master definitions در document/template
- Backend: پشتیبانی ذخیره/خواندن masters
- Frontend: UI اتصال صفحه به master + preview
- Docs: schema + api

## معیار تموم شدن (DoD)
- [ ] تعریف حداقل یک Master
- [ ] صفحات می‌توانند masterId داشته باشند
- [ ] Preview هدر/فوتر/شماره صفحه را نشان می‌دهد
- [ ] آماده برای PDF pipeline

## پرامپت اجرا

```
طبق قوانین Master Page و print عمل کن (Nest/Next/Mongo schema).

تسک: Master Page + Header/Footer + Page Number را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) packages/document-schema را برای masters و page.masterId و pageNumber settings گسترش بده.
3) Editor UI برای ویرایش هدر/فوتر master و تخصیص به صفحات.
4) Preview صحیح؛ ذخیره‌سازی در Mongo body.
5) docs/api/schema notes.
6) هنوز Final PDF را در تسک 17 کامل کن؛ اینجا قرارداد رندر را ثابت کن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
