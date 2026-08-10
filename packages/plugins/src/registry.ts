import {
  clearPluginBlockRegistry,
  registerPluginBlocks,
} from '@vdb/document-schema';
import { FIRST_PARTY_PLUGINS } from './first-party';
import { parsePluginManifest, type PluginManifest } from './manifest';

let loaded = false;
let cached: PluginManifest[] = [];

/**
 * Load compiled first-party plugins into the document-schema registry.
 * Idempotent. Does not eval or dynamically import user code.
 */
export function loadFirstPartyPlugins(): readonly PluginManifest[] {
  if (loaded) return cached;
  const out: PluginManifest[] = [];
  for (const raw of FIRST_PARTY_PLUGINS) {
    const manifest = parsePluginManifest(raw);
    if (manifest.trust !== 'first-party') {
      throw new Error(`Refusing non first-party plugin: ${manifest.id}`);
    }
    registerPluginBlocks(
      manifest.id,
      manifest.blocks.map((b) => ({
        type: b.type,
        labelKey: b.labelKey,
        allowsChildren: b.allowsChildren,
        moduleCode: b.moduleCode,
      })),
    );
    out.push(manifest);
  }
  cached = out;
  loaded = true;
  return cached;
}

/** Test helper. */
export function resetFirstPartyPluginsForTests(): void {
  clearPluginBlockRegistry();
  loaded = false;
  cached = [];
}

export function listLoadedPlugins(): readonly PluginManifest[] {
  if (!loaded) return loadFirstPartyPlugins();
  return cached;
}
