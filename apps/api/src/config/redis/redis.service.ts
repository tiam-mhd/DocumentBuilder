import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    this.client.on('error', () => {
      // Soft dependency — health reports down; avoid unhandled error spam.
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async ensureConnected(): Promise<Redis> {
    if (this.client.status === 'ready') {
      return this.client;
    }
    if (this.client.status === 'connecting' || this.client.status === 'connect') {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onError = (err: Error) => {
          cleanup();
          reject(err);
        };
        const cleanup = () => {
          this.client.off('ready', onReady);
          this.client.off('error', onError);
        };
        this.client.once('ready', onReady);
        this.client.once('error', onError);
      });
      return this.client;
    }
    await this.client.connect();
    return this.client;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.ensureConnected();
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
