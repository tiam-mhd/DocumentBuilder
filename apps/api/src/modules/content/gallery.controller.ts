import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EntitlementCodes, MembershipPermissionCodes } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireModule, RequirePermission } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { GalleryService } from './gallery.service';

class CreateGalleryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class UpdateGalleryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class CreateGalleryItemDto {
  @IsString()
  @MinLength(1)
  mediaId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class UpdateGalleryItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  mediaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class ReorderGalleryItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  itemIds!: string[];
}

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireModule(EntitlementCodes.ModuleGallery)
@RequirePermission(MembershipPermissionCodes.ManageData)
@Controller('businesses/:businessId/galleries')
export class GalleryController {
  constructor(private readonly galleries: GalleryService) {}

  @Get()
  @ApiOperation({ summary: 'List galleries (module.gallery)' })
  @ApiOkResponse({ description: 'Paginated galleries' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
  ) {
    void user;
    const data = await this.galleries.list({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
      q,
    });
    return { data };
  }

  @Get(':galleryId')
  @ApiOperation({ summary: 'Get gallery with items' })
  async get(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('galleryId') galleryId: string,
  ) {
    void user;
    const data = await this.galleries.get(businessId, galleryId);
    return { data };
  }

  @Post()
  @ApiOperation({ summary: 'Create gallery' })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateGalleryDto,
  ) {
    void user;
    const data = await this.galleries.create({
      businessId,
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder,
    });
    return { data };
  }

  @Patch(':galleryId')
  @ApiOperation({ summary: 'Update gallery' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('galleryId') galleryId: string,
    @Body() body: UpdateGalleryDto,
  ) {
    void user;
    const data = await this.galleries.update({
      businessId,
      galleryId,
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder,
    });
    return { data };
  }

  @Delete(':galleryId')
  @ApiOperation({ summary: 'Soft-delete gallery and items' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('galleryId') galleryId: string,
  ) {
    void user;
    await this.galleries.softDelete(businessId, galleryId);
    return { data: { ok: true as const } };
  }

  @Post(':galleryId/items')
  @ApiOperation({ summary: 'Add media item to gallery' })
  async addItem(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('galleryId') galleryId: string,
    @Body() body: CreateGalleryItemDto,
  ) {
    void user;
    const data = await this.galleries.addItem({
      businessId,
      galleryId,
      mediaId: body.mediaId,
      caption: body.caption,
      sortOrder: body.sortOrder,
    });
    return { data };
  }

  @Patch(':galleryId/items/:itemId')
  @ApiOperation({ summary: 'Update gallery item' })
  async updateItem(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('galleryId') galleryId: string,
    @Param('itemId') itemId: string,
    @Body() body: UpdateGalleryItemDto,
  ) {
    void user;
    const data = await this.galleries.updateItem({
      businessId,
      galleryId,
      itemId,
      mediaId: body.mediaId,
      caption: body.caption,
      sortOrder: body.sortOrder,
    });
    return { data };
  }

  @Delete(':galleryId/items/:itemId')
  @ApiOperation({ summary: 'Soft-delete gallery item' })
  async deleteItem(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('galleryId') galleryId: string,
    @Param('itemId') itemId: string,
  ) {
    void user;
    await this.galleries.softDeleteItem(businessId, galleryId, itemId);
    return { data: { ok: true as const } };
  }

  @Put(':galleryId/items/reorder')
  @ApiOperation({ summary: 'Reorder gallery items' })
  async reorder(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('galleryId') galleryId: string,
    @Body() body: ReorderGalleryItemsDto,
  ) {
    void user;
    const data = await this.galleries.reorderItems({
      businessId,
      galleryId,
      itemIds: body.itemIds,
    });
    return { data };
  }
}
