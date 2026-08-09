# P00-T09 — اسکریپت‌ها، lint، کیفیت و docker-compose دیتااستورها

## هدف
DX پایه + بالا آوردن PostgreSQL/Redis/MongoDB برای توسعه محلی.

## پیش‌نیاز
- تسک‌های 02 و 03

## دامنه Full-Stack
- Database: docker-compose برای PG + Redis + Mongo
- Backend/Frontend: lint/test/typecheck
- Docs: Development در README

## معیار تموم شدن (DoD)
- [ ] docker-compose.yml برای سه دیتااستور
- [ ] اسکریپت‌های install/dev/test/lint مستند
- [ ] حداقل یک تست Nest و typecheck Next سبز
- [ ] فاز 00 از نظر زیرساخت بسته است

## پرامپت اجرا

```
طبق `.cursor/rules/` و استک قفل Nest/Next/PG/Redis/Mongo عمل کن.

تسک: DX و docker-compose دیتااستورها را تمام کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) docker-compose: PostgreSQL، Redis، MongoDB با volume و پورت‌های مستند در .env.example.
3) اسکریپت‌های ریشه/پکیج: api:dev، web:dev، test، lint، migrate.
4) حداقل یک e2e/unit برای health و tsc وب.
5) README با دستورات واقعی؛ بدون اشاره به Laravel/MySQL به‌عنوان استک اصلی.
6) بعد از این تسک فاز 01 قابل شروع است.

پایان: اگر فاز Foundation کامل است بگو؛ وگرنه تموم نشد + مرحله بعدی.
```
