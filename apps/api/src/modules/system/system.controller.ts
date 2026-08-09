import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EditionService } from '../../config/edition/edition.service';
import { LicenseService } from '../billing/license/license.service';

@ApiTags('system')
@Controller('system')
export class SystemController {
  constructor(
    private readonly edition: EditionService,
    private readonly licenses: LicenseService,
  ) {}

  @Get('config')
  @ApiOperation({
    summary: 'Public edition/config flags (no secrets)',
  })
  @ApiOkResponse({ description: 'Public system config envelope' })
  async getConfig() {
    const base = this.edition.getPublicConfig();
    const license = await this.licenses.getPublicStatus();
    return {
      data: {
        ...base,
        licenseActive: license.active,
      },
    };
  }
}
