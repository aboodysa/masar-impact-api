import { Controller, Post, Get, Query, Body, DefaultValuePipe, ParseBoolPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ImpactService } from './impact.service';
import { GraphRepository } from '../graph/graph.repository';
import { JobsService } from '../jobs/jobs.service';
import { JobsQueueService } from '../jobs/jobs-queue.service';
import { ImpactAnalyzeRequest, ImpactAnalyzeResponse, SearchResponse, CreateJobRequest } from './impact.dto';

@ApiTags('Impact')
@ApiBearerAuth()
@Controller('api/v1/impact')
export class ImpactController {
  constructor(
    private readonly impactService: ImpactService,
    private readonly graph: GraphRepository,
    private readonly jobsService: JobsService,
    private readonly jobsQueue: JobsQueueService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze impact of a change request on services, screens, and integrations' })
  @ApiQuery({ name: 'ai', required: false, type: Boolean, description: 'Use AI-powered analysis (slower but smarter)' })
  @ApiBody({ type: ImpactAnalyzeRequest })
  @ApiResponse({ status: 201, type: ImpactAnalyzeResponse })
  @ApiResponse({ status: 400, description: 'changeRequest.title is required' })
  async analyze(
    @Body() body: any,
    @Query('ai', new DefaultValuePipe(false), ParseBoolPipe) useAI: boolean,
  ) {
    const changeRequest = body?.changeRequest;
    if (!changeRequest?.title) {
      return { error: 'changeRequest.title is required' };
    }
    const result = useAI
      ? await this.impactService.analyzeWithAI(changeRequest)
      : this.impactService.analyze(changeRequest);
    return {
      requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
      ai: useAI,
      status: 'completed',
      timestamp: new Date().toISOString(),
      ...result,
    };
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create a new async impact analysis job with Redis queue, WebSocket updates, and optional webhook' })
  @ApiBody({ type: CreateJobRequest })
  @ApiQuery({ name: 'ai', required: false, type: Boolean, description: 'Use AI-powered analysis' })
  @ApiQuery({ name: 'webhook_url', required: false, type: String, description: 'URL to call when analysis completes' })
  @ApiResponse({ status: 201, description: 'Job created with jobId for WebSocket subscription' })
  @ApiResponse({ status: 400, description: 'title is required' })
  async createJob(
    @Body() body: any,
    @Query('ai', new DefaultValuePipe(false), ParseBoolPipe) useAI: boolean,
    @Query('webhook_url') webhookUrl?: string,
  ) {
    if (!body?.title) {
      return { error: 'title is required' };
    }
    const { jobId } = await this.jobsQueue.enqueue({
      title: body.title,
      description: body.description,
      targetService: body.targetService,
      ai: useAI,
      webhookUrl,
    });
    return {
      jobId,
      status: 'queued',
      ws: `/ws/jobs?jobId=${jobId}`,
      resultUrl: `/api/v1/impact/jobs/${jobId}/result`,
      ai: useAI,
    };
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
