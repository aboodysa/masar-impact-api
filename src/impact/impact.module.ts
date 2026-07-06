import { Module } from '@nestjs/common';
import { ImpactController } from './impact.controller';
import { ImpactService } from './impact.service';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [ImpactController],
  providers: [ImpactService],
  exports: [ImpactService],
})
export class ImpactModule {}
