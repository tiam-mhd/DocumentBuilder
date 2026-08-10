# P05-T07-01 — API صف پیش‌نمایش PDF (Enqueue + Caps)

## هدف
بک‌اند کامل برای **PDF Preview** طبق ADR فاز 00: enqueue جدا از (یا متمایز از) export نهایی، ذخیرهٔ فایل، وضعیت جاب، دانلود authenticated، سقف همزمانی/نرخ — بدون render روی مسیر تعاملی ادیتور.

## پیش‌نیاز
- ADR `036-editor-pdf-preview` (یا شمارهٔ نهایی) **Accepted** از `P05-T00-03`
- ADR 007 export pipeline؛ `export_jobs`؛ rule 26
- Entitlements / membership موجود

## دامنه Full-Stack
- Database: migration اگر `purpose`/`kind` روی export_jobs یا جدول جدید طبق ADR
- Backend: Nest routes + service + worker مصرف همان renderer با فلگ preview
- Redis: rate keys جدا یا مشترک طبق ADR
- Env: `.env.example` کلیدهای `EXPORT_PREVIEW_*`
- Docs: `docs/api/openapi.yaml` + README api
- Frontend: ندارد (تسک 02) — حداکثر shared-types برای DTO

## معیار تموم شدن (DoD)
- [ ] POST enqueue preview با businessId + documentId + JWT + membership
- [ ] GET status + GET file (یا الگوی موجود export)
- [ ] تمایز purpose=preview در DB/storage key
- [ ] واترمارک اگر ADR الزام کرده
- [ ] autosave/editor هرگز این endpoint را صدا نمی‌زند در این تسک
- [ ] IDOR: فیلتر businessId
- [ ] تست واحد/e2e API حداقل happy path + rate deny
- [ ] OpenAPI به‌روز

## پرامپت اجرا

```
طبق ADR PDF preview و ADR 007 و hardening 26 و EntitlementGuard عمل کن. UI نساز.

تسک: API و صف پیش‌نمایش PDF را Full-Stack (DB+Nest+Redis+docs+types) پیاده کن.

الزامات:
1) ADR را عیناً پیاده کن؛ انحراف = آپدیت ADR اول.
2) Endpointهای پیشنهادی ADR را بساز (نام‌ها را با سبک موجود `/businesses/:businessId/documents/:documentId/...` هماهنگ کن).
3) Worker: همان HTML→PDF؛ اگر watermark لازم است در HTML پیش از pdf یا لایهٔ جدا طبق ADR.
4) Storage key متمایز؛ TTL/cleanup job یا سند کردن پاکسازی بعدی اگر MVP دستی است.
5) Rate + max concurrent per business؛ خطاهای machine code برای UI بعدی.
6) Idempotency اختیاری طبق ADR (hash body) — اگر پیچیده است MVP بدون و در ADR بنویس Won't موقت.
7) Gate: membership برای preview؛ final export را عوض نکن مگر ADR بگوید.
8) `.env.example` + env.validation.
9) تست: enqueue → completed (fake renderer) → file bytes؛ cross-business 403/404.
10) هرگز از Documents PATCH به صف وصل نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
