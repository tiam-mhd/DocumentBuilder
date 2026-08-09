# P01-T05 — Trial ۷روزه فقط اولین Business

## هدف
تراکنش اتمی PostgreSQL برای Trial اولین Business.

## پیش‌نیاز
- `04-subscription-states.md`

## دامنه Full-Stack
- PostgreSQL: transaction روی user.trialConsumed + subscription
- Backend: Tenancy+Billing
- Frontend: بنر Trial / CTA
- Docs + تست

## معیار تموم شدن (DoD)
- [ ] Business اول → trial ۷روزه اتمی
- [ ] Business بعدی → pending_payment
- [ ] تست خودکار هر دو مسیر
- [ ] UI شفاف fa/en

## پرامپت اجرا

```
طبق قانون Trial در `.cursor/rules/` عمل کن (Nest + PostgreSQL).

تسک: Trial ۷روزه فقط کسب‌وکار اول را Full-Stack و اتمی پیاده کن.

الزامات:
1) تحلیل + تسک‌لیست.
2) در create Business: transaction — اگر !trialConsumed → trial + flag true؛ وگرنه pending_payment.
3) تست e2e/unit دو مسیر.
4) UI بنر و CTA.
5) docs به‌روز.
6) از MySQL/Laravel استفاده نکن.

پایان: تموم شد یا تموم نشد + مرحله بعدی.
```
