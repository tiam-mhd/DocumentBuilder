# P02-T05 — Location Entity مشترک

## هدف
موجودیت Location یکتا برای هر چیزی که جغرافیا دارد (پروژه، شعبه، …).

## پیش‌نیاز
- Team/Branches و Projects حداقل stub location

## دامنه Full-Stack
- PostgreSQL: locations (country، province، city، address، lat، lng، businessId)
- اتصال FK از entities
- Docs: docs/api

## پرامپت اجرا

```
طبق Brief Location Entity و معماری Map عمل کن (Nest/Next/PG).

تسک: Location را به‌عنوان Entity مشترک Full-Stack پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) مدل locations + API CRUD؛ validation مختصات.
3) اتصال به projects/branches (و سایرین در صورت وجود).
4) UI انتخاب/ثبت مکان؛ i18n.
5) docs/api. هنوز رندر نقشه در تسک بعد.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
