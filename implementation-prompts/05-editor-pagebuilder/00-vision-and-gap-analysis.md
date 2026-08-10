# تحلیل چشم‌انداز و شکاف — صفحه‌ساز سند VDB

سند مرجع مرحلهٔ ۱ پک `05-editor-pagebuilder`. مبنای فازبندی و تسک‌نویسی بعدی است. **کدنویسی از این فایل شروع نمی‌شود.**

## ۱) خواستهٔ محصول (از کاربر)

| خواسته | تفسیر اجرایی |
| --- | --- |
| مثل Elementor: جذاب، روان، منعطف | فضای کار سه‌ناحیه + پالت غنی + بوم زنده + inspector عمیق + بازخورد فوری |
| سایزبندی صفحه خروجی | UI و مدل برای `page` (اندازه، جهت، حاشیه، DPI/پرینت) هم‌راستا با PDF |
| ویرایش المان‌ها کامل و مشخص | هر `BlockType` پنل ویژگی شفاف (محتوا + ظاهر + رفتار) |
| UI/UX کامل صفحه‌ساز | حالت‌ها، زوم، انتخاب، DnD، شورتکات، خالی‌بودن هدایت‌شده، خطاهای دوستانه |
| پیش‌نمایش HTML و PDF قبل از انتشار/دانلود | HTML زنده؛ PDF = جاب پیش‌نمایش صف‌شده (نه render روی keystroke) |
| هرآنچه لازم است و کاربر علمش را ندارد | موارد زیر بخش «۳) پیشنهادهای تحلیل» |

## ۲) وضعیت امروز در ریپو

### ۲.۱ مسیر و اجزا

- مسیر: `apps/web/src/features/editor/`
- مسیر UI: `/app/documents/[documentId]` → `EditorShell`
- اجزا: palette، `flow-canvas` (DnD عمودی)، `block-inspector`، `html-preview`، masters، export/workflow/comments/versions/share/web-publish
- Store: Zustand + undo/redo + autosave ~800ms

### ۲.۲ قوت‌ها (نباید از نو اختراع شود)

- جداسازی Data / Template / Document و schema در `@vdb/document-schema`
- Registry بلوک + entitlement ماژول‌ها
- Masters، TOC، QR، repeater، conditional `when`، bindings امن، breakRules، لینک PDF
- صف PDF واقعی (BullMQ + Chromium)
- قفل بدنه هنگام workflow انتشار

### ۲.۳ شکاف‌ها در برابر صفحه‌ساز حرفه‌ای

| حوزه | امروز | هدف صفحه‌ساز |
| --- | --- | --- |
| کروم UX | toolbar نسبتاً ساده / پنل‌های پراکنده | IA شبیه builder: Left / Canvas / Right + حالت Edit vs Preview |
| سایز صفحه | در schema هست؛ UI ادیتور ضعیف/غایب | کنترل واضح A4/A3/سفارشی، جهت، حاشیه، پیش‌نمایش قاب صفحه |
| DnD | فقط reorder سطح صفحه | درگ از پالت به بوم، sortable تودرتو داخل `section`/ستون |
| Inspector | فیلدهای پایه per-type | Design + Content + Advanced (فاصله، تایپو، تراز، لینک، visibility، break) |
| Layout | flow عمودی خالص | انعطاف ستون/گرید **با ADR**؛ free-canvas مطلق پیش‌فرض نیست |
| HTML preview | هست؛ تقریبی | همگام انتخاب، زوم، قاب کاغذ، تفکیک واضح Edit/Preview |
| PDF preview | فقط export نهایی | «پیش‌نمایش PDF» جدا از دانلود نهایی؛ وضعیت جاب؛ واترمارک draft در صورت نیاز |
| Delight | محدود | شورتکات، command palette، snappings/guides منطقی برای flow، empty states، motion هدفمند |
| دسترس‌پذیری | ناقص برای builder | فوکوس کیبورد، aria روی درخت بلوک، contrast در هر دو تم |

## ۳) پیشنهادهای تحلیل (چیزهایی که معمولاً از قلم می‌افتد)

این‌ها باید در فازهای بعدی به تسک تبدیل شوند حتی اگر کاربر نام نبرد:

