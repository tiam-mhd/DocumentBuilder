#!/usr/bin/env node
/**
 * P01-T18 — SAAS funnel E2E (API)
 *
 * Prerequisites:
 *   - docker:up (Postgres + Redis + Mongo)
 *   - apps/api running with APP_EDITION=SAAS, SMS_PROVIDER=fake, PAYMENT_PROVIDER=fake, PDF_RENDERER=fake
 *   - npm run db:seed (plan.core with export.pdf)
 *
 * Usage:
 *   npm run test:e2e:saas
 *   API_BASE_URL=http://localhost:3001/api node scripts/e2e/saas-funnel.mjs
 */

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);

const PLAN_CORE = 'plan.core';
const EXPORT_PDF = 'export.pdf';

/** @typedef {{ ok: true, status: number, data: any } | { ok: false, status: number, code?: string, message?: string, raw: any }} ApiResult */

function log(step, detail) {
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`✓ ${step}${suffix}`);
}

function fail(step, detail) {
  console.error(`✗ ${step}${detail ? ` — ${detail}` : ''}`);
  process.exitCode = 1;
  throw new Error(`${step}: ${detail || 'failed'}`);
}

function assert(cond, step, detail) {
  if (!cond) fail(step, detail);
}

async function api(method, path, { token, body, headers } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    fail(
      'API unreachable',
      `${API_BASE} (${reason}). Start Docker stores + npm run api:dev (see docs/qa/phase-01-saas-acceptance.md)`,
    );
  }

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { rawText: text };
  }

  if (res.ok) {
    return { ok: true, status: res.status, data: json?.data ?? json };
  }

  const err = Array.isArray(json?.errors) ? json.errors[0] : null;
  return {
    ok: false,
    status: res.status,
    code: err?.code ?? json?.code,
    message: err?.message ?? json?.message,
    raw: json,
  };
}

function uniqueMobile() {
  const n = String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 10));
  return `09${n}`;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function pollExport(token, businessId, jobId, { timeoutMs = 45000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = await api('GET', `/businesses/${businessId}/exports/${jobId}`, {
      token,
    });
    assert(job.ok, 'poll export', job.code || String(job.status));
    if (job.data.status === 'completed') return job.data;
    if (job.data.status === 'failed') {
      fail(
        'export failed',
        `${job.data.errorCode || ''} ${job.data.errorMessage || ''}`.trim(),
      );
    }
    await sleep(1500);
  }
  fail('export timeout', `job ${jobId} not completed in ${timeoutMs}ms`);
}

