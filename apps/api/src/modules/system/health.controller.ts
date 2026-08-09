import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('system')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness + soft dependency checks' })
  @ApiOkResponse({ description: 'Health report envelope' })
  async getHealth() {
    const report = await this.health.check();
    return { data: report };
  }
}
