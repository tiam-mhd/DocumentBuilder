import { MembershipPermissionCodes } from '@vdb/shared-types';
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
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
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireWritable, RequirePermission } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { FontService } from './font.service';

class UploadFontBodyDto {
  @IsString()
  @MinLength(1)
  family!: string;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(900)
  weight!: number;

  @IsOptional()
  @IsIn(['normal', 'italic'])
  style?: 'normal' | 'italic';
}

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/fonts')
export class FontController {
  constructor(
    private readonly fonts: FontService,
    private readonly tenancy: TenancyService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List font faces for Theme / PDF picker' })
  @ApiOkResponse({ description: 'Paginated font list' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.fonts.list({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
    });
    return { data };
  }

  @Post('upload')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageAssets)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'family', 'weight'],
      properties: {
        file: { type: 'string', format: 'binary' },
        family: { type: 'string' },
        weight: { type: 'integer' },
        style: { type: 'string', enum: ['normal', 'italic'] },
      },
    },
  })
  @ApiOperation({ summary: 'Upload font face (woff2/ttf/otf)' })
  async upload(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadFontBodyDto,
  ) {
    void user;
    const maxBytes = this.config.getOrThrow<number>('FONT_MAX_BYTES');
    const data = await this.fonts.upload({
      businessId,
      file,
      family: body.family,
      weight: body.weight,
      style: body.style ?? 'normal',
      maxBytes,
    });
    return { data };
  }

  @Get(':fontId')
  @ApiOperation({ summary: 'Get font face metadata' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('fontId') fontId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.fonts.get(businessId, fontId);
    return { data };
  }

  @Get(':fontId/file')
  @ApiOperation({
    summary: 'Stream font bytes (membership); workers prefer ObjectStorage key',
  })
  async file(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('fontId') fontId: string,
    @Res() res: Response,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const file = await this.fonts.readFile(businessId, fontId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.filename)}"`,
    );
    res.setHeader('X-VDB-Storage-Key', file.storageKey);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    return res.send(file.body);
  }

  @Delete(':fontId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @RequirePermission(MembershipPermissionCodes.ManageAssets)
  @ApiOperation({ summary: 'Soft-delete font face + remove storage object' })
  async remove(
    @Param('businessId') businessId: string,
    @Param('fontId') fontId: string,
  ) {
    await this.fonts.softDelete(businessId, fontId);
    return { data: { ok: true as const } };
  }
}
