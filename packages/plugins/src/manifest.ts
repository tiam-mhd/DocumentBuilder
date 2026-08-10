import { z } from 'zod';
import { PLUGIN_BLOCK_TYPE_RE } from '@vdb/document-schema';

export const PluginTrustSchema = z.literal('first-party');
export type PluginTrust = z.infer<typeof PluginTrustSchema>;

export const PluginBlockManifestSchema = z.object({
  type: z
    .string()
    .min(1)
    .max(64)
    .regex(PLUGIN_BLOCK_TYPE_RE, 'block type must be plugin.*'),
  labelKey: z.string().min(1).max(64),
  allowsChildren: z.boolean(),
  moduleCode: z.string().min(1).max(64).nullable(),
});
export type PluginBlockManifest = z.infer<typeof PluginBlockManifestSchema>;

export const PluginManifestSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(
      /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*)+$/,
      'plugin id must be reverse-dns style (e.g. vdb.sample-notice)',
    ),
  version: z
    .string()
    .min(1)
    .max(32)
    .regex(/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/i, 'semver required'),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable(),
  /** Optional entitlement gate for the whole plugin. */
  moduleCode: z.string().min(1).max(64).nullable(),
  trust: PluginTrustSchema,
  blocks: z.array(PluginBlockManifestSchema).min(1).max(32),
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export function parsePluginManifest(input: unknown): PluginManifest {
  return PluginManifestSchema.parse(input);
}