1. **حالت‌های Editor:** Edit / HTML Preview / PDF Preview — با حفظ selection وقتی ممکن است  
2. **درخت ساختار (Layers):** لیست سلسله‌مراتبی صفحات/بلوک‌ها کنار پالت  
3. **Page navigator:** چند `pages[]` + افزودن/حذف/ترتیب صفحه  
4. **Zoom + fit-to-width** روی بوم کاغذ  
5. **Read-only / writable / body-lock UX** واضح (اشتراک منقضی، سند در review)  
6. **Conflict autosave:** پیام خطای سرور، جلوگیری از overwrite بی‌صدا  
7. **Media picker یکپارچه** برای image/gallery از کتابخانه Business  
8. **Theme tokens زنده** روی بوم (تغییر تم سند بدون ترک ادیتور — حداقل انتخاب theme)  
9. **Validation سطح بلوک** با پیام کاربرپسند (نه Zod خام)  
10. **Performance:** virtualize لیست بلند، جدا کردن preview سنگین از canvas edit  
11. **Telemetry سبک (اختیاری SAAS):** باز شدن ادیتور، مدت session — بدون PII محتوا  
12. **Offline soft:** اگر شبکه قطع شد، صف ذخیره محلی کوتاه + بنر  
13. **RTL canvas:** برای `document.locale=fa` درست؛ جدا از UI locale  
14. **PDF preview quota/rate:** هم‌تراز `EXPORT_*` تا سوءاستفاده نشود  
15. **Diff نسخه / بازگشت امن** از version panel داخل همان IA  
16. **Template vs Document:** اگر از قالب آمده، CTA «ذخیره به‌عنوان قالب» (اختیاری فاز آخر)  
17. **Column/section presets** به‌جای absolute canvas برای حس انعطاف Elementor بدون شکستن قانون flow  
18. **Accessibility + reduced-motion** برای انیمیشن‌های ادیتور  
19. **E2E acceptance** سناریوی «ساخت صفحه A4 → پیش‌نمایش HTML → پیش‌نمایش PDF → انتشار»  
20. **قانون دائمی جدید** در `.cursor/rules/` مخصوص UX صفحه‌ساز (پیشنهاد نام: `29-editor-pagebuilder-ux.mdc`)

## ۴) تنش معماری و تصمیم‌های لازم (فاز 00)

| تنش | قانون فعلی | مسیر پیشنهادی پک |
| --- | --- | --- |
| Absolute free-canvas | ممنوع در MVP (`07-document-editor`) | **غیرهدف** مگر ADR صریح؛ جایگزین = ستون/گرید flow |
| PDF روی تعامل | ممنوع keystroke | Preview PDF = جاب جدا با throttle/نرخ |
| عمق inspector | محدود | گسترش props در schema فقط با version bump در صورت breaking |
| Breakpoints موبایل Elementor | وجود ندارد | سند چاپی‌محور: اولویت کاغذ؛ «عرض وب» فقط برای web-publish preview اختیاری |

## ۵) نگاشت فاز ← شکاف

| فاز | پوشش شکاف |
| --- | --- |
| 00 | قانون UX، ADR ستون/گرید در صورت نیاز، معیار عشق‌وحال |
| 01 | کروم فضای کار Elementor-like |
| 02 | سایزبندی و قاب خروجی |
| 03 | DnD و تعامل بوم |
| 04 | پنل کامل المان‌ها |
| 05 | انعطاف چیدمان (ستون/…) |
| 06 | HTML preview لذت‌بخش |
| 07 | PDF preview قبل از انتشار |
| 08 | بهره‌وری و delight باقی‌مانده |
| 09 | QA / پذیرش |

## ۶) خارج از محدودهٔ این پک (عمدی)

- Marketplace قالب، platform admin، billing دunning  
- DOCX/PPTX export  
- پلاگین third-party با eval  
- ویرایشگر قالب جدا اگر با document یکی شود — فقط در صورت تسک صریح بعدی  

## ۷) تعریف «تموم شدن پک نگارشی»

پک نگارشی وقتی کامل است که:

- [ ] هر فاز `00-phase-overview.md` نهایی داشته باشد  
- [ ] هر تسک فایل کامل با پرامپت اجرا داشته باشد  
- [ ] هیچ مورد بخش ۳ بدون تسک یا «Won't با دلیل» نماند  
- [ ] README ریشهٔ `implementation-prompts` به این پک لینک دهد  

کدنویسی محصول جدا از «کامل شدن نگارش» است و پس از تأیید شما فازبه‌فاز اجرا می‌شود.
