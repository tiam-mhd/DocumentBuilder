const response = await fetch('http://127.0.0.1:8080/api/health', {
  signal: AbortSignal.timeout(4_000),
});

if (!response.ok) {
  process.exit(1);
}

const payload = await response.json();
const report = payload?.data;
const dependencies = Object.values(report?.checks ?? {});

if (
  report?.status !== 'ok' ||
  dependencies.length !== 3 ||
  dependencies.some((status) => status !== 'up')
) {
  process.exit(1);
}
