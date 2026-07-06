import { Controller, Get, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('api/v1/impact/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list() {
    const jobs = this.jobsService.list();
    return { count: jobs.length, jobs };
  }

  @Get(':jobId')
  get(@Param('jobId') jobId: string) {
    const job = this.jobsService.get(jobId);
    if (!job) return { error: 'Job not found' };
    return {
      jobId: job.jobId,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      resultUrl: job.resultUrl,
    };
  }

  @Get(':jobId/result')
  getResult(@Param('jobId') jobId: string) {
    const result = this.jobsService.getResult(jobId);
    if (!result) return { error: 'Job not found' };
    return result;
  }
}
