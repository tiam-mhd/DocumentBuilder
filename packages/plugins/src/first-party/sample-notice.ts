import type { PluginManifest } from '../manifest';

/** Sample first-party notice/callout block (ADR 030 skeleton). */
export const sampleNoticePlugin: PluginManifest = {
  id: 'vdb.sample-notice',
  version: '1.0.0',
  name: 'Sample notice',
  description:
    'First-party demo plugin — notice/callout block (plugin.notice).',
  moduleCode: null,
  trust: 'first-party',
  blocks: [
    {
      type: 'plugin.notice',
      labelKey: 'notice',
      allowsChildren: false,
      moduleCode: null,
    },
  ],
};
