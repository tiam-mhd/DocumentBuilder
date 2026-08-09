import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { RedisService } from '../../config/redis/redis.service';
import { MongoService } from '../../config/mongo/mongo.service';
import { EditionService } from '../../config/edition/edition.service';

export type DependencyStatus = 'up' | 'down';

export type HealthReport = {
  status: 'ok' | 'degraded';
  edition: string;
  checks: {
    postgres: DependencyStatus;
    redis: DependencyStatus;
    mongo: DependencyStatus;
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mongo: MongoService,
    private readonly edition: EditionService,
  ) {}

  async check(): Promise<HealthReport> {
    const [postgres, redis, mongo] = await Promise.all([
      this.prisma.isHealthy(),
      this.redis.isHealthy(),
      this.mongo.isHealthy(),
    ]);

    const checks = {
      postgres: postgres ? ('up' as const) : ('down' as const),
      redis: redis ? ('up' as const) : ('down' as const),
      mongo: mongo ? ('up' as const) : ('down' as const),
    };

    const allUp = postgres && redis && mongo;

    return {
      status: allUp ? 'ok' : 'degraded',
      edition: this.edition.getEdition(),
      checks,
    };
  }
}
