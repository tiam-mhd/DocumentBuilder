# P02-T06 — Map Engine (`module.map`)

## هدف
بلوک/صفحه نقشه با Leaflet+OSM، مارکرها از Locations، محدودیت کشور، show/hide.

## پیش‌نیاز
- `05-location-entity.md`

## دامنه Full-Stack
- Module entitlement `module.map`
- Frontend map در editor preview + تنظیمات
- Backend: تنظیمات map در document/template JSON (Mongo)
- Snapshot استاتیک برای PDF (مستند رویکرد)

## پرامپت اجرا

```
طبق module.map و Leaflet+OSM عمل کن. Gate سروری اجباری است.

تسک: Map Engine را Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) Block type map در registry + تنظیمات (center، zoom، markers source، country restriction).
3) EntitlementGuard module.map روی ذخیره تنظیمات پیشرفته و export شامل map اگر لازم.
4) Next: ویرایش تنظیمات + preview Leaflet؛ i18n/theme.
5) استراتژی PDF: static map image یا render HTML — در ADR کوتاه قفل کن.
6) docs/api/schema به‌روز؛ shared-types.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
