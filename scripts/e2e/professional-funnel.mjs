#!/usr/bin/env node
/**
 * P03-T12 — Professional phase E2E (API)
 *
 * Covers Phase 03 exit criteria: document locale i18n, projects import,
 * versioning + approval workflow, backup ZIP, pagination packing, audit list.
 *
 * Prerequisites:
 *   - docker:up (Postgres + Redis + Mongo)
 *   - apps/api running with APP_EDITION=SAAS, SMS_PROVIDER=fake,
 *     PAYMENT_PROVIDER=fake, PDF_RENDERER=fake, NODE_ENV=development
 *   - npm run db:seed (plan.core + module.projects)
 *   - migrations applied (incl. workspace backup/restore)
 *
 * Usage:
 *   npm run test:e2e:professional
 *   API_BASE_URL=http://localhost:3001/api node scripts/e2e/professional-funnel.mjs
 */

import { createRequire } from 'node:module';
import { buildProfessionalDocumentBody } from './fixtures/professional-document-body.mjs';

const require = createRequire(import.meta.url);
/** @type {{ paginateDocumentBody: (body: any, opts?: any) => any }} */
const { paginateDocumentBody } = require('@vdb/document-schema');

const API_BASE = (process.env.API_BASE_URL || 'http://localhost:3001/api').replace(
  /\/$/,
  '',
);

const PLAN_CORE = 'plan.core';
const MODULES = ['module.projects'];

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
      `${API_BASE} (${reason}). Start Docker + npm run api:dev (see docs/qa/phase-03-professional-acceptance.md)`,
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

async function apiMultipart(method, path, { token, formData }) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    fail('API unreachable (multipart)', reason);
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

async function apiBinary(path, { token }) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    fail('API unreachable (binary)', reason);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    fail('binary download', `HTTP ${res.status}`);
  }
  return buf;
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

async function pollUntil(
  label,
  fn,
  { isDone, isFailed, timeoutMs = 90000, intervalMs = 1500 } = {},
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const data = await fn();
    if (isFailed?.(data)) {
      fail(
        `${label} failed`,
        `${data?.errorCode || ''} ${data?.errorMessage || ''}`.trim(),
      );
    }
    if (isDone(data)) return data;
    await sleep(intervalMs);
  }
  fail(`${label} timeout`, `not done in ${timeoutMs}ms`);
}

