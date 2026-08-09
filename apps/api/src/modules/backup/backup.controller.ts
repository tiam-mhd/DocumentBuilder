import {
  Body,
  Controller,
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
import { IsBoolean, IsOptional } from 'class-validator';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireWritable } from '../billing/decorators/require-entitlement.decorator';
import { TenancyService } from '../tenancy/tenancy.service';
import { BackupService } from './backup.service';

class CommitRestoreDto {
  @IsOptional()
  @IsBoolean()
  confirmReplace?: boolean;
}

@ApiTags('backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@Controller('businesses/:businessId')
export class BackupController {
  constructor(
    private readonly backups: BackupService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post('backups')
  @RequireWritable()
  @ApiOperation({ summary: 'Enqueue workspace ZIP backup (OWNER)' })
  async createBackup(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
  ) {
    await this.tenancy.assertOwner(user.userId, businessId);
    const data = await this.backups.createBackup({
      businessId,
      userId: user.userId,
    });
    return { data };
  }

  @Get('backups')
  @RequireWritable()
  @ApiOperation({ summary: 'List workspace backup jobs (OWNER)' })
  async listBackups(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    await this.tenancy.assertOwner(user.userId, businessId);
    const data = await this.backups.listBackups(
      businessId,
      Number(pageRaw ?? 1) || 1,
      Number(pageSizeRaw ?? 20) || 20,
    );
    return { data };
  }

  @Get('backups/:jobId')
  @RequireWritable()
  @ApiOperation({ summary: 'Get backup job status (OWNER)' })
  async getBackup(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('jobId') jobId: string,
  ) {
    await this.tenancy.assertOwner(user.userId, businessId);
    const data = await this.backups.getBackup(businessId, jobId);
    return { data };
  }

  @Get('backups/:jobId/file')
  @RequireWritable()
  @ApiOperation({ summary: 'Download completed backup ZIP (OWNER)' })
  async downloadBackup(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    await this.tenancy.assertOwner(user.userId, businessId);
    const file = await this.backups.readBackupFile(businessId, jobId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.send(file.body);
  }

  @Post('restores/upload')
  @RequireWritable()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Upload backup ZIP for restore preview (OWNER)',
  })
  async uploadRestore(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    await this.tenancy.assertOwner(user.userId, businessId);
    const data = await this.backups.uploadRestorePackage({
      businessId,
      userId: user.userId,
      filename: file?.originalname ?? 'package.zip',
      mimeType: file?.mimetype ?? 'application/zip',
      buffer: file?.buffer ?? Buffer.alloc(0),
    });
    return { data };
  }

  @Get('restores/:jobId')
  @RequireWritable()
  @ApiOkResponse({ description: 'Restore job + preview' })
  @ApiOperation({ summary: 'Get restore job / preview (OWNER)' })
  async getRestore(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('jobId') jobId: string,
  ) {
    await this.tenancy.assertOwner(user.userId, businessId);
    const data = await this.backups.getRestore(businessId, jobId);
    return { data };
  }

  @Post('restores/:jobId/commit')
  @RequireWritable()
  @ApiOperation({
    summary:
      'Commit restore after preview (OWNER). confirmReplace required if target not empty.',
  })
  async commitRestore(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('jobId') jobId: string,
    @Body() body: CommitRestoreDto,
  ) {
    await this.tenancy.assertOwner(user.userId, businessId);
    const data = await this.backups.commitRestore({
      businessId,
      jobId,
      confirmReplace: Boolean(body.confirmReplace),
    });
    return { data };
  }
}
