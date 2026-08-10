import { Module } from '@nestjs/common';
import { loadFirstPartyPlugins } from '@vdb/plugins';
import { IdentityModule } from '../identity/identity.module';
import { PluginsController } from './plugins.controller';
import { PluginsService } from './plugins.service';

/** Register first-party blocks as early as this module is imported. */
loadFirstPartyPlugins();

@Module({
  imports: [IdentityModule],
  controllers: [PluginsController],
  providers: [PluginsService],
  exports: [PluginsService],
})
export class PluginsModule {}
