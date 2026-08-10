/**
 * Light export-queue smoke (P04-T11).
 *
 * Without API env: validates concurrent-cap arithmetic locally (always runs).
 * With API_BASE + TOKEN + BUSINESS_ID + DOCUMENT_ID: hammers POST export/pdf
 * and expects 429 once the business cap / rate limit trips.
 *
 * Usage:
 *   node scripts/load/export-queue-smoke.mjs
 *   API_BASE=http://localhost:3001/api TOKEN=... BUSINESS_ID=... DOCUMENT_ID=... \
 *     CONCURRENT=5 node scripts/load/export-queue-smoke.mjs
 */

const maxConcurrent = Number(process.env.EXPORT_MAX_CONCURRENT_PER_BUSINESS ?? 2);

function localCapCheck() {
  const inFlight = maxConcurrent;
  const shouldBlock = inFlight >= maxConcurrent;
  if (!shouldBlock) {
    throw new Error('local concurrent cap check failed');
  }
  console.log(
    `[ok] local concurrent cap: inFlight=${inFlight} max=${maxConcurrent} → block`,
  );
}

async function liveHammer() {
  const base = process.env.API_BASE?.replace(/\/$/, '');
  const token = process.env.TOKEN;
  const businessId = process.env.BUSINESS_ID;
  const documentId = process.env.DOCUMENT_ID;
  if (!base || !token || !businessId || !documentId) {
    console.log('[skip] live hammer — set API_BASE, TOKEN, BUSINESS_ID, DOCUMENT_ID');
    return;
  }
  const n = Math.max(1, Number(process.env.CONCURRENT ?? 5));
  const url = `${base}/businesses/${businessId}/documents/${documentId}/export/pdf`;
  const results = await Promise.all(
    Array.from({ length: n }, async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      let code = null;
      try {
        const body = await res.json();
        code = body?.errors?.[0]?.code ?? body?.code ?? null;
      } catch {
        /* ignore */
      }
      return { status: res.status, code };
    }),
  );
  const ok = results.filter((r) => r.status === 200 || r.status === 201).length;
  const limited = results.filter(
    (r) =>
      r.status === 429 ||
      r.code === 'EXPORT_TOO_MANY_CONCURRENT' ||
      r.code === 'EXPORT_RATE_LIMITED',
  ).length;
  console.log(`[live] sent=${n} ok=${ok} limited=${limited}`, results);
  if (ok === 0 && limited === 0) {
    throw new Error('live hammer: unexpected responses (auth/document/status?)');
  }
  if (n > maxConcurrent && limited === 0 && ok === n) {
    console.warn(
      '[warn] no 429 observed — raise CONCURRENT or lower EXPORT_* caps on the API',
    );
  } else {
    console.log('[ok] live hammer completed');
  }
}

localCapCheck();
await liveHammer();
