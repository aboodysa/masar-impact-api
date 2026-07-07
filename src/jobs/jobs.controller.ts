import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JobListResponse, JobDetailResponse, JobResultResponse } from './jobs.dto';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('api/v1/impact/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List all async impact analysis jobs' })
  @ApiResponse({ status: 200, type: JobListResponse })
  list() {
    const jobs = this.jobsService.list();
    return { count: jobs.length, jobs };
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get job status and details' })
  @ApiParam({ name: 'jobId', example: 'job-abc123' })
  @ApiResponse({ status: 200, type: JobDetailResponse })
  @ApiResponse({ status: 404, description: 'Job not found' })
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
  @ApiOperation({ summary: 'Get the result of a completed job' })
  @ApiParam({ name: 'jobId', example: 'job-abc123' })
  @ApiResponse({ status: 200, type: JobResultResponse })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getResult(@Param('jobId') jobId: string) {
    const result = this.jobsService.getResult(jobId);
    if (!result) return { error: 'Job not found' };
    return result;
  }
}
