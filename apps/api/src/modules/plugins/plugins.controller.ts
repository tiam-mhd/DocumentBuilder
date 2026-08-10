import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { PluginsService } from './plugins.service';

@ApiTags('plugins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plugins')
export class PluginsController {
  constructor(private readonly plugins: PluginsService) {}

  @Get()
  @ApiOperation({
    summary: 'List first-party plugin manifests (ADR 030)',
  })
  @ApiOkResponse({ description: 'Plugin catalog' })
  list() {
    return { data: this.plugins.list() };
  }
}
