import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { ImpactService } from './impact.service';
import { GraphRepository } from '../graph/graph.repository';
import { JobsService } from '../jobs/jobs.service';

@Controller('api/v1/impact')
export class ImpactController {
  constructor(
    private readonly impactService: ImpactService,
    private readonly graph: GraphRepository,
    private readonly jobsService: JobsService,
  ) {}

  @Post('analyze')
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
  createJob(@Body() body: any) {
    if (!body?.title) {
      return { error: 'title is required' };
    }
    return this.jobsService.create(body);
  }

  @Get('search')
  search(@Query('q') q: string) {
    if (!q || q.length < 2) {
      return { error: 'q (query) must be at least 2 characters' };
    }
    const results = this.graph.search(q);
    return { query: q, count: results.length, results };
  }
}
