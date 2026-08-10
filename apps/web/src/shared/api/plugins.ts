import type {
  PublicPluginList,
  PublicPluginManifest,
} from '@vdb/shared-types';
import { apiFetch } from './client';

export function listPlugins(): Promise<PublicPluginList> {
  return apiFetch<PublicPluginList>('/plugins');
}

export type { PublicPluginManifest };
