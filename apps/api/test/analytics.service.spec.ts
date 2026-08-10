import {
  AnalyticsDevice,
  AnalyticsEventKind,
  AnalyticsEventSource,
} from '@vdb/shared-types';
import {
  classifyDevice,
  extractCountry,
} from '../src/modules/analytics/analytics-hints';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';

describe('analytics-hints (P04-T06)', () => {
  it('classifies mobile UA', () => {
    expect(
      classifyDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      ),
    ).toBe(AnalyticsDevice.Mobile);
  });

  it('reads CF-IPCountry', () => {
    expect(extractCountry({ 'cf-ipcountry': 'ir' })).toBe('IR');
    expect(extractCountry({ 'cf-ipcountry': 'XX' })).toBeNull();
  });
});

describe('AnalyticsService.track (P04-T06)', () => {
  it('enqueues when enabled and never throws', async () => {
    const enqueue = jest.fn().mockResolvedValue(undefined);
    const startWorker = jest.fn();
    const queue = { enqueue, startWorker };
    const config = {
      get: jest.fn().mockReturnValue(true),
    };
    const prisma = {};
    const service = new AnalyticsService(
      prisma as never,
      queue as never,
      config as never,
    );
    service.track({
      businessId: 'biz',
      documentId: 'doc',
      kind: AnalyticsEventKind.View,
      source: AnalyticsEventSource.WebPublish,
      country: 'IR',
      device: AnalyticsDevice.Desktop,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(enqueue).toHaveBeenCalled();
  });

  it('skips enqueue when ANALYTICS_ENABLED=false', async () => {
    const enqueue = jest.fn();
    const queue = { enqueue, startWorker: jest.fn() };
    const config = { get: jest.fn().mockReturnValue(false) };
    const service = new AnalyticsService(
      {} as never,
      queue as never,
      config as never,
    );
    service.track({
      businessId: 'biz',
      documentId: 'doc',
      kind: AnalyticsEventKind.Download,
      source: AnalyticsEventSource.ExportDownload,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(enqueue).not.toHaveBeenCalled();
  });
});
