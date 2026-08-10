import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EntitlementCodes, MembershipPermissionCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireEntitlement,
  RequireModule,
  RequireWritable, RequirePermission } from '../billing/decorators/require-entitlement.decorator';

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
  @RequirePermission(MembershipPermissionCodes.ManageDocuments)
  @ApiOperation({ summary: 'Probe: require writable subscription' })
  @ApiOkResponse({ description: 'Allowed' })
  writable(@Param('businessId') businessId: string) {
    return { data: { ok: true as const, gate: 'writable', businessId } };
  }

  @Post('export-pdf')
  @RequireEntitlement(EntitlementCodes.ExportPdf)
  @RequirePermission(MembershipPermissionCodes.ExportPdf)
  @ApiOperation({ summary: 'Probe: require export.pdf + rbac.export.pdf' })
  @ApiOkResponse({ description: 'Allowed' })
  exportPdf(@Param('businessId') businessId: string) {
    return { data: { ok: true as const, gate: 'export.pdf', businessId } };
  }

  @Post('module-map')
  @RequireModule(EntitlementCodes.ModuleMap)
  @RequirePermission(MembershipPermissionCodes.ManageData)
  @ApiOperation({ summary: 'Probe: require module.map' })
  @ApiOkResponse({ description: 'Allowed' })
  moduleMap(@Param('businessId') businessId: string) {
    return { data: { ok: true as const, gate: 'module.map', businessId } };
  }

  @Post('module-org-chart')
  @RequireModule(EntitlementCodes.ModuleOrgChart)
  @RequirePermission(MembershipPermissionCodes.ManageData)
  @ApiOperation({ summary: 'Probe: require module.org_chart' })
  @ApiOkResponse({ description: 'Allowed' })
  moduleOrgChart(@Param('businessId') businessId: string) {
    return {
      data: { ok: true as const, gate: 'module.org_chart', businessId },
    };
  }

  @Post('module-timeline')
  @RequireModule(EntitlementCodes.ModuleTimeline)
  @RequirePermission(MembershipPermissionCodes.ManageData)
  @ApiOperation({ summary: 'Probe: require module.timeline' })
  @ApiOkResponse({ description: 'Allowed' })
  moduleTimeline(@Param('businessId') businessId: string) {
    return {
      data: { ok: true as const, gate: 'module.timeline', businessId },
    };
  }
}