async function main() {
  console.log(`SAAS funnel E2E → ${API_BASE}\n`);

  // 0) Health + edition
  const health = await api('GET', '/health');
  assert(health.ok, 'health', JSON.stringify(health.raw || health.data));
  log('health', health.data?.status ?? 'ok');

  const config = await api('GET', '/system/config');
  assert(config.ok, 'system config');
  assert(
    config.data.edition === 'SAAS',
    'edition',
    `expected SAAS got ${config.data.edition}`,
  );
  assert(config.data.publicSignup === true, 'publicSignup', 'expected true on SAAS');
  log('edition', 'SAAS + publicSignup');

  // 1) OTP signup (fake SMS → devCode)
  const mobile = uniqueMobile();
  const otpReq = await api('POST', '/auth/otp/request', { body: { mobile } });
  assert(otpReq.ok, 'otp request', otpReq.code || String(otpReq.status));
  assert(
    typeof otpReq.data.devCode === 'string' && otpReq.data.devCode.length >= 4,
    'otp devCode',
    'SMS_PROVIDER=fake and NODE_ENV=development required',
  );
  log('otp request', mobile);

  const verify = await api('POST', '/auth/otp/verify', {
    body: { mobile, code: otpReq.data.devCode },
  });
  assert(verify.ok, 'otp verify', verify.code || String(verify.status));
  const token = verify.data.accessToken;
  assert(typeof token === 'string', 'accessToken');
  log('otp verify', verify.data.user?.id);

  // 2) First business → trial
  const biz1 = await api('POST', '/businesses', {
    token,
    body: { name: `E2E Trial Co ${Date.now()}` },
  });
  assert(biz1.ok, 'create business#1', biz1.code || String(biz1.status));
  const businessId = biz1.data.id;
  log('business#1', businessId);

  const sub1 = await api('GET', `/businesses/${businessId}/subscription`, {
    token,
  });
  assert(sub1.ok, 'subscription#1');
  assert(
    sub1.data.effectiveStatus === 'trial' || sub1.data.status === 'trial',
    'trial status',
    JSON.stringify(sub1.data),
  );
  assert(sub1.data.writable === true, 'trial writable');
  log('trial', sub1.data.effectiveStatus);

  const ents1 = await api('GET', `/businesses/${businessId}/entitlements`, {
    token,
  });
  assert(ents1.ok, 'entitlements#1');
  assert(
    Array.isArray(ents1.data.codes) && ents1.data.codes.includes(EXPORT_PDF),
    'export.pdf on trial',
    'run npm run db:seed so plan.core includes export.pdf',
  );
  log('entitlements', ents1.data.codes.join(','));

  // 3) Template → document → export (trial)
  const tpl = await api('POST', `/businesses/${businessId}/templates`, {
    token,
    body: {
      name: 'E2E قالب فارسی',
      description: 'قیف SAAS',
    },
  });
  assert(tpl.ok, 'create template', tpl.code || String(tpl.status));
  const templateId = tpl.data.id;
  log('template', templateId);

  const doc = await api('POST', `/businesses/${businessId}/documents`, {
    token,
    body: {
      title: 'سند آزمایشی فارسی',
      templateId,
    },
  });
  assert(doc.ok, 'create document', doc.code || String(doc.status));
  const documentId = doc.data.id;
  log('document', documentId);

  // Seed a Persian text block so HTML renderer path is exercised
  const body = doc.data.body;
  if (body?.pages?.[0]) {
    body.pages[0].blocks = [
      {
        id: `txt_${Date.now()}`,
        type: 'text',
        props: { content: 'سلام دنیا — قیف SAAS' },
      },
    ];
    const patched = await api(
      'PATCH',
      `/businesses/${businessId}/documents/${documentId}`,
      { token, body: { body } },
    );
    assert(patched.ok, 'patch document body', patched.code || String(patched.status));
    log('document body', 'Persian text block');
  }

  const exportJob = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/export/pdf`,
    { token },
  );
  assert(exportJob.ok, 'export enqueue (trial)', exportJob.code || String(exportJob.status));
  const completed = await pollExport(token, businessId, exportJob.data.id);
  assert(completed.downloadUrl, 'export downloadUrl');
  log('export (trial)', completed.status);

  const pdfRes = await fetch(`${API_BASE}${completed.downloadUrl}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(pdfRes.ok, 'download pdf', String(pdfRes.status));
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  assert(pdfBuf.subarray(0, 5).toString('utf8') === '%PDF-', 'pdf magic');
  log('download pdf', `${pdfBuf.byteLength} bytes`);

  // 4) Fake checkout → active
  const checkout = await api(
    'POST',
    `/businesses/${businessId}/billing/checkout`,
    {
      token,
      body: { planCode: PLAN_CORE, moduleCodes: [] },
      headers: { 'Idempotency-Key': `e2e-${Date.now()}` },
    },
  );
  assert(checkout.ok, 'checkout', checkout.code || String(checkout.status));
  assert(checkout.data.paymentId, 'paymentId');
  assert(checkout.data.gatewayRef, 'gatewayRef');
  log('checkout', checkout.data.paymentId);

  const webhook = await api('POST', '/billing/webhooks/payment', {
    body: {
      Authority: checkout.data.gatewayRef,
      paymentId: checkout.data.paymentId,
      Status: 'OK',
    },
  });
  assert(webhook.ok, 'payment webhook', webhook.code || String(webhook.status));
  log('payment confirmed', webhook.data?.payment?.status ?? 'ok');

  const subPaid = await api('GET', `/businesses/${businessId}/subscription`, {
    token,
  });
  assert(subPaid.ok, 'subscription after pay');
  assert(
    subPaid.data.effectiveStatus === 'active' || subPaid.data.status === 'active',
    'active status',
    JSON.stringify(subPaid.data),
  );
  log('subscription', 'active');

  const exportPaid = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/export/pdf`,
    { token },
  );
  assert(exportPaid.ok, 'export enqueue (active)', exportPaid.code || String(exportPaid.status));
  await pollExport(token, businessId, exportPaid.data.id);
  log('export (active)', 'completed');

  // 5) Business #2 → pending_payment → deny mutate/export
  const biz2 = await api('POST', '/businesses', {
    token,
    body: { name: `E2E Locked Co ${Date.now()}` },
  });
  assert(biz2.ok, 'create business#2', biz2.code || String(biz2.status));
  const businessId2 = biz2.data.id;
  log('business#2', businessId2);

  const sub2 = await api('GET', `/businesses/${businessId2}/subscription`, {
    token,
  });
  assert(sub2.ok, 'subscription#2');
  assert(
    sub2.data.effectiveStatus === 'pending_payment' ||
      sub2.data.status === 'pending_payment',
    'pending_payment',
    JSON.stringify(sub2.data),
  );
  assert(sub2.data.writable === false, 'biz2 not writable');
  log('business#2 status', 'pending_payment (locked)');

  const denyTpl = await api('POST', `/businesses/${businessId2}/templates`, {
    token,
    body: { name: 'should-fail' },
  });
  assert(!denyTpl.ok, 'biz2 mutate should fail');
  assert(denyTpl.status === 402, 'biz2 mutate status', String(denyTpl.status));
  assert(
    denyTpl.code === 'SUBSCRIPTION_NOT_WRITABLE',
    'biz2 mutate code',
    denyTpl.code,
  );
  log('biz2 mutate denied', denyTpl.code);

  // Need a document id on biz2 to hit export — create is also gated, so use export on a fake id
  // or gate probe. Prefer gate probe export-pdf if available.
  const denyExport = await api(
    'POST',
    `/businesses/${businessId2}/gates/export-pdf`,
    { token },
  );
  assert(!denyExport.ok, 'biz2 export gate should fail');
  assert(denyExport.status === 402, 'biz2 export status', String(denyExport.status));
  assert(
    denyExport.code === 'SUBSCRIPTION_NOT_WRITABLE',
    'biz2 export code',
    denyExport.code,
  );
  log('biz2 export denied', denyExport.code);

  console.log('\nSAAS funnel E2E passed.');
}

main().catch((err) => {
  console.error('\nSAAS funnel E2E failed:', err.message || err);
  process.exit(1);
});
