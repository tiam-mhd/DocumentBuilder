import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const templatePath = path.join(root, 'docs/deploy/runflare.env.example');
const outputPath = path.join(root, '.env.runflare');
const template = await readFile(templatePath, 'utf8');
const secret = () => randomBytes(32).toString('base64url');
const output = template.replaceAll('__GENERATE_SECRET__', () => secret());

try {
  await writeFile(outputPath, output, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error?.code === 'EEXIST') {
    console.error('.env.runflare already exists; it was left unchanged.');
    process.exitCode = 1;
  } else {
    throw error;
  }
}

if (process.exitCode !== 1) {
  console.log(
    'Created .env.runflare with three generated secrets. Fill required __FILL_*__ values; clear PLATFORM_ADMIN_MOBILES if you do not need the SAAS admin console.',
  );
}
