import { Global, Module } from '@nestjs/common';
import { EditionService } from './edition.service';

@Global()
@Module({
  providers: [EditionService],
  exports: [EditionService],
})
export class EditionModule {}
