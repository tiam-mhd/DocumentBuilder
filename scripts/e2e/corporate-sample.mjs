#!/usr/bin/env node
/**
 * P02-T14 — Corporate sample E2E (API)
 *
 * Builds a tender-style sample: projects + map + org chart + timeline + TOC +
 * repeater, exports PDF with modules enabled, then denies map when module.map
 * is missing.
 *
 * Prerequisites:
 *   - docker:up (Postgres + Redis + Mongo)
 *   - apps/api running with APP_EDITION=SAAS, SMS_PROVIDER=fake,
 *     PAYMENT_PROVIDER=fake, PDF_RENDERER=fake, NODE_ENV=development
 *   - npm run db:seed (plan.core + corporate modules)
 *
 * Usage:
 *   npm run test:e2e:corporate
 *   API_BASE_URL=http://localhost:3001/api node scripts/e2e/corporate-sample.mjs
 */

import {
  buildCorporateDocumentBody,
  buildMapOnlyDocumentBody,
} from './fixtures/corporate-document-body.mjs';

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);

const PLAN_CORE = 'plan.core';
const MODULES = [
  'module.map',
  'module.org_chart',
  'module.timeline',
  'module.projects',
];

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
      `${API_BASE} (${reason}). Start Docker + npm run api:dev (see docs/qa/phase-02-corporate-acceptance.md)`,
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

async function otpLogin() {
  const mobile = uniqueMobile();
  const otpReq = await api('POST', '/auth/otp/request', { body: { mobile } });
  assert(otpReq.ok, 'otp request', otpReq.code || String(otpReq.status));
  assert(
    typeof otpReq.data.devCode === 'string' && otpReq.data.devCode.length >= 4,
    'otp devCode',
    'SMS_PROVIDER=fake and NODE_ENV=development required',
  );
  const verify = await api('POST', '/auth/otp/verify', {
    body: { mobile, code: otpReq.data.devCode },
  });
  assert(verify.ok, 'otp verify', verify.code || String(verify.status));
  const token = verify.data.accessToken;
  assert(typeof token === 'string', 'accessToken');
  return { token, mobile, userId: verify.data.user?.id };
}

