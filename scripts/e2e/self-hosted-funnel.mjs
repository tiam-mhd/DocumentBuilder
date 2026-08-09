#!/usr/bin/env node
/**
 * P01-T19 — SELF_HOSTED funnel E2E (API)
 *
 * Prerequisites:
 *   - docker:up (Postgres + Redis + Mongo)
 *   - apps/api running with APP_EDITION=SELF_HOSTED, SMS_PROVIDER=fake,
 *     PDF_RENDERER=fake, LICENSE_ISSUER_SECRET empty (opaque VDB-… keys)
 *   - npm run db:seed (plan.core with export.pdf)
 *   - Prefer no active installation_licenses row (or script skips deny/activate)
 *
 * Usage:
 *   npm run test:e2e:self-hosted
 *   API_BASE_URL=http://localhost:3001/api node scripts/e2e/self-hosted-funnel.mjs
 *
 * Optional:
 *   LICENSE_KEY=VDB-DEV-LICENSE-KEY-0001
 */

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);

const EXPORT_PDF = 'export.pdf';
const LICENSE_KEY =
  process.env.LICENSE_KEY ||
  `VDB-E2E-LICENSE-KEY-${Date.now()}`;

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
      `${API_BASE} (${reason}). Start Docker + api with APP_EDITION=SELF_HOSTED (see docs/qa/phase-01-self-hosted-acceptance.md)`,
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
  console.log(`SELF_HOSTED funnel E2E → ${API_BASE}\n`);

  const health = await api('GET', '/health');
  assert(health.ok, 'health', JSON.stringify(health.raw || health.data));
  log('health', health.data?.status ?? 'ok');

  const config = await api('GET', '/system/config');
  assert(config.ok, 'system config');
  assert(
    config.data.edition === 'SELF_HOSTED',
    'edition',
    `expected SELF_HOSTED got ${config.data.edition} — set APP_EDITION=SELF_HOSTED and restart API`,
  );
  assert(
    config.data.publicSignup === false,
    'publicSignup',
    'SELF_HOSTED must not enable publicSignup (SAAS-only)',
  );
  assert(
    config.data.licenseActivation === true,
    'licenseActivation',
    'expected true on SELF_HOSTED',
  );
  assert(
    config.data.platformCheckout === false,
    'platformCheckout',
    'SAAS checkout must be off on SELF_HOSTED',
  );
  log('edition', 'SELF_HOSTED (no publicSignup / no platformCheckout)');

  const licenseBefore = await api('GET', '/system/license');
  assert(licenseBefore.ok, 'license status');
  assert(licenseBefore.data.required === true, 'license required flag');
  const hadActiveLicense = licenseBefore.data.active === true;
  if (hadActiveLicense) {
    console.log(
      '⚠ installation license already active — skipping deny-without-license + activate (revoke DB row for full gate test)',
    );
  } else {
    log('license', 'inactive (required)');
  }

  // OTP (same identity path as SAAS — invite UX is product layer; API still OTP)
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

  // Business create is free (no EntitlementGuard) — needed for gated probes
  const biz = await api('POST', '/businesses', {
    token,
    body: { name: `E2E OnPrem Co ${Date.now()}` },
  });
  assert(biz.ok, 'create business', biz.code || String(biz.status));
  const businessId = biz.data.id;
  log('business', businessId);

  if (!hadActiveLicense) {
    const deny = await api(
      'POST',
      `/businesses/${businessId}/gates/export-pdf`,
      { token },
    );
    assert(!deny.ok, 'export without license should fail');
    assert(deny.status === 402, 'deny status', String(deny.status));
    assert(
      deny.code === 'LICENSE_REQUIRED',
      'deny code',
      deny.code || JSON.stringify(deny.raw),
    );
    log('deny without license', deny.code);

    const denyTpl = await api('POST', `/businesses/${businessId}/templates`, {
      token,
      body: { name: 'should-fail-unlicensed' },
    });
    assert(!denyTpl.ok, 'mutate without license should fail');
    assert(
      denyTpl.code === 'LICENSE_REQUIRED',
      'mutate deny code',
      denyTpl.code,
    );
    log('mutate without license', denyTpl.code);

    const activated = await api('POST', '/system/license/activate', {
      token,
      body: {
        licenseKey: LICENSE_KEY,
        organizationName: 'E2E OnPrem Org',
      },
    });
    assert(
      activated.ok,
      'activate license',
      activated.code || String(activated.status),
    );
    assert(activated.data.active === true, 'license active after activate');
    log('license activated', activated.data.keyHint || 'ok');
  }

  const licenseAfter = await api('GET', '/system/license');
  assert(licenseAfter.ok, 'license status after');
  assert(licenseAfter.data.active === true, 'license must be active');
  assert(
    (await api('GET', '/system/config')).data.licenseActive === true,
    'config.licenseActive',
  );
  log('license', 'active');

  const sub = await api('GET', `/businesses/${businessId}/subscription`, {
    token,
  });
  assert(sub.ok, 'subscription');
  assert(sub.data.writable === true, 'writable after license+trial');
  log('subscription', sub.data.effectiveStatus);

  const ents = await api('GET', `/businesses/${businessId}/entitlements`, {
    token,
  });
  assert(ents.ok, 'entitlements');
  assert(
    Array.isArray(ents.data.codes) && ents.data.codes.includes(EXPORT_PDF),
    'export.pdf',
    'run npm run db:seed',
  );
  log('entitlements', ents.data.codes.join(','));

  const tpl = await api('POST', `/businesses/${businessId}/templates`, {
    token,
    body: { name: 'قالب نصب محلی', description: 'SELF_HOSTED e2e' },
  });
  assert(tpl.ok, 'create template', tpl.code || String(tpl.status));
  log('template', tpl.data.id);

  const doc = await api('POST', `/businesses/${businessId}/documents`, {
    token,
    body: { title: 'سند نصب محلی', templateId: tpl.data.id },
  });
  assert(doc.ok, 'create document', doc.code || String(doc.status));
  const documentId = doc.data.id;
  log('document', documentId);

  if (doc.data.body?.pages?.[0]) {
    const body = doc.data.body;
    body.pages[0].blocks = [
      {
        id: `txt_${Date.now()}`,
        type: 'text',
        props: { content: 'سلام — قیف SELF_HOSTED' },
      },
    ];
    const patched = await api(
      'PATCH',
      `/businesses/${businessId}/documents/${documentId}`,
      { token, body: { body } },
    );
    assert(patched.ok, 'patch document', patched.code || String(patched.status));
  }

  const exportJob = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/export/pdf`,
    { token },
  );
  assert(exportJob.ok, 'export enqueue', exportJob.code || String(exportJob.status));
  const completed = await pollExport(token, businessId, exportJob.data.id);
  log('export', completed.status);

  const pdfRes = await fetch(`${API_BASE}${completed.downloadUrl}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(pdfRes.ok, 'download pdf', String(pdfRes.status));
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  assert(pdfBuf.subarray(0, 5).toString('utf8') === '%PDF-', 'pdf magic');
  log('download pdf', `${pdfBuf.byteLength} bytes`);

  // SAAS checkout must not apply
  const checkout = await api(
    'POST',
    `/businesses/${businessId}/billing/checkout`,
    {
      token,
      body: { planCode: 'plan.core', moduleCodes: [] },
    },
  );
  assert(!checkout.ok, 'checkout should be unavailable');
  assert(
    checkout.code === 'BILLING_CHECKOUT_UNAVAILABLE',
    'checkout code',
    checkout.code || JSON.stringify(checkout.raw),
  );
  log('saas checkout blocked', checkout.code);

  console.log('\nSELF_HOSTED funnel E2E passed.');
}

main().catch((err) => {
  console.error('\nSELF_HOSTED funnel E2E failed:', err.message || err);
  process.exit(1);
});
