import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsQueueService } from './jobs-queue.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobsQueueService],
  exports: [JobsService, JobsQueueService],
})
export class JobsModule {}
