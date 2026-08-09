import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EntitlementCodes, ProjectStatus } from '@vdb/shared-types';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { EntitlementGuard } from '../billing/guards/entitlement.guard';
import { RequireModule } from '../billing/decorators/require-entitlement.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import type { RequestUser } from '../identity/auth.types';
import { ProjectService } from './project.service';

class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsIn(Object.values(ProjectStatus))
  status?: string;

  @IsOptional()
  @IsString()
  coverMediaId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;
}

class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsIn(Object.values(ProjectStatus))
  status?: string;

  @IsOptional()
  @IsString()
  coverMediaId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;
}

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireModule(EntitlementCodes.ModuleProjects)
@Controller('businesses/:businessId')
export class ProjectController {
  constructor(private readonly projects: ProjectService) {}

  @Get('project-categories')
  @ApiOperation({ summary: 'List project categories (module.projects)' })
  @ApiOkResponse({ description: 'Paginated categories' })
  async listCategories(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    void user;
    const data = await this.projects.listCategories({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 50) || 50,
    });
    return { data };
  }

  @Post('project-categories')
  @ApiOperation({ summary: 'Create project category' })
  async createCategory(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateCategoryDto,
  ) {
    void user;
    const data = await this.projects.createCategory({
      businessId,
      name: body.name,
      sortOrder: body.sortOrder,
    });
    return { data };
  }

  @Patch('project-categories/:categoryId')
  @ApiOperation({ summary: 'Update project category' })
  async updateCategory(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('categoryId') categoryId: string,
    @Body() body: UpdateCategoryDto,
  ) {
    void user;
    const data = await this.projects.updateCategory({
      businessId,
      categoryId,
      name: body.name,
      sortOrder: body.sortOrder,
    });
    return { data };
  }

  @Delete('project-categories/:categoryId')
  @ApiOperation({ summary: 'Soft-delete project category' })
  async deleteCategory(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('categoryId') categoryId: string,
  ) {
    void user;
    await this.projects.softDeleteCategory(businessId, categoryId);
    return { data: { ok: true as const } };
  }

  @Get('projects')
  @ApiOperation({ summary: 'List projects / portfolio items' })
  async list(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    void user;
    const data = await this.projects.list({
      businessId,
      page: Number(pageRaw ?? 1) || 1,
      pageSize: Number(pageSizeRaw ?? 20) || 20,
      q,
      status,
      categoryId,
    });
    return { data };
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create project' })
  async create(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Body() body: CreateProjectDto,
  ) {
    void user;
    const data = await this.projects.create({
      businessId,
      title: body.title,
      description: body.description,
      categoryId: body.categoryId,
      status: body.status,
      coverMediaId: body.coverMediaId,
      mediaIds: body.mediaIds,
      locationId: body.locationId,
      fields: body.fields,
    });
    return { data };
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get one project' })
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('projectId') projectId: string,
  ) {
    void user;
    const data = await this.projects.get(businessId, projectId);
    return { data };
  }

  @Patch('projects/:projectId')
  @ApiOperation({ summary: 'Update project' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectDto,
  ) {
    void user;
    const data = await this.projects.update({
      businessId,
      projectId,
      title: body.title,
      description: body.description,
      categoryId: body.categoryId,
      status: body.status,
      coverMediaId: body.coverMediaId,
      mediaIds: body.mediaIds,
      locationId: body.locationId,
      fields: body.fields,
    });
    return { data };
  }

  @Delete('projects/:projectId')
  @ApiOperation({ summary: 'Soft-delete project' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('businessId') businessId: string,
    @Param('projectId') projectId: string,
  ) {
    void user;
    await this.projects.softDelete(businessId, projectId);
    return { data: { ok: true as const } };
  }
}
