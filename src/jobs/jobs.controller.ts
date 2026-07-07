import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { paginate } from '../common/dto/api-response.dto';
import { JobListResponse, JobDetailResponse, JobResultResponse } from './jobs.dto';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('api/v1/impact/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List all async impact analysis jobs' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page (max 100)' })
  @ApiResponse({ status: 200, type: JobListResponse })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    const jobs = this.jobsService.list();
    const { data, meta } = paginate(jobs, page, limit);
    return { ...meta, jobs: data };
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
