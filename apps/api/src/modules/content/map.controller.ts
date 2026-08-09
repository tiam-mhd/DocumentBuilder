import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EntitlementCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireModule } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { MapService } from './map.service';

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireModule(EntitlementCodes.ModuleMap)
@Controller('businesses/:businessId/map')
export class MapController {
  constructor(private readonly maps: MapService) {}

  @Get('markers')
  @ApiOperation({
    summary: 'List map markers from Locations (module.map)',
  })
  @ApiOkResponse({ description: 'Marker list for Leaflet / PDF static map' })
  async markers(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('source') source?: string,
    @Query('country') country?: string,
  ) {
    void user;
    const data = await this.maps.listMarkers({
      businessId,
      source,
      country,
    });
    return { data };
  }
}
