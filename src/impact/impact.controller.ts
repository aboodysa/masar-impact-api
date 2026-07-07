import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ImpactService } from './impact.service';
import { GraphRepository } from '../graph/graph.repository';
import { JobsService } from '../jobs/jobs.service';
import { ImpactAnalyzeRequest, ImpactAnalyzeResponse, SearchResponse, CreateJobRequest } from './impact.dto';

@ApiTags('Impact')
@ApiBearerAuth()
@Controller('api/v1/impact')
export class ImpactController {
  constructor(
    private readonly impactService: ImpactService,
    private readonly graph: GraphRepository,
    private readonly jobsService: JobsService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze impact of a change request on services, screens, and integrations' })
  @ApiBody({ type: ImpactAnalyzeRequest })
  @ApiResponse({ status: 201, type: ImpactAnalyzeResponse })
  @ApiResponse({ status: 400, description: 'changeRequest.title is required' })
  analyze(@Body() body: any) {
    const changeRequest = body?.changeRequest;
    if (!changeRequest?.title) {
      return { error: 'changeRequest.title is required' };
    }
    const result = this.impactService.analyze(changeRequest);
    return {
      requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
      status: 'completed',
      timestamp: new Date().toISOString(),
      ...result,
    };
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create a new async impact analysis job' })
  @ApiBody({ type: CreateJobRequest })
  @ApiResponse({ status: 201, description: 'Job created' })
  @ApiResponse({ status: 400, description: 'title is required' })
  createJob(@Body() body: any) {
    if (!body?.title) {
      return { error: 'title is required' };
    }
    return this.jobsService.create(body);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search across all graph nodes by name or description' })
  @ApiQuery({ name: 'q', required: true, example: 'ترقيات', description: 'Search query (min 2 chars)' })
  @ApiResponse({ status: 200, type: SearchResponse })
  @ApiResponse({ status: 400, description: 'Query too short' })
  search(@Query('q') q: string) {
    if (!q || q.length < 2) {
      return { error: 'q (query) must be at least 2 characters' };
    }
    const results = this.graph.search(q);
    return { query: q, count: results.length, results };
  }
}
