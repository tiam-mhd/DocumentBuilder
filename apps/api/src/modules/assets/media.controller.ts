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
import type { MediaVariant } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireWritable } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { TenancyService } from '../tenancy/tenancy.service';
import { MediaService } from './media.service';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly tenancy: TenancyService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List media assets for a business' })
  @ApiOkResponse({ description: 'Paginated media list' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.media.list({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 24) || 24,
      q,
    });
    return { data };
  }

  @Post('upload')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
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
  @ApiOperation({ summary: 'Upload image (writable subscription required)' })
  async upload(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    void user;
    const maxBytes = this.config.getOrThrow<number>('MEDIA_MAX_BYTES');
    const data = await this.media.upload({ businessId, file, maxBytes });
    return { data };
  }

  @Get(':assetId')
  @ApiOperation({ summary: 'Get media asset metadata' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('assetId') assetId: string,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const data = await this.media.get(businessId, assetId);
    return { data };
  }

  @Get(':assetId/file')
  @ApiOperation({ summary: 'Stream a media variant (membership required)' })
  async file(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('assetId') assetId: string,
    @Query('variant') variantRaw: string | undefined,
    @Res() res: Response,
  ) {
    await this.tenancy.assertMembership(user.userId, businessId);
    const variant = (variantRaw || 'original') as MediaVariant;
    const allowed: MediaVariant[] = ['original', 'thumb', 'web', 'print'];
    const safe = allowed.includes(variant) ? variant : 'original';
    const file = await this.media.readVariant(businessId, assetId, safe);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.filename)}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(file.body);
  }

  @Delete(':assetId')
  @UseGuards(EntitlementGuard)
  @RequireWritable()
  @ApiOperation({ summary: 'Soft-delete media + remove storage objects' })
  async remove(
    @Param('businessId') businessId: string,
    @Param('assetId') assetId: string,
  ) {
    await this.media.softDelete(businessId, assetId);
    return { data: { ok: true as const } };
  }
}
