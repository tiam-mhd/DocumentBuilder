import { Module, forwardRef } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { BillingModule } from '../billing/billing.module';
import { IdentityModule } from '../identity/identity.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { GalleryController } from './gallery.controller';
import { GalleryService } from './gallery.service';
import { GatesProbeController } from './gates-probe.controller';
import { ImportController } from './import.controller';
import { ImportQueueService } from './import-queue.service';
import { ImportService } from './import.service';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { MapController } from './map.controller';
import { MapService } from './map.service';
import { OrgChartController } from './org-chart.controller';
import { OrgChartService } from './org-chart.service';
import { ProfileContentController } from './profile-content.controller';
import { ProfileContentService } from './profile-content.service';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';

/** Content — business entities + map + org chart + timeline + QR + collections + import. */
@Module({
  imports: [
    IdentityModule,
    forwardRef(() => TenancyModule),
    forwardRef(() => BillingModule),
    AssetsModule,
  ],
  controllers: [
    GatesProbeController,
    ProjectController,
    ImportController,
    TeamController,
    ProfileContentController,
    GalleryController,
    LocationController,
    MapController,
    OrgChartController,
    TimelineController,
    QrController,
    CollectionController,
  ],
  providers: [
    LocationService,
    ProjectService,
    TeamService,
    ProfileContentService,
    GalleryService,
    MapService,
    OrgChartService,
    TimelineService,
    QrService,
    CollectionService,
    ImportQueueService,
    ImportService,
  ],
  exports: [
    LocationService,
    ProjectService,
    TeamService,
    ProfileContentService,
    GalleryService,
    MapService,
    OrgChartService,
    TimelineService,
    QrService,
    CollectionService,
    ImportService,
  ],
})
export class ContentModule {}
