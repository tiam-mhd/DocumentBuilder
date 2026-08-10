import { Injectable, OnModuleInit } from '@nestjs/common';
import { listLoadedPlugins, loadFirstPartyPlugins } from '@vdb/plugins';
import type {
  PublicPluginList,
  PublicPluginManifest,
} from '@vdb/shared-types';

@Injectable()
export class PluginsService implements OnModuleInit {
  onModuleInit(): void {
    loadFirstPartyPlugins();
  }

  list(): PublicPluginList {
    loadFirstPartyPlugins();
    const items: PublicPluginManifest[] = listLoadedPlugins().map((m) => ({
      id: m.id,
      version: m.version,
      name: m.name,
      description: m.description,
      moduleCode: m.moduleCode,
      trust: m.trust,
      blocks: m.blocks.map((b) => ({
        type: b.type,
        labelKey: b.labelKey,
        allowsChildren: b.allowsChildren,
        moduleCode: b.moduleCode,
      })),
    }));
    return { items };
  }
}