async function checkoutWithModules(token, businessId, moduleCodes) {
  const checkout = await api('POST', `/businesses/${businessId}/billing/checkout`, {
    token,
    body: { planCode: PLAN_CORE, moduleCodes },
    headers: { 'Idempotency-Key': `p03-e2e-${Date.now()}-${Math.random()}` },
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

async function main() {
  console.log(`Professional phase E2E → ${API_BASE}\n`);

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
  log('edition', 'SAAS');

  const { token, mobile } = await otpLogin();
  log('otp', mobile);

  const biz = await api('POST', '/businesses', {
    token,
    body: { name: `Professional Sample ${Date.now()}` },
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
  assert(ents.data.writable === true, 'writable');
  assert(
    ents.data.codes.includes('module.projects'),
    'module.projects',
    ents.data.codes.join(','),
  );
  log('entitlements', 'writable + module.projects');

  // --- Document content locale (FA columns + EN translations) ---
  const seedProj = await api('POST', `/businesses/${businessId}/projects`, {
    token,
    body: {
      title: 'پروژه پایه',
      description: 'توضیح فارسی',
      status: 'published',
      translations: {
        en: { title: 'Base Project', description: 'English description' },
      },
    },
  });
  assert(seedProj.ok, 'seed project fa/en', seedProj.code || String(seedProj.status));
  log('project i18n', 'fa columns + translations.en');

  // --- Import Excel/CSV ---
  const csv = [
    'title,description,status,title_en',
    'Imported Alpha,Desc A,published,Alpha EN',
    'Imported Beta,Desc B,draft,Beta EN',
    '',
  ].join('\n');
  const form = new FormData();
  form.append(
    'file',
    new Blob([csv], { type: 'text/csv' }),
    'projects-p03.csv',
  );
  const uploaded = await apiMultipart(
    'POST',
    `/businesses/${businessId}/imports/projects/upload`,
    { token, formData: form },
  );
  assert(uploaded.ok, 'import upload', uploaded.code || String(uploaded.status));
  const importId = uploaded.data.id;
  log('import upload', importId);

  const mapped = await api(
    'PATCH',
    `/businesses/${businessId}/imports/${importId}/mapping`,
    {
      token,
      body: {
        mapping: {
          title: 'title',
          description: 'description',
          status: 'status',
          titleEn: 'title_en',
        },
      },
    },
  );
  assert(mapped.ok, 'import mapping', mapped.code || String(mapped.status));

  const committed = await api(
    'POST',
    `/businesses/${businessId}/imports/${importId}/commit`,
    { token, body: {} },
  );
  assert(committed.ok, 'import commit', committed.code || String(committed.status));

  const importJob = await pollUntil(
    'import job',
    async () => {
      const j = await api('GET', `/businesses/${businessId}/imports/${importId}`, {
        token,
      });
      assert(j.ok, 'get import', j.code);
      return j.data;
    },
    {
      isDone: (d) => d.status === 'completed',
      isFailed: (d) => d.status === 'failed',
    },
  );
  assert(
    (importJob.result?.created ?? 0) >= 2,
    'import created rows',
    JSON.stringify(importJob.result),
  );
  log('import commit', `created=${importJob.result.created}`);

  const colFa = await api(
    'GET',
    `/businesses/${businessId}/collections/projects?locale=fa&limit=50`,
    { token },
  );
  assert(colFa.ok, 'collections fa', colFa.code);
  assert(colFa.data.total >= 3, 'projects total >= 3', String(colFa.data.total));

  const colEn = await api(
    'GET',
    `/businesses/${businessId}/collections/projects?locale=en&limit=50`,
    { token },
  );
  assert(colEn.ok, 'collections en', colEn.code);
  const enTitles = (colEn.data.items || []).map((i) => i.title);
  assert(
    enTitles.includes('Base Project') || enTitles.includes('Alpha EN'),
    'localized titles',
    enTitles.join(','),
  );
  log('collections locale', `fa total=${colFa.data.total}; en sample ok`);

  // --- Template + document + heavy body + pagination ---
  const tpl = await api('POST', `/businesses/${businessId}/templates`, {
    token,
    body: { name: 'قالب حرفه‌ای', description: 'P03' },
  });
  assert(tpl.ok, 'create template', tpl.code || String(tpl.status));
  const templateId = tpl.data.id;

  const doc = await api('POST', `/businesses/${businessId}/documents`, {
    token,
    body: {
      title: 'سند پذیرش فاز ۰۳',
      templateId,
      locale: 'fa',
    },
  });
  assert(doc.ok, 'create document', doc.code || String(doc.status));
  const documentId = doc.data.id;
  log('document', documentId);

  const faBody = buildProfessionalDocumentBody({
    businessId,
    documentId,
    templateId,
    title: 'سند پذیرش فاز ۰۳',
    locale: 'fa',
    base: doc.data.body,
    sectionCount: 28,
  });

  const packed = paginateDocumentBody(faBody);
  assert(
    Array.isArray(packed.pages) && packed.pages.length >= 2,
    'paginateDocumentBody multi-page',
    `pages=${packed.pages?.length}`,
  );
  log('pagination', `${packed.pages.length} logical pages`);

  const patched = await api(
    'PATCH',
    `/businesses/${businessId}/documents/${documentId}`,
    { token, body: { body: faBody, locale: 'fa' } },
  );
  assert(patched.ok, 'patch fa body', patched.code || String(patched.status));
  log('document body', 'toc+repeater+bindings+bulk sections+link');

  // Switch document locale to EN
  const enBody = buildProfessionalDocumentBody({
    businessId,
    documentId,
    templateId,
    title: 'Phase 03 acceptance doc',
    locale: 'en',
    base: patched.data.body ?? faBody,
    sectionCount: 12,
  });
  const patchedEn = await api(
    'PATCH',
    `/businesses/${businessId}/documents/${documentId}`,
    { token, body: { body: enBody, locale: 'en', title: 'Phase 03 acceptance doc' } },
  );
  assert(patchedEn.ok, 'patch en locale', patchedEn.code || String(patchedEn.status));
  assert(
    patchedEn.data.locale === 'en' || patchedEn.data.body?.locale === 'en',
    'document locale en',
    JSON.stringify({
      locale: patchedEn.data.locale,
      bodyLocale: patchedEn.data.body?.locale,
    }),
  );
  log('document locale', 'en');

  // Comments
  const comment = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/comments`,
    {
      token,
      body: { body: 'Phase 03 review note', pageId: enBody.pages[0]?.id ?? null },
    },
  );
  assert(comment.ok, 'create comment', comment.code || String(comment.status));
  const resolved = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/comments/${comment.data.id}/resolve`,
    { token, body: {} },
  );
  assert(resolved.ok, 'resolve comment', resolved.code || String(resolved.status));
  log('comments', 'create + resolve');

  // Manual version while draft
  const manualVer = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/versions`,
    { token, body: { note: 'manual checkpoint P03' } },
  );
  assert(manualVer.ok, 'manual version', manualVer.code || String(manualVer.status));
  log('version manual', manualVer.data.id || manualVer.data.versionNumber);

  // PDF denied before approve
  const pdfEarly = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/export/pdf`,
    { token },
  );
  assert(!pdfEarly.ok, 'pdf before approve should fail');
  assert(
    pdfEarly.code === 'DOCUMENT_NOT_APPROVED_FOR_EXPORT',
    'pdf gate code',
    pdfEarly.code,
  );
  log('pdf gate', 'denied on draft');

  // Workflow draft → review → approved → published
  const submitted = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/workflow/submit`,
    { token, body: {} },
  );
  assert(submitted.ok, 'workflow submit', submitted.code || String(submitted.status));
  assert(submitted.data.status === 'review', 'status review', submitted.data.status);

  const approved = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/workflow/approve`,
    { token, body: {} },
  );
  assert(approved.ok, 'workflow approve', approved.code || String(approved.status));
  assert(approved.data.status === 'approved', 'status approved', approved.data.status);
  log('workflow', 'draft→review→approved');

  const pdfJob = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/export/pdf`,
    { token },
  );
  assert(pdfJob.ok, 'enqueue pdf', pdfJob.code || String(pdfJob.status));
  const completedPdf = await pollUntil(
    'export pdf',
    async () => {
      const j = await api(
        'GET',
        `/businesses/${businessId}/exports/${pdfJob.data.id}`,
        { token },
      );
      assert(j.ok, 'poll export', j.code);
      return j.data;
    },
    {
      isDone: (d) => d.status === 'completed',
      isFailed: (d) => d.status === 'failed',
    },
  );
  const pdfBytes = await apiBinary(
    `/businesses/${businessId}/exports/${completedPdf.id}/file`,
    { token },
  );
  assert(pdfBytes.slice(0, 5).toString() === '%PDF-', 'pdf magic');
  log('pdf export', `${pdfBytes.length} bytes`);

  const published = await api(
    'POST',
    `/businesses/${businessId}/documents/${documentId}/workflow/publish`,
    { token, body: {} },
  );
  assert(published.ok, 'workflow publish', published.code || String(published.status));
  assert(
    published.data.status === 'published',
    'status published',
    published.data.status,
  );
  log('workflow', 'published (+ version snapshot)');

  const versions = await api(
    'GET',
    `/businesses/${businessId}/documents/${documentId}/versions`,
    { token },
  );
  assert(versions.ok, 'list versions', versions.code);
  const versionItems = versions.data.items || versions.data;
  assert(
    Array.isArray(versionItems) && versionItems.length >= 2,
    'versions count',
    String(versionItems?.length),
  );
  log('versions', `${versionItems.length} snapshots`);

  const locked = await api(
    'PATCH',
    `/businesses/${businessId}/documents/${documentId}`,
    {
      token,
      body: {
        body: {
          ...enBody,
          title: 'should not overwrite published',
        },
      },
    },
  );
  assert(!locked.ok, 'published body lock');
  assert(
    locked.code === 'DOCUMENT_PUBLISHED_LOCKED',
    'lock code',
    locked.code,
  );
  log('published lock', 'PATCH body rejected');

  // Audit log (OWNER)
  const audit = await api(
    'GET',
    `/businesses/${businessId}/audit-events?pageSize=50`,
    { token },
  );
  assert(audit.ok, 'audit list', audit.code || String(audit.status));
  const actions = (audit.data.items || []).map((e) => e.action);
  assert(
    actions.some((a) => String(a).startsWith('document.workflow.')),
    'audit has workflow',
    actions.slice(0, 8).join(','),
  );
  log('audit', `${audit.data.total} events`);

  // Backup → download ZIP → restore preview → confirmReplace commit
  const backup = await api('POST', `/businesses/${businessId}/backups`, {
    token,
  });
  assert(backup.ok, 'backup enqueue', backup.code || String(backup.status));
  const backupDone = await pollUntil(
    'backup',
    async () => {
      const j = await api(
        'GET',
        `/businesses/${businessId}/backups/${backup.data.id}`,
        { token },
      );
      assert(j.ok, 'poll backup', j.code);
      return j.data;
    },
    {
      isDone: (d) => d.status === 'completed',
      isFailed: (d) => d.status === 'failed',
      timeoutMs: 120000,
    },
  );
  assert(backupDone.manifest?.kind === 'vdb.business-backup', 'backup manifest kind');
  const zipBuf = await apiBinary(
    `/businesses/${businessId}/backups/${backupDone.id}/file`,
    { token },
  );
  assert(zipBuf[0] === 0x50 && zipBuf[1] === 0x4b, 'zip magic PK');
  log('backup', `${zipBuf.length} bytes zip`);

  const restoreForm = new FormData();
  restoreForm.append(
    'file',
    new Blob([zipBuf], { type: 'application/zip' }),
    'workspace-backup.zip',
  );
  const restoreUpload = await apiMultipart(
    'POST',
    `/businesses/${businessId}/restores/upload`,
    { token, formData: restoreForm },
  );
  assert(
    restoreUpload.ok,
    'restore upload',
    restoreUpload.code || String(restoreUpload.status),
  );
  assert(
    restoreUpload.data.status === 'uploaded',
    'restore preview status',
    restoreUpload.data.status,
  );
  assert(
    restoreUpload.data.preview?.formatVersion === 1,
    'restore preview formatVersion',
  );
  log('restore preview', restoreUpload.data.id);

  const restoreCommit = await api(
    'POST',
    `/businesses/${businessId}/restores/${restoreUpload.data.id}/commit`,
    { token, body: { confirmReplace: true } },
  );
  assert(
    restoreCommit.ok,
    'restore commit',
    restoreCommit.code || String(restoreCommit.status),
  );

  const restoreDone = await pollUntil(
    'restore',
    async () => {
      const j = await api(
        'GET',
        `/businesses/${businessId}/restores/${restoreUpload.data.id}`,
        { token },
      );
      assert(j.ok, 'poll restore', j.code);
      return j.data;
    },
    {
      isDone: (d) => d.status === 'completed',
      isFailed: (d) => d.status === 'failed',
      timeoutMs: 180000,
    },
  );
  assert(
    (restoreDone.result?.remappedEntities ?? 0) > 0,
    'restore remapped',
    JSON.stringify(restoreDone.result),
  );
  log(
    'restore complete',
    `remapped=${restoreDone.result.remappedEntities}`,
  );

  console.log('\nProfessional phase E2E passed.');
}

main().catch((err) => {
  if (!process.exitCode) process.exitCode = 1;
  console.error(err instanceof Error ? err.message : err);
});
