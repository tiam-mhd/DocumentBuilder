import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';

@Injectable()
export class MongoService implements OnModuleDestroy {
  private readonly client: MongoClient;
  private connectPromise: Promise<MongoClient> | null = null;

  constructor(config: ConfigService) {
    this.client = new MongoClient(config.getOrThrow<string>('MONGODB_URI'));
  }

  async getDb(): Promise<Db> {
    await this.ensureConnected();
    return this.client.db();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.ensureConnected();
      await this.client.db().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  private ensureConnected(): Promise<MongoClient> {
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect();
    }
    return this.connectPromise;
  }
}
