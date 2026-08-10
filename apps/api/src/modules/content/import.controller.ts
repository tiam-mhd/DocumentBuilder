import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import { memoryStorage } from 'multer';
import { EntitlementCodes, type ImportColumnMapping, MembershipPermissionCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireModule, RequirePermission } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { ImportService } from './import.service';

class SetImportMappingDto {
  @IsObject()
  mapping!: ImportColumnMapping;
}

@ApiTags('imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireModule(EntitlementCodes.ModuleProjects)
@RequirePermission(MembershipPermissionCodes.ManageData)
@Controller('businesses/:businessId/imports')
export class ImportController {
  constructor(
    private readonly imports: ImportService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post('projects/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Upload CSV/XLSX for Projects import (module.projects)',
  })
  @ApiOkResponse({ description: 'Import job (uploaded)' })
  async uploadProjects(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.imports.uploadProjects({
      businessId,
      userId: user.userId,
      file,
    });
    return { data };
  }

  @Get(':importId')
  @ApiOperation({ summary: 'Get import job status / preview / result' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('importId') importId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.imports.get(businessId, importId);
    return { data };
  }

  @Patch(':importId/mapping')
  @ApiOperation({ summary: 'Set column mapping and refresh preview' })
  async setMapping(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('importId') importId: string,
    @Body() body: SetImportMappingDto,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.imports.setMapping({
      businessId,
      importId,
      mapping: body.mapping,
    });
    return { data };
  }

  @Post(':importId/commit')
  @ApiOperation({
    summary:
      'Commit import (sync if small; queue import.content if large)',
  })
  async commit(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('importId') importId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.imports.commit({ businessId, importId });
    return { data };
  }
}
