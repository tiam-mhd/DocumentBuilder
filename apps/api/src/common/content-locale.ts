import { Prisma } from '@prisma/client';
import {
  normalizeEntityTranslations,
  type EntityTranslations,
} from '@vdb/shared-types';

export function translationsToJson(
  translations: EntityTranslations,
): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

export function parseTranslationsInput(
  raw: unknown,
  allowedFields: readonly string[],
): EntityTranslations {
  return normalizeEntityTranslations(raw, allowedFields);
}
