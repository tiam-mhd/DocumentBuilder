import type { PluginManifest } from '../manifest';
import { sampleNoticePlugin } from './sample-notice';

/** Allowlisted first-party plugins shipped in the monorepo artifact. */
export const FIRST_PARTY_PLUGINS: readonly PluginManifest[] = [
  sampleNoticePlugin,
];