async function pollExport(token, businessId, jobId, { timeoutMs = 60000 } = {}) {
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

async function checkoutWithModules(token, businessId, moduleCodes) {
  const checkout = await api('POST', `/businesses/${businessId}/billing/checkout`, {
    token,
    body: { planCode: PLAN_CORE, moduleCodes },
    headers: { 'Idempotency-Key': `corp-e2e-${Date.now()}-${Math.random()}` },
  });
  assert(checkout.ok, 'checkout', checkout.code || String(checkout.status));
  assert(checkout.data.paymentId, 'paymentId');
  assert(checkout.data.gatewayRef, 'gatewayRef');

  const webhook = await api('POST', '/billing/webhooks/payment', {
    body: {
      Authority: checkout.data.gatewayRef,
      paymentId: checkout.data.paymentId,
      Status: 'OK',
    },
  });
  assert(webhook.ok, 'payment webhook', webhook.code || String(webhook.status));
  return checkout.data;
}

async function seedCorporateData(token, businessId) {
  const loc = await api('POST', `/businesses/${businessId}/locations`, {
    token,
    body: {
      name: 'دفتر تهران',
      country: 'IR',
      city: 'تهران',
      lat: 35.6892,
      lng: 51.389,
    },
  });
  assert(loc.ok, 'create location', loc.code || String(loc.status));

  const ceo = await api('POST', `/businesses/${businessId}/team-members`, {
    token,
    body: {
      name: 'مدیرعامل نمونه',
      roleTitle: 'CEO',
      department: 'مدیریت',
      sortOrder: 0,
    },
  });
  assert(ceo.ok, 'create team CEO', ceo.code || String(ceo.status));

  const eng = await api('POST', `/businesses/${businessId}/team-members`, {
    token,
    body: {
      name: 'مدیر فنی',
      roleTitle: 'CTO',
      department: 'فنی',
      parentMemberId: ceo.data.id,
      sortOrder: 1,
    },
  });
  assert(eng.ok, 'create team CTO', eng.code || String(eng.status));

  const cat = await api('POST', `/businesses/${businessId}/project-categories`, {
    token,
    body: { name: 'عمرانی', sortOrder: 0 },
  });
  assert(cat.ok, 'create project category', cat.code || String(cat.status));

  const proj = await api('POST', `/businesses/${businessId}/projects`, {
    token,
    body: {
      title: 'پروژه نمونه مناقصه',
      description: 'نمونه فاز Corporate',
      categoryId: cat.data.id,
      status: 'published',
    },
  });
  assert(proj.ok, 'create project', proj.code || String(proj.status));

  const proj2 = await api('POST', `/businesses/${businessId}/projects`, {
    token,
    body: {
      title: 'پروژه دوم',
      description: 'برای repeater',
      status: 'draft',
    },
  });
  assert(proj2.ok, 'create project#2', proj2.code || String(proj2.status));

  const tl = await api('POST', `/businesses/${businessId}/timeline-events`, {
    token,
    body: {
      occurredAt: '2018-03-21T00:00:00.000Z',
      title: 'تأسیس شرکت',
      body: 'شروع فعالیت',
      sortOrder: 0,
    },
  });
  assert(tl.ok, 'create timeline event', tl.code || String(tl.status));

  const tl2 = await api('POST', `/businesses/${businessId}/timeline-events`, {
    token,
    body: {
      occurredAt: '2024-01-10T00:00:00.000Z',
      title: 'گسترش شعب',
      body: 'افزایش پوشش جغرافیایی',
      sortOrder: 1,
    },
  });
  assert(tl2.ok, 'create timeline event#2', tl2.code || String(tl2.status));

  log('sample data', 'location + team + projects + timeline');
  return {
    locationId: loc.data.id,
    ceoId: ceo.data.id,
    projectIds: [proj.data.id, proj2.data.id],
  };
}

async function main() {
  console.log(`Corporate sample E2E → ${API_BASE}\n`);

  const health = await api('GET', '/health');
  assert(health.ok, 'health', JSON.stringify(health.raw || health.data));
  log('health', health.data?.status ?? 'ok');

  const config = await api('GET', '/system/config');
  assert(config.ok, 'system config');
  assert(
    config.data.edition === 'SAAS',
    'edition',
    `expected SAAS got ${config.data.edition} (corporate module checkout is SAAS)`,
  );
  log('edition', 'SAAS');

  // --- Allow path: modules ON ---
  const { token, mobile } = await otpLogin();
  log('otp', mobile);

  const biz = await api('POST', '/businesses', {
    token,
    body: { name: `Corporate Sample ${Date.now()}` },
  });
  assert(biz.ok, 'create business', biz.code || String(biz.status));
  const businessId = biz.data.id;
  log('business', businessId);

  await checkoutWithModules(token, businessId, MODULES);
  log('checkout+webhook', MODULES.join(','));

  const ents = await api('GET', `/businesses/${businessId}/entitlements`, {
    token,
  });
  assert(ents.ok, 'entitlements');
  for (const code of MODULES) {
    assert(
      ents.data.codes.includes(code),
      `entitlement ${code}`,
      ents.data.codes.join(','),
    );
  }
  assert(ents.data.writable === true, 'writable after pay');
  log('entitlements', ents.data.codes.join(','));

  await seedCorporateData(token, businessId);

  const tpl = await api('POST', `/businesses/${businessId}/templates`, {
    token,
    body: {
      name: 'قالب شرکتی نمونه',
      description: 'Phase 02 corporate sample',
    },
  });
  assert(tpl.ok, 'create template', tpl.code || String(tpl.status));
  const templateId = tpl.data.id;
  log('template', templateId);

  const doc = await api('POST', `/businesses/${businessId}/documents`, {
    token,
    body: {
      title: 'پروفایل شرکتی نمونه',
      templateId,
    },
  });
  assert(doc.ok, 'create document', doc.code || String(doc.status));
  const documentId = doc.data.id;
  log('document', documentId);

  const corporateBody = buildCorporateDocumentBody({
    businessId,
    documentId,
    templateId,
    title: 'پروفایل شرکتی نمونه',
    base: doc.data.body,
  });

  const patched = await api(
    'PATCH',
    `/businesses/${businessId}/documents/${documentId}`,
    { token, body: { body: corporateBody } },
  );
  assert(patched.ok, 'patch corporate body', patched.code || String(patched.status));
  log('document body', 'toc+projects+map+org+timeline+when');

  const collections = await api(
    'GET',
    `/businesses/${businessId}/collections/projects?limit=10`,
    { token },
  );
  assert(collections.ok, 'collections projects', collections.code);
  assert(
    collections.data.total >= 2,
    'projects total',
    String(collections.data.total),
  );
  log('collections', `projects total=${collections.data.total}`);

  const exportJob = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/export/pdf`,
    { token },
  );
  assert(exportJob.ok, 'export enqueue', exportJob.code || String(exportJob.status));
  const completed = await pollExport(token, businessId, exportJob.data.id);
  assert(completed.downloadUrl, 'export downloadUrl');
  log('export', completed.status);

  const pdfRes = await fetch(`${API_BASE}${completed.downloadUrl}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(pdfRes.ok, 'download pdf', String(pdfRes.status));
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  assert(pdfBuf.subarray(0, 5).toString('utf8') === '%PDF-', 'pdf magic');
  log('download pdf', `${pdfBuf.byteLength} bytes`);

  // --- Deny path: module.map OFF ---
  const denyAuth = await otpLogin();
  log('deny otp', denyAuth.mobile);

  const denyBiz = await api('POST', '/businesses', {
    token: denyAuth.token,
    body: { name: `No Map Co ${Date.now()}` },
  });
  assert(denyBiz.ok, 'deny business', denyBiz.code || String(denyBiz.status));
  const denyBusinessId = denyBiz.data.id;

  // Trial has export.pdf but not module.map
  const denyGate = await api(
    'POST',
    `/businesses/${denyBusinessId}/gates/module-map`,
    { token: denyAuth.token },
  );
  assert(!denyGate.ok, 'module-map gate should fail');
  assert(denyGate.status === 403, 'module-map status', String(denyGate.status));
  assert(
    denyGate.code === 'ENTITLEMENT_MODULE_REQUIRED',
    'module-map code',
    denyGate.code,
  );
  log('deny gate module.map', denyGate.code);

  const denyTpl = await api('POST', `/businesses/${denyBusinessId}/templates`, {
    token: denyAuth.token,
    body: { name: 'Deny map tpl' },
  });
  assert(denyTpl.ok, 'deny template (core ok)', denyTpl.code);

  const denyDoc = await api('POST', `/businesses/${denyBusinessId}/documents`, {
    token: denyAuth.token,
    body: {
      title: 'Deny map doc',
      templateId: denyTpl.data.id,
    },
  });
  assert(denyDoc.ok, 'deny document create', denyDoc.code);

  const mapBody = buildMapOnlyDocumentBody({
    businessId: denyBusinessId,
    documentId: denyDoc.data.id,
    base: denyDoc.data.body,
  });
  const denyPatch = await api(
    'PATCH',
    `/businesses/${denyBusinessId}/documents/${denyDoc.data.id}`,
    { token: denyAuth.token, body: { body: mapBody } },
  );
  assert(!denyPatch.ok, 'patch map without module should fail');
  assert(denyPatch.status === 403, 'deny patch status', String(denyPatch.status));
  assert(
    denyPatch.code === 'ENTITLEMENT_MODULE_REQUIRED',
    'deny patch code',
    denyPatch.code,
  );
  log('deny document map save', denyPatch.code);

  const denyExport = await api(
    'POST',
    `/businesses/${denyBusinessId}/documents/${denyDoc.data.id}/export/pdf`,
    { token: denyAuth.token },
  );
  // Body has no map (patch failed) — export of core-only body should still work
  assert(
    denyExport.ok,
    'export core-only after denied map patch',
    denyExport.code || String(denyExport.status),
  );
  await pollExport(denyAuth.token, denyBusinessId, denyExport.data.id);
  log('deny path export (core body)', 'completed');

  console.log('\nCorporate sample E2E passed.');
  console.log('See docs/qa/phase-02-corporate-acceptance.md');
}

main().catch((err) => {
  console.error('\nCorporate sample E2E failed:', err.message || err);
  process.exit(1);
});
