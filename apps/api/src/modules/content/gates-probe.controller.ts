import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EntitlementCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import {
  RequireEntitlement,
  RequireModule,
  RequireWritable,
} from '../billing/decorators/require-entitlement.decorator';

/**
 * Probe mutate routes so EntitlementGuard can be verified before Content/Export land.
 * Replace with real content/export handlers in later tasks — keep the same Guard pattern.
 */
@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@Controller('businesses/:businessId/gates')
export class GatesProbeController {
  @Post('writable')
  @RequireWritable()
  @ApiOperation({ summary: 'Probe: require writable subscription' })
  @ApiOkResponse({ description: 'Allowed' })
  writable(@Param('businessId') businessId: string) {
    return { data: { ok: true as const, gate: 'writable', businessId } };
  }

  @Post('export-pdf')
  @RequireEntitlement(EntitlementCodes.ExportPdf)
  @ApiOperation({ summary: 'Probe: require export.pdf' })
  @ApiOkResponse({ description: 'Allowed' })
  exportPdf(@Param('businessId') businessId: string) {
    return { data: { ok: true as const, gate: 'export.pdf', businessId } };
  }

  @Post('module-map')
  @RequireModule(EntitlementCodes.ModuleMap)
  @ApiOperation({ summary: 'Probe: require module.map' })
  @ApiOkResponse({ description: 'Allowed' })
  moduleMap(@Param('businessId') businessId: string) {
    return { data: { ok: true as const, gate: 'module.map', businessId } };
  }
}
