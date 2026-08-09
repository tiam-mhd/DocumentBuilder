import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  type BusinessCreatedContext,
  type BusinessCreatedHook,
} from '../tenancy/business-created.hook';
import { DesignThemeService } from './design-theme.service';

/** Seeds default design_themes row inside Business-create transaction. */
@Injectable()
export class DesignThemeSeedHook implements BusinessCreatedHook {
  constructor(private readonly themes: DesignThemeService) {}

  async afterBusinessCreated(
    tx: unknown,
    context: BusinessCreatedContext,
  ): Promise<void> {
    await this.themes.seedDefaultInTx(
      tx as Prisma.TransactionClient,
      context.businessId,
    );
  }
}
