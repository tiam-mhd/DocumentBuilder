import { HealthService } from '../src/modules/system/health.service';
import { EditionService } from '../src/config/edition/edition.service';
import { AppEdition } from '@vdb/shared-types';

describe('HealthService', () => {
  it('reports ok when all dependencies are up', async () => {
    const service = new HealthService(
      { isHealthy: async () => true } as never,
      { isHealthy: async () => true } as never,
      { isHealthy: async () => true } as never,
      {
        getEdition: () => AppEdition.Saas,
      } as EditionService,
    );

    const report = await service.check();
    expect(report.status).toBe('ok');
    expect(report.checks).toEqual({
      postgres: 'up',
      redis: 'up',
      mongo: 'up',
    });
    expect(report.edition).toBe(AppEdition.Saas);
  });

  it('reports degraded when a dependency is down', async () => {
    const service = new HealthService(
      { isHealthy: async () => true } as never,
      { isHealthy: async () => false } as never,
      { isHealthy: async () => true } as never,
      {
        getEdition: () => AppEdition.SelfHosted,
      } as EditionService,
    );

    const report = await service.check();
    expect(report.status).toBe('degraded');
    expect(report.checks.redis).toBe('down');
  });
});
